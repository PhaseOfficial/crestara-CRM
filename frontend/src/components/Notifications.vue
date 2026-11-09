<!-- eslint-disable vue/no-v-html -->
<template>
  <Dialog
    v-model:open="visible"
    size="2xl"
    bare
  >
    <div
      class="w-full flex flex-col overflow-hidden rounded-2xl border border-outline-gray-2 bg-surface-base shadow-2xl text-ink-gray-9 transition-all max-h-[85vh]"
    >
      <!-- Accessible Title & Description for Screen Readers (Reka UI) -->
      <DialogTitle class="sr-only">{{ __('Notifications') }}</DialogTitle>
      <DialogDescription class="sr-only">
        {{ __('View and manage notifications, alerts, and calendar events') }}
      </DialogDescription>

      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-outline-gray-1 px-5 py-4 bg-surface-base">
        <div class="flex items-center gap-3">
          <div class="size-9 rounded-xl bg-surface-gray-2 flex items-center justify-center border border-outline-gray-2 shrink-0">
            <NotificationsIcon class="size-5 text-ink-gray-7" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-semibold text-ink-gray-9">
                {{ __('Notifications') }}
              </h3>
              <Badge
                v-if="unreadCount > 0"
                :label="unreadCount"
                theme="red"
                variant="subtle"
                size="sm"
              />
            </div>
            <p class="text-xs text-ink-gray-5 mt-0.5">
              {{ __('Stay updated on invoices, tasks, stock alerts, and events') }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button
            v-if="unreadCount > 0 && activeTab !== 'events'"
            :tooltip="__('Mark all as read')"
            :label="__('Mark all as read')"
            :iconLeft="MarkAsDoneIcon"
            variant="ghost"
            class="text-xs hidden sm:inline-flex"
            @click="markAllAsRead"
          />
          <Button
            v-if="unreadCount > 0 && activeTab !== 'events'"
            :tooltip="__('Mark all as read')"
            :icon="MarkAsDoneIcon"
            variant="ghost"
            class="text-xs sm:hidden"
            @click="markAllAsRead"
          />
          <Button
            icon="lucide-x"
            variant="ghost"
            class="size-8 text-ink-gray-5 hover:text-ink-gray-8 rounded-lg"
            @click="closeModal"
          />
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="px-5 pt-3 pb-2.5 border-b border-outline-gray-1 bg-surface-base">
        <TabButtons
          v-model="activeTab"
          :options="tabs"
          class="flex w-full sm:w-auto [&_button]:flex-1 sm:[&_button]:flex-initial"
        />
      </div>

      <!-- Tab Content: All or Unread Notifications -->
      <div v-if="activeTab !== 'events'" class="flex-1 overflow-y-auto min-h-[300px] max-h-[55vh]">
        <div
          v-if="displayedNotifications.length"
          class="divide-y divide-outline-gray-1 text-sm"
        >
          <div
            v-for="n in displayedNotifications"
            :key="n.id || n.comment"
            class="flex cursor-pointer items-start justify-between gap-3.5 px-5 py-3.5 hover:bg-surface-gray-2 group transition"
            @click="handleNotificationClick(n)"
          >
            <!-- Left: Unread indicator & Icon Badge / Avatar -->
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <div class="mt-1 flex items-center gap-2 shrink-0">
                <div
                  class="size-2 rounded-full shrink-0"
                  :class="[n.read ? 'bg-transparent' : 'bg-surface-red-7 ring-2 ring-surface-red-2']"
                />

                <!-- WhatsApp Notification Icon -->
                <WhatsAppIcon v-if="n.type === 'WhatsApp'" class="size-8 shrink-0" />

                <!-- Custom Type Icon Badge -->
                <div
                  v-else-if="n.icon"
                  class="size-8 rounded-lg flex items-center justify-center shrink-0 border border-outline-gray-1"
                  :class="n.badge_bg || 'bg-surface-gray-2'"
                >
                  <component
                    :is="resolveIcon(n.type)"
                    class="size-4.5"
                    :class="n.icon_color || 'text-ink-gray-7'"
                  />
                </div>

                <!-- User Avatar Fallback -->
                <UserAvatar
                  v-else-if="n.from_user?.name || n.from_user?.email"
                  :user="n.from_user?.email || n.from_user?.name"
                  size="lg"
                  class="shrink-0"
                />

                <!-- Generic Notification Icon -->
                <div
                  v-else
                  class="size-8 rounded-lg bg-surface-gray-2 flex items-center justify-center shrink-0 border border-outline-gray-1"
                >
                  <NotificationsIcon class="size-4.5 text-ink-gray-6" />
                </div>
              </div>

              <!-- Center: Text, Badges, and Metadata -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-sm font-semibold text-ink-gray-9 truncate" :class="{ 'font-bold': !n.read }">
                    {{ n.title }}
                  </span>
                  <Badge
                    v-if="n.type"
                    :label="n.type"
                    :theme="getBadgeTheme(n.type)"
                    size="sm"
                    variant="subtle"
                    class="shrink-0"
                  />
                </div>

                <div
                  v-if="n.notification_text"
                  class="text-xs text-ink-gray-7 line-clamp-2 leading-relaxed"
                  v-html="sanitizeHTML(n.notification_text)"
                />
                <div v-else class="text-xs text-ink-gray-7 line-clamp-2 leading-relaxed">
                  {{ n.subject }}
                </div>

                <div class="text-[11px] text-ink-gray-4 mt-1.5 flex items-center gap-2">
                  <span>{{ timeAgo(n.creation) }}</span>
                  <span v-if="n.from_user?.full_name" class="before:content-['•'] before:mr-1">
                    {{ n.from_user.full_name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: Dismiss Action (Hover) -->
            <button
              class="opacity-0 group-hover:opacity-100 p-1.5 text-ink-gray-4 hover:text-ink-gray-8 hover:bg-surface-gray-3 rounded-md transition shrink-0"
              :title="__('Dismiss')"
              @click.stop="handleDismiss(n.id)"
            >
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <EmptyState
          v-else
          name="Notifications"
          title="No New Notifications"
          description="You are completely caught up!"
          :icon="NotificationsIcon"
          width="lg"
          class="py-14"
        />
      </div>

      <!-- Tab Content: Calendar Events -->
      <div v-else-if="activeTab === 'events'" class="flex-1 overflow-y-auto min-h-[300px] max-h-[55vh] p-2">
        <EventNotificationsArea />
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between border-t border-outline-gray-1 px-5 py-3 bg-surface-gray-1 text-xs text-ink-gray-5">
        <span>
          {{ displayedNotifications.length }} {{ activeTab === 'unread' ? __('unread notification(s)') : __('notification(s)') }}
        </span>
        <Button
          variant="subtle"
          size="sm"
          :label="__('Close')"
          @click="closeModal"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import MarkAsDoneIcon from '@/components/Icons/MarkAsDoneIcon.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'
import EventNotificationsArea from '@/components/EventNotificationsArea.vue'
import EmptyState from '@/components/ListViews/EmptyState.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  visible,
  notifications,
  notificationsStore,
  getBadgeTheme,
} from '@/stores/notifications'
import { useEventNotificationAlert } from '@/data/notifications'
import { globalStore } from '@/stores/global'
import { timeAgo, sanitizeHTML } from '@/utils'
import { Dialog, TabButtons, Badge, Button } from 'frappe-ui'
import { DialogTitle, DialogDescription } from 'reka-ui'
import { ref, computed, onMounted, onBeforeUnmount, h } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { $socket } = globalStore()
const store = notificationsStore()
const { handleEventNotification } = useEventNotificationAlert()

const activeTab = ref('all')
const tabs = computed(() => [
  { label: __('All'), value: 'all' },
  {
    label:
      unreadCount.value > 0
        ? `${__('Unread')} (${unreadCount.value})`
        : __('Unread'),
    value: 'unread',
  },
  { label: __('Events'), value: 'events' },
])

const unreadCount = computed(() => {
  return (notifications.data || []).filter((n) => !n.read).length
})

const displayedNotifications = computed(() => {
  const list = notifications.data || []
  if (activeTab.value === 'unread') {
    return list.filter((n) => !n.read)
  }
  return list
})

function closeModal() {
  visible.value = false
}

function resolveIcon(type) {
  return {
    render() {
      switch (type) {
        case 'Alert':
          return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            h('circle', { cx: '12', cy: '12', r: '10' }),
            h('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
            h('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' }),
          ])
        case 'Warning':
          return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            h('path', { d: 'M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z' }),
            h('polyline', { points: '3.29 7 12 12 20.71 7' }),
          ])
        case 'Action':
          return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }),
            h('circle', { cx: '9', cy: '7', r: '4' }),
            h('polyline', { points: '16 11 18 13 22 9' }),
          ])
        case 'Task':
          return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            h('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
            h('polyline', { points: '22 4 12 14.01 9 11.01' }),
          ])
        default:
          return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            h('path', { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }),
            h('path', { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }),
          ])
      }
    },
  }
}

