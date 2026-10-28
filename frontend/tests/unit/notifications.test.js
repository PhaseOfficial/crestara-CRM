import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateSystemNotifications,
  loadStoredSet,
  saveStoredSet,
  loadCustomNotifications,
  saveCustomNotifications,
  CUSTOM_STORAGE_KEY,
} from '@/utils/notificationGenerators'

describe('Notifications Generator & Storage Utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates overdue invoice alert when invoice is past due date', () => {
    const mockBusiness = {
      invoices: [
        {
          id: 'inv-101',
          invoice_number: 'INV-2026-101',
          customer_name: 'Acme Corp',
          total: 1500,
          status: 'Overdue',
          due_date: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'inv-102',
          invoice_number: 'INV-2026-102',
          customer_name: 'Beta LLC',
          total: 300,
          status: 'Paid',
          due_date: '2026-01-01T00:00:00.000Z',
        },
      ],
      formatCurrency: (amount) => `$${amount}`,
    }

    const notifs = generateSystemNotifications(mockBusiness)
    const overdue = notifs.filter((n) => n.type === 'Alert')

    expect(overdue).toHaveLength(1)
    expect(overdue[0].id).toBe('notif-inv-inv-101')
    expect(overdue[0].subject).toContain('INV-2026-101')
    expect(overdue[0].subject).toContain('Acme Corp')
  })

  it('generates low stock warning when inventory is below threshold', () => {
    const mockBusiness = {
      inventory: [
        {
          id: 'prod-1',
          name: 'Wireless Keyboard',
          stock: 2,
          low_stock_threshold: 5,
        },
        {
          id: 'prod-2',
          name: 'USB-C Cable',
          stock: 50,
          low_stock_threshold: 10,
        },
      ],
    }

    const notifs = generateSystemNotifications(mockBusiness)
    const stockAlerts = notifs.filter((n) => n.type === 'Warning')

    expect(stockAlerts).toHaveLength(1)
    expect(stockAlerts[0].id).toBe('notif-stock-prod-1')
    expect(stockAlerts[0].subject).toContain('Wireless Keyboard')
    expect(stockAlerts[0].subject).toContain('2 unit(s)')
  })

  it('generates action notification for pending client change requests', () => {
    const mockBusiness = {
      changeRequests: [
        {
          id: 'cr-55',
          customer_name: 'Apex Innovations',
          status: 'Pending',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cr-56',
          customer_name: 'Delta Corp',
          status: 'Approved',
          created_at: new Date().toISOString(),
        },
      ],
    }

    const notifs = generateSystemNotifications(mockBusiness)
    const crAlerts = notifs.filter((n) => n.type === 'Action')

    expect(crAlerts).toHaveLength(1)
    expect(crAlerts[0].id).toBe('notif-cr-cr-55')
    expect(crAlerts[0].subject).toContain('Apex Innovations')
  })

  it('generates task alert for urgent tasks or tasks due within 24 hours', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const mockBusiness = {
      tasks: [
        {
          id: 't-1',
          title: 'Submit Compliance Audit',
          status: 'In Progress',
          priority: 'Urgent',
          due_date: nextWeek,
        },
        {
          id: 't-2',
          title: 'Overdue Follow-up',
          status: 'Todo',
          priority: 'Medium',
          due_date: yesterday,
        },
        {
          id: 't-3',
          title: 'Finished Task',
          status: 'Done',
          priority: 'Urgent',
          due_date: yesterday,
        },
      ],
    }

    const notifs = generateSystemNotifications(mockBusiness)
    const taskAlerts = notifs.filter((n) => n.type === 'Task')

    expect(taskAlerts).toHaveLength(2)
    expect(taskAlerts.some((t) => t.id === 'notif-task-t-1')).toBe(true)
    expect(taskAlerts.some((t) => t.id === 'notif-task-t-2')).toBe(true)
    expect(taskAlerts.some((t) => t.id === 'notif-task-t-3')).toBe(false)
  })

  it('respects readSet and dismissedSet', () => {
    const mockBusiness = {
      invoices: [
        {
          id: 'inv-1',
          invoice_number: 'INV-1',
          status: 'Overdue',
          due_date: '2026-01-01',
        },
        {
          id: 'inv-2',
          invoice_number: 'INV-2',
          status: 'Overdue',
          due_date: '2026-01-01',
        },
      ],
    }

    const readSet = new Set(['notif-inv-inv-1'])
    const dismissedSet = new Set(['notif-inv-inv-2'])

    const notifs = generateSystemNotifications(mockBusiness, readSet, dismissedSet)

    expect(notifs).toHaveLength(1)
    expect(notifs[0].id).toBe('notif-inv-inv-1')
    expect(notifs[0].read).toBe(1)
  })

  it('loads and saves stored sets in localStorage', () => {
    const set = new Set(['item-1', 'item-2'])
    saveStoredSet('test_set_key', set)

    const loaded = loadStoredSet('test_set_key')
    expect(loaded.has('item-1')).toBe(true)
    expect(loaded.has('item-2')).toBe(true)
    expect(loaded.size).toBe(2)
  })

  it('loads and saves custom notifications in localStorage', () => {
    const customList = [
      { id: 'custom-1', title: 'Payment Reminder', type: 'Alert' },
    ]
    saveCustomNotifications(customList)

    const loaded = loadCustomNotifications()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].title).toBe('Payment Reminder')
  })
})
