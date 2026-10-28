/**
 * Crestara CRM - Payment Reminders Engine
 * Pure logic for day countdowns, reminder schedule matching, and message templating.
 */

/**
 * Parses comma-separated string or array into sorted array of positive integers.
 * e.g. "7, 3, 1" -> [7, 3, 1]
 * @param {string|number[]|null|undefined} input
 * @returns {number[]}
 */
export function parseDayIntervals(input) {
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map((n) => Math.abs(parseInt(n, 10))).filter((n) => !isNaN(n)))).sort((a, b) => b - a)
  }
  if (typeof input !== 'string') return []
  return Array.from(
    new Set(
      input
        .split(',')
        .map((s) => Math.abs(parseInt(s.trim(), 10)))
        .filter((n) => !isNaN(n)),
    ),
  ).sort((a, b) => b - a)
}

/**
 * Extracts YYYY-MM-DD date string safely without UTC skew.
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateString(dateInput) {
  if (!dateInput) return ''
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0]
  }
  const y = dateInput.getFullYear()
  const m = String(dateInput.getMonth() + 1).padStart(2, '0')
  const d = String(dateInput.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Normalizes a date to local midnight without UTC skew.
 * @param {string|Date} dateInput
 * @returns {Date}
 */
export function normalizeDateAtMidnight(dateInput) {
  if (!dateInput) {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0)
  }
  const cleanStr = String(dateInput).split('T')[0]
  const [year, month, day] = cleanStr.split('-').map(Number)
  if (!year || !month || !day) {
    const fallback = new Date(dateInput)
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0)
  }
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * Calculates countdown metrics between issue date, due date, and reference date.
 * @param {Object} invoice
 * @param {string|Date} [referenceDate]
 * @returns {Object}
 */
export function calculateCountdown(invoice, referenceDate = new Date()) {
  const ref = normalizeDateAtMidnight(referenceDate)
  const due = normalizeDateAtMidnight(invoice?.due_date || ref)
  const issue = normalizeDateAtMidnight(invoice?.issue_date || due)

  const msPerDay = 86400000
  // daysUntilDue: positive if due in future, 0 if due today, negative if overdue
  const daysUntilDue = Math.round((due.getTime() - ref.getTime()) / msPerDay)
  const daysSinceIssue = Math.max(0, Math.round((ref.getTime() - issue.getTime()) / msPerDay))
  const isOverdue = daysUntilDue < 0
  const isDueToday = daysUntilDue === 0
  const daysPastDue = isOverdue ? Math.abs(daysUntilDue) : 0

  let badgeLabel = ''
  let badgeTheme = 'blue' // 'blue' | 'amber' | 'red' | 'green'
  let stage = 'upcoming' // 'upcoming' | 'due_today' | 'overdue' | 'settled'

  const isPaid = invoice?.status === 'Paid' || Number(invoice?.balance_due || 0) <= 0
  if (isPaid) {
    stage = 'settled'
    badgeLabel = 'Settled'
    badgeTheme = 'green'
  } else if (isDueToday) {
    stage = 'due_today'
    badgeLabel = 'Due Today'
    badgeTheme = 'amber'
  } else if (isOverdue) {
    stage = 'overdue'
    badgeLabel = `${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue`
    badgeTheme = 'red'
  } else {
    stage = 'upcoming'
    badgeLabel = `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`
    badgeTheme = 'blue'
  }

  return {
    daysUntilDue,
    daysSinceIssue,
    isOverdue,
    isDueToday,
    daysPastDue,
    stage,
    badgeLabel,
    badgeTheme,
  }
}

/**
 * Checks if an invoice is scheduled for an automated reminder today.
 * @param {Object} invoice
 * @param {Object} businessSettings
 * @param {string|Date} [referenceDate]
 * @returns {{ shouldSend: boolean, reason: string, stage?: string, daysTriggered?: number }}
 */
