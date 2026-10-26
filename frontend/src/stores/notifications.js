import { defineStore } from 'pinia'
import { computed, ref, reactive } from 'vue'
import { formatCompactNumber } from '@/utils/numberFormat.js'

export const visible = ref(false)

export const notifications = reactive({
  data: [
    {
      id: 'notif-1',
      name: 'notif-1',
      title: 'Overdue Invoice Alert',
      subject: 'Invoice INV-2026-003 is overdue ($1,250.00)',
      from_user: 'System',
      read: 0,
      creation: new Date().toISOString(),
      type: 'Alert',
      route: '/invoices/inv-003',
    },
    {
      id: 'notif-2',
      name: 'notif-2',
      title: 'Low Stock Warning',
      subject: 'Dell UltraSharp 27" Monitor has 3 units left in stock',
      from_user: 'Inventory System',
      read: 0,
      creation: new Date().toISOString(),
      type: 'Warning',
      route: '/inventory',
    },
    {
      id: 'notif-3',
      name: 'notif-3',
      title: 'Client Change Request',
      subject: 'Acme Global Corp requested updates to office address and phone',
      from_user: 'Client Portal',
      read: 0,
      creation: new Date().toISOString(),
      type: 'Action',
      route: '/business-settings',
    },
  ],
  fetched: true,
  loading: false,
  reload: () => {},
  fetch: () => Promise.resolve([]),
})

export const unreadNotificationsCount = computed(() => {
  const count = notifications.data?.filter((n) => !n.read).length || 0
  return count ? formatCompactNumber(count) : 0
})

export const notificationsStore = defineStore('crm-notifications', () => {
  const mark_as_read = {
    submit: () => {},
    loading: ref(false),
  }

  function toggle() {
    visible.value = !visible.value
  }

  function mark_doc_as_read(doc) {
    toggle()
  }

  return {
    unreadNotificationsCount,
    mark_as_read,
    mark_doc_as_read,
    toggle,
  }
})