function handleNotificationClick(n) {
  store.markAsRead(n.id || n.comment || n.name)
  visible.value = false
  const targetRoute = getRoute(n)
  if (targetRoute) {
    router.push(targetRoute)
  }
}

function handleDismiss(id) {
  store.dismissNotification(id)
}

function markAllAsRead() {
  store.markAllAsRead()
}

onBeforeUnmount(() => {
  if ($socket?.off) {
    $socket.off('crm_notification')
    $socket.off('event_notification')
  }
})

onMounted(() => {
  store.refreshNotifications()
  if ($socket?.on) {
    $socket.on('crm_notification', () => notifications.reload())
    $socket.on('event_notification', (data) => handleEventNotification(data))
  }
})

function getRoute(notification) {
  if (notification.route) return notification.route
  if (notification.route_name) {
    let params = notification.params || {}
    if (notification.reference_name) {
      if (notification.route_name === 'Deal') params.dealId = notification.reference_name
      else if (notification.route_name === 'Lead') params.leadId = notification.reference_name
    }
    return { name: notification.route_name, params, hash: notification.hash }
  }
  if (notification.reference_doctype === 'Invoice' || notification.type === 'Alert') {
    return { name: 'Invoices' }
  }
  if (notification.reference_doctype === 'Inventory' || notification.type === 'Warning') {
    return { name: 'Inventory' }
  }
  if (notification.reference_doctype === 'CRM Task' || notification.type === 'Task') {
    return { name: 'Tasks' }
  }
  if (notification.reference_doctype === 'Change Request' || notification.type === 'Action') {
    return { name: 'BusinessSettings' }
  }
  return { name: 'Dashboard' }
}
</script>
