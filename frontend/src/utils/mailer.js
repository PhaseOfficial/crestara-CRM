import {
  getInvoicePdfBase64,
  getInvoicePdfBase64Async,
  getReceiptPdfBase64,
  getReceiptPdfBase64Async,
  formatAmount,
  getCurrencySign,
} from './pdfGenerator'
import dayjs from 'dayjs'

/**
 * cPanel Mailer Client
 * Connects frontend Vue application to cPanel endpoint `/api/send_email.php`.
 * Handles automated & on-demand dispatch of invoices and receipts with vector PDF attachments,
 * as well as meeting invitations with Google Calendar, Outlook, and Apple .ICS attachments.
 */

/**
 * Builds responsive, email-client-friendly HTML markup for invoice notifications
 */
export function buildInvoiceEmailHtml({ invoice, businessSettings = {}, personalMessage = '' }) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const cur = getCurrencySign(invoice.currency || businessSettings.currency)
  const isPaid = invoice.status === 'Paid' || Number(invoice.balance_due) <= 0

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number || ''}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Commercial Invoice: ${invoice.invoice_number || 'INV'}</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${invoice.client_name || 'Customer'}</strong>,
      </p>

      ${personalMessage ? `
      <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 18px 0; border-radius: 4px; font-size: 14px; color: #334155;">
        ${personalMessage.replace(/\n/g, '<br>')}
      </div>
      ` : `
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Please find attached your official commercial invoice <strong>${invoice.invoice_number}</strong>.
      </p>
      `}

      <!-- Key Details Box -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Issue Date:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${invoice.issue_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Due:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${invoice.due_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Total Invoice Amount:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${cur}${formatAmount(invoice.total_amount)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b;">Balance Due:</td>
          <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: ${isPaid ? '#15803d' : '#b45309'}; text-align: right;">${cur}${formatAmount(invoice.balance_due)}</td>
        </tr>
      </table>

      ${isPaid ? `
      <div style="text-align: center; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 14px; font-weight: 700;">
        ✓ THIS INVOICE IS FULLY SETTLED
      </div>
      ` : businessSettings.bank_name || businessSettings.bank_account_number ? `
      <!-- Wire settlement box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; color: #475569;">
        <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Remittance & Bank Wire Details:</strong>
        ${businessSettings.bank_name ? `<div>Bank: ${businessSettings.bank_name}</div>` : ''}
        ${businessSettings.bank_account_name ? `<div>Account Name: ${businessSettings.bank_account_name}</div>` : ''}
        ${businessSettings.bank_account_number ? `<div>Account / IBAN: ${businessSettings.bank_account_number}</div>` : ''}
        ${businessSettings.swift_bic ? `<div>SWIFT / BIC: ${businessSettings.swift_bic}</div>` : ''}
      </div>
      ` : ''}

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        A publication-grade vector PDF of your invoice is attached to this email for your accounting records.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} ${businessSettings.business_phone ? `• ${businessSettings.business_phone}` : ''} • Powered by Crestara CRM
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends an invoice email with attached vector PDF via cPanel API
 */
export async function sendInvoiceEmail({
  invoice,
  recipientEmail,
  subject,
  personalMessage = '',
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) {
    throw new Error('Recipient email address is required')
  }

  const defaultSubject = subject || `Commercial Invoice ${invoice.invoice_number || ''} from ${businessSettings.business_name || 'Crestara CRM'}`
  const htmlContent = buildInvoiceEmailHtml({ invoice, businessSettings, personalMessage })
  const pdfBase64 = await getInvoicePdfBase64Async(invoice, businessSettings)

  const payload = {
    recipient: recipientEmail,
    subject: defaultSubject,
    html: htmlContent,
    attachments: [
      {
        filename: `${invoice.invoice_number || 'invoice'}.pdf`,
        content_type: 'application/pdf',
        base64_data: pdfBase64,
      },
    ],
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Failed to dispatch email (HTTP ${response.status})`)
  }

  return resJson
}

/**
 * Builds responsive HTML markup for commercial payment receipts
 */
export function buildReceiptEmailHtml({ payment, invoice = {}, businessSettings = {}, personalMessage = '' }) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const cur = getCurrencySign(payment.currency || invoice.currency || businessSettings.currency)
  const receiptNum = payment.receipt_number || 'REC-PAYMENT'
  const clientName = payment.client_name || invoice.client_name || 'Valued Client'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt ${receiptNum}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #064e3b; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #a7f3d0;">Official Payment Receipt: ${receiptNum}</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 20px; border: 1px solid #a7f3d0;">
        ✓ PAYMENT RECEIVED & CONFIRMED
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${clientName}</strong>,
      </p>

      ${personalMessage ? `
      <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 12px 16px; margin: 18px 0; border-radius: 4px; font-size: 14px; color: #334155;">
        ${personalMessage.replace(/\n/g, '<br>')}
      </div>
      ` : `
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Thank you for your payment. We have successfully recorded your transaction. Please find your official commercial receipt attached below.
      </p>
      `}

      <!-- Payment Summary Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Receipt Number:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${receiptNum}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Date:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${payment.payment_date || new Date().toISOString().split('T')[0]}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Method:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${payment.payment_method || 'Bank Wire'}</td>
        </tr>
        ${payment.invoice_number ? `
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Applied to Invoice:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${payment.invoice_number}</td>
        </tr>
        ` : ''}
        ${payment.transaction_ref ? `
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Transaction Ref:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-mono; color: #475569; text-align: right; border-bottom: 1px solid #e2e8f0;">${payment.transaction_ref}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 14px 16px; font-size: 14px; font-weight: 700; color: #064e3b;">Amount Paid:</td>
          <td style="padding: 14px 16px; font-size: 16px; font-weight: 800; color: #047857; text-align: right;">${cur}${formatAmount(payment.amount)}</td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        A publication-grade vector PDF of your official receipt is attached to this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} • Official Remittance Record
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends a commercial payment receipt email with attached vector PDF via cPanel API
 */
export async function sendReceiptEmail({
  payment,
  invoice = {},
  recipientEmail,
  subject,
  personalMessage = '',
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  const targetEmail = recipientEmail || payment.client_email || invoice.client_email
  if (!targetEmail) {
    throw new Error('Recipient email address is required')
  }

  const receiptNum = payment.receipt_number || 'REC-PAYMENT'
  const defaultSubject = subject || `Official Payment Receipt ${receiptNum} - ${businessSettings.business_name || 'Crestara CRM'}`
  const htmlContent = buildReceiptEmailHtml({ payment, invoice, businessSettings, personalMessage })
  const pdfBase64 = await getReceiptPdfBase64Async(payment, invoice, businessSettings)

  const payload = {
    recipient: targetEmail,
    subject: defaultSubject,
    html: htmlContent,
    attachments: [
      {
        filename: `${receiptNum}.pdf`,
        content_type: 'application/pdf',
        base64_data: pdfBase64,
      },
    ],
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Failed to dispatch receipt email (HTTP ${response.status})`)
  }

  return resJson
}

/**
 * Builds responsive HTML markup for automated & manual payment reminders
 */
export function buildPaymentReminderEmailHtml({
  invoice,
  businessSettings = {},
  countdownStage = 'upcoming',
  daysMetric = 0,
  personalMessage = '',
}) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const cur = getCurrencySign(invoice.currency || businessSettings.currency)
  const invNum = invoice.invoice_number || 'INV'
  const clientName = invoice.client_name || 'Valued Client'
  const dueDateStr = invoice.due_date || 'Due upon receipt'

  let badgeColor = '#2563eb'
  let badgeBg = '#eff6ff'
  let badgeBorder = '#bfdbfe'
  let badgeText = `⏰ ${daysMetric} DAYS UNTIL DEADLINE`

  if (countdownStage === 'due_today') {
    badgeColor = '#d97706'
    badgeBg = '#fffbeb'
    badgeBorder = '#fde68a'
    badgeText = '🔔 PAYMENT DEADLINE IS TODAY'
  } else if (countdownStage === 'overdue') {
    badgeColor = '#dc2626'
    badgeBg = '#fef2f2'
    badgeBorder = '#fecaca'
    badgeText = `⏳ GENTLE REMINDER • ${daysMetric} DAY${daysMetric === 1 ? '' : 'S'} PAST DEADLINE`
  }

  const bankHtml = businessSettings.bank_name || businessSettings.bank_account_number
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; color: #475569;">
        <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Remittance & Bank Wire Details:</strong>
        ${businessSettings.bank_name ? `<div>Bank: ${businessSettings.bank_name}</div>` : ''}
        ${businessSettings.bank_account_name ? `<div>Account Name: ${businessSettings.bank_account_name}</div>` : ''}
        ${businessSettings.bank_account_number ? `<div>Account / IBAN: ${businessSettings.bank_account_number}</div>` : ''}
        ${businessSettings.swift_bic ? `<div>SWIFT / BIC: ${businessSettings.swift_bic}</div>` : ''}
      </div>
    `
    : ''

  const formattedMsg = personalMessage
    ? personalMessage.replace(/\n/g, '<br>')
    : `Please review your outstanding balance for invoice <strong>${invNum}</strong> due on <strong>${dueDateStr}</strong>.`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder ${invNum}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Commercial Invoice: ${invNum}</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <!-- Badge -->
      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 20px; border: 1px solid ${badgeBorder};">
        ${badgeText}
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${clientName}</strong>,
      </p>

      <div style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0; background-color: #f8fafc; border-left: 4px solid ${badgeColor}; padding: 12px 16px; border-radius: 4px;">
        ${formattedMsg}
      </div>

      <!-- Financial Summary Box -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Deadline:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${dueDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Total Invoice Amount:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${cur}${formatAmount(invoice.total_amount)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b;">Balance Due:</td>
          <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: #b45309; text-align: right;">${cur}${formatAmount(invoice.balance_due)}</td>
        </tr>
      </table>

      ${bankHtml}

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        A copy of your original commercial invoice is attached as a publication-grade vector PDF for your records.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} ${businessSettings.business_phone ? `• ${businessSettings.business_phone}` : ''} • Powered by Crestara CRM
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends a payment reminder email with optional invoice PDF attachment via cPanel API
 */
export async function sendPaymentReminderEmail({
  invoice,
  recipientEmail,
  subject,
  personalMessage = '',
  countdownStage = 'upcoming',
  daysMetric = 0,
  attachPdf = true,
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) {
    throw new Error('Recipient email address is required')
  }

  const defaultSubject = subject || `Payment Reminder: Invoice ${invoice.invoice_number || ''}`
  const htmlContent = buildPaymentReminderEmailHtml({
    invoice,
    businessSettings,
    countdownStage,
    daysMetric,
    personalMessage,
  })

  const attachments = []
  if (attachPdf) {
    const pdfBase64 = await getInvoicePdfBase64Async(invoice, businessSettings)
    attachments.push({
      filename: `${invoice.invoice_number || 'invoice'}.pdf`,
      content_type: 'application/pdf',
      base64_data: pdfBase64,
    })
  }

  const payload = {
    recipient: recipientEmail,
    subject: defaultSubject,
    html: htmlContent,
    attachments,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Failed to dispatch reminder email (HTTP ${response.status})`)
  }

  return resJson
}

// ============================================================================
// CALENDAR & MEETING INVITATIONS (GOOGLE, OUTLOOK & APPLE .ICS)
// ============================================================================

export function stringToBase64(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64')
  }
  return btoa(unescape(encodeURIComponent(str)))
}

/**
 * Normalizes start and end dates to UTC strings or YYYYMMDD for Google Calendar
 */
export function formatGoogleCalendarDates(event) {
  const isFullDay = Boolean(event.isFullDay || event.all_day)
  if (isFullDay) {
    const fromD = dayjs(event.fromDate || event.starts_on).format('YYYYMMDD')
    const toD = dayjs(event.toDate || event.ends_on || event.fromDate || event.starts_on)
      .add(1, 'day')
      .format('YYYYMMDD')
    return `${fromD}/${toD}`
  }

  const startIso =
    event.fromDate && event.fromTime
      ? `${event.fromDate}T${event.fromTime}:00`
      : event.starts_on || new Date().toISOString()
  const endIso =
    event.toDate && event.toTime
      ? `${event.toDate}T${event.toTime}:00`
      : event.ends_on || startIso

  const s = dayjs(startIso).toDate().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const e = dayjs(endIso).toDate().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return `${s}/${e}`
}

/**
 * Produces 1-click Google Calendar web import URL
 */
export function generateGoogleCalendarUrl(event) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const title = encodeURIComponent(event.title || event.subject || 'Meeting')
  const details = encodeURIComponent(event.description || '')
  const location = encodeURIComponent(event.location || '')
  const dates = formatGoogleCalendarDates(event)
  return `${base}&text=${title}&dates=${dates}&details=${details}&location=${location}`
}

/**
 * Produces 1-click Outlook web import URL
 */
export function generateOutlookCalendarUrl(event) {
  const base = 'https://outlook.live.com/calendar/0/deeplink/compose'
  const subject = encodeURIComponent(event.title || event.subject || 'Meeting')
  const body = encodeURIComponent(event.description || '')
  const location = encodeURIComponent(event.location || '')

  const startIso =
    event.fromDate && event.fromTime
      ? `${event.fromDate}T${event.fromTime}:00`
      : event.starts_on || new Date().toISOString()
  const endIso =
    event.toDate && event.toTime
      ? `${event.toDate}T${event.toTime}:00`
      : event.ends_on || startIso

  const startdt = encodeURIComponent(dayjs(startIso).toISOString())
  const enddt = encodeURIComponent(dayjs(endIso).toISOString())

  return `${base}?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${subject}&body=${body}&location=${location}&startdt=${startdt}&enddt=${enddt}`
}

/**
 * Generates valid RFC 5545 iCalendar (.ics) string for Apple Calendar and Outlook
 */
export function generateIcsContent(event, businessSettings = {}, method = 'REQUEST') {
  const nowUtc = dayjs().toDate().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const isFullDay = Boolean(event.isFullDay || event.all_day)

  let dtStart = ''
  let dtEnd = ''

  if (isFullDay) {
    const fromD = dayjs(event.fromDate || event.starts_on).format('YYYYMMDD')
    const toD = dayjs(event.toDate || event.ends_on || event.fromDate || event.starts_on)
      .add(1, 'day')
      .format('YYYYMMDD')
    dtStart = `;VALUE=DATE:${fromD}`
    dtEnd = `;VALUE=DATE:${toD}`
  } else {
    const startIso =
      event.fromDate && event.fromTime
        ? `${event.fromDate}T${event.fromTime}:00`
        : event.starts_on || new Date().toISOString()
    const endIso =
      event.toDate && event.toTime
        ? `${event.toDate}T${event.toTime}:00`
        : event.ends_on || startIso

    const s = dayjs(startIso).toDate().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const e = dayjs(endIso).toDate().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    dtStart = `:${s}`
    dtEnd = `:${e}`
  }

  const orgName = businessSettings.business_name || 'Crestara CRM'
  const orgEmail = businessSettings.business_email || 'meetings@crestara.com'
  const uid = event.id ? `${event.id}@crestara.com` : `evt-${Date.now()}@crestara.com`
  const summary = (event.title || event.subject || 'Meeting').replace(/\n/g, ' ')
  const description = (event.description || '').replace(/\r?\n/g, '\\n')
  const location = (event.location || '').replace(/\r?\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crestara CRM//Meeting Scheduler//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART${dtStart}`,
    `DTEND${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    `ORGANIZER;CN=${orgName}:mailto:${orgEmail}`,
  ]

  const participants = Array.isArray(event.event_participants) ? event.event_participants : []
  for (const p of participants) {
    if (p.email) {
      const pName = p.full_name || p.label || p.email.split('@')[0]
      lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${pName}:mailto:${p.email}`)
    }
  }

  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Builds responsive HTML invitation email with 1-click Google, Outlook & Apple Calendar buttons
 */
export function buildCalendarInvitationEmailHtml({
  event,
  attendee = {},
  businessSettings = {},
  isUpdate = false,
  personalMessage = '',
}) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const title = event.title || event.subject || 'Meeting'
  const isFullDay = Boolean(event.isFullDay || event.all_day)

  const dateStr = dayjs(event.fromDate || event.starts_on).format('dddd, MMMM D, YYYY')
  const timeStr = isFullDay
    ? 'All Day'
    : `${event.fromTime || dayjs(event.starts_on).format('HH:mm')} - ${event.toTime || dayjs(event.ends_on).format('HH:mm')}`

  const googleUrl = generateGoogleCalendarUrl(event)
  const outlookUrl = generateOutlookCalendarUrl(event)

  const statusBadge = isUpdate ? 'UPDATED SCHEDULE' : 'MEETING INVITATION'
  const statusColor = isUpdate ? '#d97706' : '#2563eb'
  const statusBg = isUpdate ? '#fef3c7' : '#eff6ff'
  const statusBorder = isUpdate ? '#fde68a' : '#bfdbfe'

  const attendeeName = attendee.full_name || attendee.label || attendee.email?.split('@')[0] || 'Guest'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isUpdate ? 'Updated: ' : 'Invitation: '}${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Calendar Scheduling & Meetings</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: ${statusBg}; color: ${statusColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 20px; border: 1px solid ${statusBorder};">
        ${statusBadge}
      </div>

      <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">
        ${title}
      </h2>

      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Hello <strong>${attendeeName}</strong>, you are invited to attend this scheduled event.
      </p>

      ${
        personalMessage
          ? `
      <div style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0; background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px;">
        ${personalMessage.replace(/\n/g, '<br>')}
      </div>
      `
          : ''
      }

      <!-- Event Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 30%;">📅 Date:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">⏰ Time:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${timeStr}</td>
        </tr>
        ${
          event.location
            ? `
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">📍 Location:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${event.location}</td>
        </tr>
        `
            : ''
        }
        ${
          event.description
            ? `
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; vertical-align: top;">📝 Notes:</td>
          <td style="padding: 12px 16px; font-size: 13px; line-height: 1.5; color: #334155;">${event.description}</td>
        </tr>
        `
            : ''
        }
      </table>

      <!-- 1-Click Quick-Add Buttons -->
      <div style="margin: 28px 0; text-align: center;">
        <div style="font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          Add to Your Calendar
        </div>
        <div style="display: inline-flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
          <a href="${googleUrl}" target="_blank" style="display: inline-block; background-color: #1a73e8; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            📅 Add to Google Calendar
          </a>
          <a href="${outlookUrl}" target="_blank" style="display: inline-block; background-color: #0078d4; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            📅 Add to Outlook
          </a>
        </div>
      </div>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b; text-align: center;">
        🍏 <strong>Apple Calendar / Outlook Desktop:</strong> An interactive <strong>invite.ics</strong> calendar file is attached to this email. Opening it will instantly add this event to your calendar.
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} • Powered by Crestara CRM Calendar
    </div>
  </div>
</body>
</html>`
}

/**
 * Builds responsive cancellation email
 */
export function buildCalendarCancellationEmailHtml({
  event,
  attendee = {},
  businessSettings = {},
  personalMessage = '',
}) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const title = event.title || event.subject || 'Meeting'
  const attendeeName = attendee.full_name || attendee.label || attendee.email?.split('@')[0] || 'Guest'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cancelled: ${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 16px;">
      MEETING CANCELLED
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0;">${title}</h2>
    <p style="font-size: 14px; color: #475569;">
      Hello <strong>${attendeeName}</strong>, please note that the scheduled meeting <strong>${title}</strong> has been cancelled.
    </p>
    ${personalMessage ? `<p style="font-size: 14px; color: #334155;"><em>${personalMessage}</em></p>` : ''}
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">An updated calendar cancellation has been sent to remove this event from your calendar.</p>
  </div>
</body>
</html>`
}

/**
 * Dispatches calendar invitation emails with .ics attachments
 */
export async function sendCalendarInvitationEmails({
  event,
  attendees = [],
  businessSettings = {},
  isUpdate = false,
  personalMessage = '',
  endpoint = '/api/send_email.php',
}) {
  const targetList = attendees.length
    ? attendees
    : Array.isArray(event.event_participants)
      ? event.event_participants
      : []

  if (!targetList.length) return []

  const icsString = generateIcsContent(event, businessSettings, 'REQUEST')
  const icsBase64 = stringToBase64(icsString)

  const results = []
  for (const att of targetList) {
    const email = typeof att === 'string' ? att : att?.email
    if (!email) continue

    const subject = `${isUpdate ? 'Updated: ' : 'Invitation: '}${event.title || event.subject || 'Meeting'}`
    const html = buildCalendarInvitationEmailHtml({
      event,
      attendee: typeof att === 'object' ? att : { email },
      businessSettings,
      isUpdate,
      personalMessage,
    })

    const payload = {
      recipient: email,
      subject,
      html,
      attachments: [
        {
          filename: 'invite.ics',
          content_type: 'text/calendar; charset=utf-8; method=REQUEST',
          base64_data: icsBase64,
        },
      ],
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const resJson = await response.json().catch(() => ({}))
      results.push({ email, success: response.ok && resJson.success, error: resJson.error })
    } catch (err) {
      results.push({ email, success: false, error: err.message })
    }
  }

  return results
}

/**
 * Dispatches calendar cancellation emails with .ics cancel method
 */
export async function sendCalendarCancellationEmails({
  event,
  attendees = [],
  businessSettings = {},
  personalMessage = '',
  endpoint = '/api/send_email.php',
}) {
  const targetList = attendees.length
    ? attendees
    : Array.isArray(event.event_participants)
      ? event.event_participants
      : []

  if (!targetList.length) return []

  const icsString = generateIcsContent(event, businessSettings, 'CANCEL')
  const icsBase64 = stringToBase64(icsString)

  const results = []
  for (const att of targetList) {
    const email = typeof att === 'string' ? att : att?.email
    if (!email) continue

    const subject = `Cancelled: ${event.title || event.subject || 'Meeting'}`
    const html = buildCalendarCancellationEmailHtml({
      event,
      attendee: typeof att === 'object' ? att : { email },
      businessSettings,
      personalMessage,
    })

    const payload = {
      recipient: email,
      subject,
      html,
      attachments: [
        {
          filename: 'invite.ics',
          content_type: 'text/calendar; charset=utf-8; method=CANCEL',
          base64_data: icsBase64,
        },
      ],
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const resJson = await response.json().catch(() => ({}))
      results.push({ email, success: response.ok && resJson.success, error: resJson.error })
    } catch (err) {
      results.push({ email, success: false, error: err.message })
    }
  }

  return results
}

/**
 * Sends a test email to verify cPanel SMTP / mailer settings
 */
export async function sendTestEmail({
  recipientEmail,
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) throw new Error('Recipient email is required')

  const bizName = businessSettings.business_name || 'Crestara CRM'
  const payload = {
    recipient: recipientEmail,
    subject: `Test Delivery from ${bizName} (cPanel Mailer)`,
    html: `
      <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">cPanel Mail Delivery Test Succeeded</h2>
        <p style="color: #475569;">Your Crestara CRM email delivery configuration is operational.</p>
        <p style="font-size: 12px; color: #94a3b8;">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Mail test failed (HTTP ${response.status})`)
  }

  return resJson
}
