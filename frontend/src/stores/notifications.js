import { defineStore } from 'pinia'
import { computed, ref, reactive, watch } from 'vue'
import { formatCompactNumber } from '@/utils/numberFormat.js'
import { useBusinessStore } from './business'
import {
  READ_STORAGE_KEY,
  DISMISSED_STORAGE_KEY,
  CUSTOM_STORAGE_KEY,
  loadStoredSet,
  saveStoredSet,
  loadCustomNotifications,
  saveCustomNotifications,
  generateSystemNotifications,
} from '@/utils/notificationGenerators'

export {
  READ_STORAGE_KEY,
  DISMISSED_STORAGE_KEY,
  CUSTOM_STORAGE_KEY,
  loadStoredSet,
  saveStoredSet,
  loadCustomNotifications,
  saveCustomNotifications,
  generateSystemNotifications,
}

export const visible = ref(false)

// Reactive singleton export to preserve existing component contracts
export const notifications = reactive({
  data: [],
  fetched: true,
  loading: false,
  reload: () => {},
  fetch: () => Promise.resolve([]),
})

export const unreadNotificationsCount = computed(() => {
  const count = (notifications.data || []).filter((n) => !n.read).length
  return count ? formatCompactNumber(count) : 0
})

export const notificationsStore = defineStore('crm-notifications', () => {
  const business = useBusinessStore()
  const readSet = ref(loadStoredSet(READ_STORAGE_KEY))
  const dismissedSet = ref(loadStoredSet(DISMISSED_STORAGE_KEY))

  function refreshNotifications() {
    notifications.data = generateSystemNotifications(
      business,
      readSet.value,
      dismissedSet.value,
    )
  }

  // Auto-refresh when business data changes
  watch(
    () => [
      business.invoices,
      business.inventory,
      business.changeRequests,
      business.tasks,
    ],
    () => {
      refreshNotifications()
    },
    { deep: false, immediate: true },
  )

  // Attach reload method to the singleton
  notifications.reload = refreshNotifications
  notifications.fetch = async () => {
    refreshNotifications()
    return notifications.data
  }

  function toggle() {
    visible.value = !visible.value
    if (visible.value) {
      refreshNotifications()
    }
  }

  function markAsRead(id) {
    if (!id) return
    readSet.value.add(id)
    saveStoredSet(READ_STORAGE_KEY, readSet.value)
    const item = notifications.data.find(
      (n) => n.id === id || n.comment === id || n.name === id,
    )
    if (item) {
      item.read = 1
    }
  }

  function markAllAsRead() {
    ;(notifications.data || []).forEach((n) => {
      readSet.value.add(n.id)
      n.read = 1
    })
    saveStoredSet(READ_STORAGE_KEY, readSet.value)
  }

  function mark_doc_as_read(doc) {
    const id =
      typeof doc === 'string' ? doc : doc?.id || doc?.name || doc?.comment
    if (id) {
      markAsRead(id)
    }
  }

  function dismissNotification(id) {
    if (!id) return
    dismissedSet.value.add(id)
    saveStoredSet(DISMISSED_STORAGE_KEY, dismissedSet.value)
    notifications.data = notifications.data.filter(
      (n) => n.id !== id && n.name !== id,
    )
  }

  function addCustomNotification(notif) {
    const custom = loadCustomNotifications()
    const item = {
      id: notif.id || `notif-custom-${Date.now()}`,
      title: notif.title || __('Notification'),
      subject: notif.subject || notif.title || '',
      notification_text: notif.notification_text || notif.subject || '',
      type: notif.type || 'Alert',
      badge_bg: notif.badge_bg || 'bg-surface-gray-2',
      icon: notif.icon || 'lucide-bell',
      icon_color: notif.icon_color || 'text-ink-gray-7',
      from_user: notif.from_user || {
        name: 'System',
        full_name: 'Crestara CRM',
      },
      read: 0,
      creation: notif.creation || new Date().toISOString(),
      route: notif.route || null,
      route_name: notif.route_name || null,
      ...notif,
    }
    custom.unshift(item)
    saveCustomNotifications(custom)
    refreshNotifications()
    return item
  }

  const mark_as_read = {
    loading: ref(false),
    submit: markAllAsRead,
    reload: markAllAsRead,
  }

  return {
    unreadNotificationsCount,
    mark_as_read,
    mark_doc_as_read,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    addCustomNotification,
    refreshNotifications,
    toggle,
  }
})