export function isReminderDueToday(invoice, businessSettings = {}, referenceDate = new Date()) {
  if (!invoice) {
    return { shouldSend: false, reason: 'Invalid invoice' }
  }

  // Check if balance is outstanding
  const balance = Number(invoice.balance_due)
  if (invoice.status === 'Paid' || invoice.status === 'Cancelled' || isNaN(balance) || balance <= 0) {
    return { shouldSend: false, reason: 'Invoice is fully paid or cancelled' }
  }

  // Check automated reminder enablements
  const invoiceEnabled = invoice.reminders_enabled !== false
  const globalEnabled = businessSettings.reminder_enabled !== false
  if (!invoiceEnabled || !globalEnabled) {
    return { shouldSend: false, reason: 'Automated reminders disabled' }
  }

  const ref = normalizeDateAtMidnight(referenceDate)
  const refDateStr = formatDateString(ref)

  // Suppress if already sent today
  if (invoice.last_reminder_sent_at) {
    const lastSentStr = formatDateString(invoice.last_reminder_sent_at)
    if (lastSentStr === refDateStr) {
      return { shouldSend: false, reason: 'Reminder already sent today' }
    }
  }

  const countdown = calculateCountdown(invoice, ref)

  // Resolve pre-deadline intervals
  const preDays =
    invoice.custom_reminder_days !== null && invoice.custom_reminder_days !== undefined && invoice.custom_reminder_days !== ''
      ? parseDayIntervals(invoice.custom_reminder_days)
      : parseDayIntervals(businessSettings.reminder_days_before || '7, 3, 1')

  // 1. Pre-deadline trigger
  if (countdown.daysUntilDue > 0 && preDays.includes(countdown.daysUntilDue)) {
    return {
      shouldSend: true,
      reason: `Matches countdown schedule: ${countdown.daysUntilDue} day(s) before due date`,
      stage: 'upcoming',
      daysTriggered: countdown.daysUntilDue,
    }
  }

  // 2. Due today trigger
  const allowDueToday = businessSettings.reminder_on_due_date !== false
  if (countdown.isDueToday && allowDueToday) {
    return {
      shouldSend: true,
      reason: 'Invoice payment deadline is today',
      stage: 'due_today',
      daysTriggered: 0,
    }
  }

  // 3. Post-deadline gentle overdue trigger
  const overdueDays =
    invoice.custom_overdue_days !== null && invoice.custom_overdue_days !== undefined && invoice.custom_overdue_days !== ''
      ? parseDayIntervals(invoice.custom_overdue_days)
      : parseDayIntervals(businessSettings.reminder_overdue_days || '3, 7')

  if (countdown.isOverdue && overdueDays.includes(countdown.daysPastDue)) {
    return {
      shouldSend: true,
      reason: `Matches gentle overdue schedule: ${countdown.daysPastDue} day(s) past deadline`,
      stage: 'overdue',
      daysTriggered: countdown.daysPastDue,
    }
  }

  return {
    shouldSend: false,
    reason: `Today does not match any scheduled reminder interval (Due in ${countdown.daysUntilDue} days)`,
  }
}

/**
 * Builds recommended reminder email subject and message copy.
 * @param {Object} params
 * @param {Object} params.invoice
 * @param {Object} [params.businessSettings]
 * @param {Object} [params.countdown]
 * @returns {{ subject: string, personalMessage: string, badgeText: string }}
 */
export function buildReminderTemplate({ invoice, businessSettings = {}, countdown }) {
  const cd = countdown || calculateCountdown(invoice)
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const invNum = invoice.invoice_number || 'INVOICE'
  const clientName = invoice.client_name || 'Valued Customer'
  const dueDateStr = invoice.due_date || 'the agreed deadline'

  if (cd.stage === 'overdue') {
    return {
      subject: `Gentle Reminder: Invoice ${invNum} from ${bizName}`,
      badgeText: `⏳ GENTLE REMINDER • ${cd.daysPastDue} DAY${cd.daysPastDue === 1 ? '' : 'S'} PAST DEADLINE`,
      personalMessage: `We hope this note finds you well. We know schedules can get hectic, so we wanted to gently follow up on invoice ${invNum}, which had a settlement deadline of ${dueDateStr} (${cd.daysPastDue} day${cd.daysPastDue === 1 ? '' : 's'} ago).\n\nIf payment has already been remitted, please disregard this note with our thanks. Otherwise, we kindly ask you to review the invoice and remittance details below. Please let us know if we can assist with any questions.`,
    }
  }

  if (cd.stage === 'due_today') {
    return {
      subject: `Payment Due Today: Invoice ${invNum} from ${bizName}`,
      badgeText: '🔔 PAYMENT DEADLINE TODAY',
      personalMessage: `This is a friendly reminder that invoice ${invNum} is due for settlement today (${dueDateStr}).\n\nPlease find your invoice details and wire remittance instructions below. If payment has already been initiated, thank you!`,
    }
  }

  // Default: Upcoming countdown reminder
  const daysText = cd.daysUntilDue === 1 ? 'tomorrow' : `in ${cd.daysUntilDue} days`
  return {
    subject: `Friendly Reminder: Invoice ${invNum} is due ${daysText}`,
    badgeText: `⏰ ${cd.daysUntilDue} DAY${cd.daysUntilDue === 1 ? '' : 'S'} UNTIL DUE DATE`,
    personalMessage: `This is a courteous reminder that payment for invoice ${invNum} is due ${daysText} on ${dueDateStr}.\n\nPlease review the attached commercial invoice and remittance instructions below at your earliest convenience. Thank you for your continued partnership.`,
  }
}
