import { describe, it, expect } from 'vitest'
import {
  parseDayIntervals,
  normalizeDateAtMidnight,
  calculateCountdown,
  isReminderDueToday,
  buildReminderTemplate,
} from '@/utils/reminders'

describe('Payment Reminders Engine (reminders.js)', () => {
  describe('parseDayIntervals', () => {
    it('parses comma-separated string into descending array of positive integers', () => {
      expect(parseDayIntervals('7, 3, 1')).toEqual([7, 3, 1])
      expect(parseDayIntervals(' 14, 7 , 2 , 14 ')).toEqual([14, 7, 2])
      expect(parseDayIntervals('0, -5, abc, 3')).toEqual([5, 3, 0])
    })

    it('handles arrays and invalid inputs gracefully', () => {
      expect(parseDayIntervals([7, 3, 1])).toEqual([7, 3, 1])
      expect(parseDayIntervals(null)).toEqual([])
      expect(parseDayIntervals(undefined)).toEqual([])
      expect(parseDayIntervals('')).toEqual([])
    })
  })

  describe('calculateCountdown', () => {
    const baseInvoice = {
      issue_date: '2026-10-01',
      due_date: '2026-10-15',
      balance_due: 500,
      status: 'Issued',
    }

    it('calculates days until due and days since issue for upcoming invoice', () => {
      const today = new Date('2026-10-08T12:00:00Z')
      const result = calculateCountdown(baseInvoice, today)

      expect(result.daysUntilDue).toBe(7)
      expect(result.daysSinceIssue).toBe(7)
      expect(result.isOverdue).toBe(false)
      expect(result.isDueToday).toBe(false)
      expect(result.stage).toBe('upcoming')
      expect(result.badgeLabel).toBe('Due in 7 days')
      expect(result.badgeTheme).toBe('blue')
    })

    it('identifies due today status', () => {
      const today = new Date('2026-10-15T09:00:00Z')
      const result = calculateCountdown(baseInvoice, today)

      expect(result.daysUntilDue).toBe(0)
      expect(result.isDueToday).toBe(true)
      expect(result.isOverdue).toBe(false)
      expect(result.stage).toBe('due_today')
      expect(result.badgeLabel).toBe('Due Today')
      expect(result.badgeTheme).toBe('amber')
    })

    it('identifies overdue status and calculates days past due', () => {
      const today = new Date('2026-10-18T10:00:00Z')
      const result = calculateCountdown(baseInvoice, today)

      expect(result.daysUntilDue).toBe(-3)
      expect(result.daysPastDue).toBe(3)
      expect(result.isOverdue).toBe(true)
      expect(result.stage).toBe('overdue')
      expect(result.badgeLabel).toBe('3 days overdue')
      expect(result.badgeTheme).toBe('red')
    })

    it('marks fully paid invoices as settled', () => {
      const paidInvoice = { ...baseInvoice, status: 'Paid', balance_due: 0 }
      const today = new Date('2026-10-20T10:00:00Z')
      const result = calculateCountdown(paidInvoice, today)

      expect(result.stage).toBe('settled')
      expect(result.badgeLabel).toBe('Settled')
      expect(result.badgeTheme).toBe('green')
    })
  })

  describe('isReminderDueToday', () => {
    const businessSettings = {
      reminder_enabled: true,
      reminder_days_before: '7, 3, 1',
      reminder_on_due_date: true,
      reminder_overdue_days: '3, 7',
    }

    const testInvoice = {
      id: 'inv-101',
      issue_date: '2026-10-01',
      due_date: '2026-10-15',
      balance_due: 1200,
      status: 'Issued',
      reminders_enabled: true,
    }

    it('triggers when days until due matches default schedule (7 days)', () => {
      const refDate = new Date('2026-10-08T08:00:00Z') // exactly 7 days before Oct 15
      const check = isReminderDueToday(testInvoice, businessSettings, refDate)

      expect(check.shouldSend).toBe(true)
      expect(check.stage).toBe('upcoming')
      expect(check.daysTriggered).toBe(7)
    })

    it('does not trigger on non-scheduled days (e.g. 5 days before)', () => {
      const refDate = new Date('2026-10-10T08:00:00Z') // 5 days before Oct 15
      const check = isReminderDueToday(testInvoice, businessSettings, refDate)

      expect(check.shouldSend).toBe(false)
    })

    it('triggers on due date when enabled', () => {
      const refDate = new Date('2026-10-15T08:00:00Z') // Day 0
      const check = isReminderDueToday(testInvoice, businessSettings, refDate)

      expect(check.shouldSend).toBe(true)
      expect(check.stage).toBe('due_today')
      expect(check.daysTriggered).toBe(0)
    })

    it('triggers gentle overdue reminder at 3 days past due', () => {
      const refDate = new Date('2026-10-18T08:00:00Z') // 3 days after Oct 15
      const check = isReminderDueToday(testInvoice, businessSettings, refDate)

      expect(check.shouldSend).toBe(true)
      expect(check.stage).toBe('overdue')
      expect(check.daysTriggered).toBe(3)
    })

    it('respects per-invoice custom reminder days override', () => {
      const customInvoice = {
        ...testInvoice,
        custom_reminder_days: '5, 2',
      }
      // On day 5 before due: should trigger because of custom override
      const day5 = new Date('2026-10-10T08:00:00Z')
      const check5 = isReminderDueToday(customInvoice, businessSettings, day5)
      expect(check5.shouldSend).toBe(true)
      expect(check5.daysTriggered).toBe(5)

      // On day 7 before due: should NOT trigger because custom days override 7
      const day7 = new Date('2026-10-08T08:00:00Z')
      const check7 = isReminderDueToday(customInvoice, businessSettings, day7)
      expect(check7.shouldSend).toBe(false)
    })

    it('suppresses duplicate sends if reminder was already sent today', () => {
      const alreadySentInvoice = {
        ...testInvoice,
        last_reminder_sent_at: '2026-10-08T09:30:00Z',
      }
      const sameDay = new Date('2026-10-08T14:00:00Z')
      const check = isReminderDueToday(alreadySentInvoice, businessSettings, sameDay)

      expect(check.shouldSend).toBe(false)
      expect(check.reason).toContain('already sent today')
    })

    it('skips paid or cancelled invoices', () => {
      const paidInv = { ...testInvoice, status: 'Paid', balance_due: 0 }
      const check = isReminderDueToday(paidInv, businessSettings, new Date('2026-10-08T08:00:00Z'))
      expect(check.shouldSend).toBe(false)

      const cancelledInv = { ...testInvoice, status: 'Cancelled' }
      const checkCancelled = isReminderDueToday(cancelledInv, businessSettings, new Date('2026-10-08T08:00:00Z'))
      expect(checkCancelled.shouldSend).toBe(false)
    })

    it('skips invoices where reminders_enabled is explicitly false', () => {
      const disabledInv = { ...testInvoice, reminders_enabled: false }
      const check = isReminderDueToday(disabledInv, businessSettings, new Date('2026-10-08T08:00:00Z'))
      expect(check.shouldSend).toBe(false)
    })
  })

  describe('buildReminderTemplate', () => {
    it('creates polite countdown copy for upcoming invoices', () => {
      const inv = {
        invoice_number: 'INV-2026-1050',
        due_date: '2026-11-01',
        issue_date: '2026-10-15',
      }
      const cd = { stage: 'upcoming', daysUntilDue: 4 }
      const tpl = buildReminderTemplate({ invoice: inv, countdown: cd })

      expect(tpl.subject).toContain('due in 4 days')
      expect(tpl.badgeText).toContain('4 DAYS UNTIL DUE DATE')
      expect(tpl.personalMessage).toContain('courteous reminder')
    })

    it('creates gentle, respectful copy for overdue invoices', () => {
      const inv = {
        invoice_number: 'INV-2026-1050',
        due_date: '2026-10-15',
      }
      const cd = { stage: 'overdue', daysPastDue: 3 }
      const tpl = buildReminderTemplate({ invoice: inv, countdown: cd })

      expect(tpl.subject).toContain('Gentle Reminder')
      expect(tpl.badgeText).toContain('GENTLE REMINDER')
      expect(tpl.personalMessage).toContain('We know schedules can get hectic')
    })
  })
})
