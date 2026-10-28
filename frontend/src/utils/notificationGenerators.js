/**
 * Crestara CRM - Notification Generators & Storage Utilities
 * Pure helper functions to generate dynamic notifications from business state
 * and manage persistence sets in localStorage.
 */

export const READ_STORAGE_KEY = 'crestara_notifications_read'
export const DISMISSED_STORAGE_KEY = 'crestara_notifications_dismissed'
export const CUSTOM_STORAGE_KEY = 'crestara_custom_notifications'

export function loadStoredSet(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function saveStoredSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)))
  } catch {}
}

export function loadCustomNotifications() {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomNotifications(items) {
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function generateSystemNotifications(
  business,
  readSet = new Set(),
  dismissedSet = new Set(),
) {
  const list = []
  const now = new Date()

  // 1. Overdue Invoices
  const invoices = business?.invoices || []
  invoices.forEach((inv) => {
    const isPastDue = inv.due_date && new Date(inv.due_date) < now
    const isUnpaid =
      inv.status !== 'Paid' && inv.status !== 'Draft' && inv.status !== 'Cancelled'
    if (inv.status === 'Overdue' || (isUnpaid && isPastDue)) {
      const id = `notif-inv-${inv.id || inv.invoice_number}`
      if (dismissedSet.has(id)) return

      const totalFmt = business?.formatCurrency
        ? business.formatCurrency(inv.total)
        : `$${inv.total}`
      list.push({
        id,
        name: id,
        comment: id,
        notification_type_doc: id,
        title: __('Overdue Invoice'),
        subject: __('Invoice {0} for {1} is overdue ({2})', [
          inv.invoice_number || inv.id,
          inv.customer_name || 'Client',
          totalFmt,
        ]),
        notification_text: __(
          'Invoice <strong>{0}</strong> for <strong>{1}</strong> is past due date ({2}).',
          [inv.invoice_number || inv.id, inv.customer_name || 'Client', totalFmt],
        ),
        type: 'Alert',
        badge_bg: 'bg-surface-red-2 dark:bg-surface-red-9/30',
        icon: 'lucide-alert-circle',
        icon_color: 'text-ink-red-8',
        reference_doctype: 'Invoice',
        reference_name: inv.invoice_number || inv.id,
        route_name: 'Invoices',
        route: { name: 'Invoices', query: { invoiceId: inv.id } },
        from_user: { name: 'Billing', full_name: 'Billing System' },
        read: readSet.has(id) ? 1 : 0,
        creation: inv.due_date || inv.created_at || now.toISOString(),
      })
    }
  })

  // 2. Low Stock Inventory Warnings
  const inventory = business?.inventory || []
  inventory.forEach((item) => {
    const threshold = Number(item.low_stock_threshold ?? 5)
    const stock = Number(item.stock ?? item.quantity ?? 0)
    if (stock <= threshold) {
      const id = `notif-stock-${item.id || item.sku || item.name}`
      if (dismissedSet.has(id)) return

      list.push({
        id,
        name: id,
        comment: id,
        notification_type_doc: id,
        title: __('Low Stock Warning'),
        subject:
          stock === 0
            ? __('{0} is completely out of stock', [item.name])
            : __('{0} has only {1} unit(s) remaining in stock', [item.name, stock]),
        notification_text:
          stock === 0
            ? __('Product <strong>{0}</strong> is out of stock.', [item.name])
            : __(
                'Product <strong>{0}</strong> has reached low inventory threshold with only <strong>{1}</strong> unit(s) left.',
                [item.name, stock],
              ),
        type: 'Warning',
        badge_bg: 'bg-surface-amber-2 dark:bg-surface-amber-9/30',
        icon: 'lucide-package-open',
        icon_color: 'text-ink-amber-8',
        reference_doctype: 'Inventory',
        reference_name: item.sku || item.name,
        route_name: 'Inventory',
        route: { name: 'Inventory' },
        from_user: { name: 'Warehouse', full_name: 'Inventory System' },
        read: readSet.has(id) ? 1 : 0,
        creation: item.updated_at || item.created_at || now.toISOString(),
      })
    }
  })

  // 3. Client Change Requests Pending Review
  const changeRequests = business?.changeRequests || []
  changeRequests.forEach((cr) => {
    if (cr.status === 'Pending') {
      const id = `notif-cr-${cr.id}`
      if (dismissedSet.has(id)) return

      list.push({
        id,
        name: id,
        comment: id,
        notification_type_doc: id,
        title: __('Client Change Request'),
        subject: __('{0} requested profile/organization updates awaiting review', [
          cr.customer_name || 'Client',
        ]),
        notification_text: __(
          'Pending profile updates from <strong>{0}</strong> awaiting approval.',
          [cr.customer_name || 'Client'],
        ),
        type: 'Action',
        badge_bg: 'bg-surface-blue-2 dark:bg-surface-blue-9/30',
        icon: 'lucide-user-check',
        icon_color: 'text-ink-blue-8',
        reference_doctype: 'Change Request',
        reference_name: cr.customer_name || cr.id,
        route_name: 'BusinessSettings',
        route: { name: 'BusinessSettings' },
        from_user: {
          name: cr.customer_name || 'Client',
          full_name: cr.customer_name || 'Client Portal',
        },
        read: readSet.has(id) ? 1 : 0,
        creation: cr.created_at || now.toISOString(),
      })
    }
  })

  // 4. Tasks Due or Assigned
  const tasks = business?.tasks || []
  tasks.forEach((task) => {
    if (task.status !== 'Done' && task.status !== 'Canceled') {
      let isDueSoon = false
      if (task.due_date) {
        const d = new Date(task.due_date)
        const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60)
        // Due within 24 hours or past due
        if (diffHours <= 24) isDueSoon = true
      }
      if (isDueSoon || task.priority === 'Urgent') {
        const id = `notif-task-${task.id}`
        if (dismissedSet.has(id)) return

        list.push({
          id,
          name: id,
          comment: id,
          notification_type_doc: id,
          title: task.priority === 'Urgent' ? __('Urgent Task') : __('Task Due Soon'),
          subject: __('Task "{0}" ({1} priority) requires attention', [
            task.title,
            task.priority || 'Medium',
          ]),
          notification_text: __('Task <strong>"{0}"</strong> requires action.', [
            task.title,
          ]),
          type: 'Task',
          badge_bg: 'bg-surface-purple-2 dark:bg-surface-purple-9/30',
          icon: 'lucide-check-circle',
          icon_color: 'text-ink-purple-8',
          reference_doctype: 'CRM Task',
          reference_name: task.title,
          route_name: 'Tasks',
          route: { name: 'Tasks', query: { open: task.id } },
          from_user: {
            name: task.assigned_to || 'Task System',
            full_name: task.assigned_to || 'Task Scheduler',
          },
          read: readSet.has(id) ? 1 : 0,
          creation: task.due_date || task.created_at || now.toISOString(),
        })
      }
    }
  })

  // 5. Custom notifications stored in localStorage
  const custom = loadCustomNotifications()
  custom.forEach((c) => {
    if (dismissedSet.has(c.id)) return
    list.push({
      ...c,
      read: readSet.has(c.id) ? 1 : c.read ? 1 : 0,
    })
  })

  // Sort newest first
  return list.sort(
    (a, b) => new Date(b.creation).getTime() - new Date(a.creation).getTime(),
  )
}
