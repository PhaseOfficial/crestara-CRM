<!-- eslint-disable vue/no-v-html -->
<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs
        :items="[
          { label: __('Notifications'), route: { name: 'Notifications' } },
        ]"
      />
    </template>
    <template #right-header>
      <Button
        v-if="notifications.data?.length"
        :tooltip="__('Mark all as read')"
        :label="__('Mark all as read')"
        :iconLeft="MarkAsDoneIcon"
        @click="markAllAsRead"
      />
    </template>
  </LayoutHeader>
  <div class="flex flex-col overflow-hidden text-ink-gray-9 h-full">
    <div
      v-if="notifications.data?.length"
      class="divide-y divide-outline-gray-1 overflow-y-auto text-base"
    >
      <div
        v-for="n in notifications.data"
        :key="n.id || n.comment"
        class="flex cursor-pointer items-start justify-between gap-3 px-3 py-3 hover:bg-surface-gray-2 transition"
        @click="handleNotificationClick(n)"
      >
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <div class="mt-1 flex items-center gap-2 shrink-0">
            <div
              class="size-[6px] rounded-full shrink-0"
              :class="[n.read ? 'bg-transparent' : 'bg-surface-red-7']"
            />
            <WhatsAppIcon v-if="n.type === 'WhatsApp'" class="size-8" />
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
            <UserAvatar v-else-if="n.from_user?.email || n.from_user?.name" :user="n.from_user?.email || n.from_user?.name" size="lg" />
            <div v-else class="size-8 rounded-lg bg-surface-gray-2 flex items-center justify-center shrink-0 border border-outline-gray-1">
              <NotificationsIcon class="size-4.5 text-ink-gray-6" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-sm font-semibold text-ink-gray-9 truncate">
                {{ n.title }}
              </span>
              <Badge
                v-if="n.type"
                :label="n.type"
                :theme="getBadgeTheme(n.type)"
                size="sm"
                variant="subtle"
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

        <button
          class="p-1 text-ink-gray-4 hover:text-ink-gray-8 hover:bg-surface-gray-3 rounded transition shrink-0"
          :title="__('Dismiss')"
          @click.stop="handleDismiss(n.id)"
        >
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 py-16">
      <NotificationsIcon class="h-16 w-16 text-ink-gray-3" />
      <div class="text-lg-medium text-ink-gray-4">
        {{ __('No New Notifications') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import LayoutHeader from '@/components/LayoutHeader.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import MarkAsDoneIcon from '@/components/Icons/MarkAsDoneIcon.vue'
import NotificationsIcon from '@/components/Icons/NotificationsIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { notifications, notificationsStore } from '@/stores/notifications'
import { globalStore } from '@/stores/global'
import { timeAgo, sanitizeHTML } from '@/utils'
import { Breadcrumbs, Badge, Button } from 'frappe-ui'
import { onMounted, onBeforeUnmount, h } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { $socket } = globalStore()
const store = notificationsStore()

function getBadgeTheme(type) {
  switch (type) {
    case 'Alert':
      return 'red'
    case 'Warning':
      return 'amber'
    case 'Action':
      return 'blue'
    case 'Task':
      return 'purple'
    case 'Event':
      return 'green'
    default:
      return 'gray'
  }
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
  }
})

onMounted(() => {
  store.refreshNotifications()
  if ($socket?.on) {
    $socket.on('crm_notification', () => {
      notifications.reload()
    })
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
    return { name: notification.route_name, params }
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
