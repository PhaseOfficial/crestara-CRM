<template>
  <nav
    class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-base/95 backdrop-blur border-t border-outline-gray-1 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around"
    aria-label="Staff mobile bottom navigation"
  >
    <!-- Top 4 Dynamic Most-Used Tabs -->
    <button
      v-for="item in topNavItems"
      :key="item.key"
      type="button"
      class="relative flex flex-1 flex-col items-center justify-center py-1 px-1 transition-colors min-h-[48px] focus:outline-none"
      :class="isItemActive(item) ? 'text-ink-blue-7 dark:text-ink-blue-3 font-semibold' : 'text-ink-gray-6 dark:text-ink-gray-4 hover:text-ink-gray-9'"
      @click="handleNavigate(item)"
    >
      <!-- Active Top Accent Pill -->
      <span
        v-if="isItemActive(item)"
        class="absolute top-0 w-6 h-0.5 rounded-full bg-surface-blue-6"
      />

      <div class="relative grid place-items-center">
        <span :class="[item.icon, 'size-5 shrink-0']" aria-hidden="true" />
        <!-- Notification / Counter Badge -->
        <span
          v-if="getItemBadge(item)"
          class="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-surface-amber-3 text-ink-amber-9 border border-outline-amber-2 shadow-sm"
        >
          {{ getItemBadge(item) }}
        </span>
      </div>

      <span class="text-[10px] leading-tight mt-1 truncate max-w-[56px]">
        {{ __(item.label) }}
      </span>
    </button>

    <!-- 5th Tab: Always 'More' (Opens Mobile Drawer) -->
    <button
      type="button"
      class="relative flex flex-1 flex-col items-center justify-center py-1 px-1 transition-colors min-h-[48px] focus:outline-none"
      :class="isMoreActive ? 'text-ink-blue-7 dark:text-ink-blue-3 font-semibold' : 'text-ink-gray-6 dark:text-ink-gray-4 hover:text-ink-gray-9'"
      @click="handleOpenMore"
    >
      <span
        v-if="isMoreActive"
        class="absolute top-0 w-6 h-0.5 rounded-full bg-surface-blue-6"
      />
      <div class="relative grid place-items-center">
        <span class="lucide-menu size-5 shrink-0" aria-hidden="true" />
      </div>
      <span class="text-[10px] leading-tight mt-1 truncate max-w-[56px]">
        {{ __('More') }}
      </span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStaffNavFrequency } from '@/composables/navFrequency'
import { mobileSidebarOpened } from '@/composables/settings'

const route = useRoute()
const router = useRouter()
const { topNavItems, recordClick } = useStaffNavFrequency()

function isItemActive(item) {
  if (item.matchPath) {
    return item.matchPath(route.path)
  }
  return route.path.startsWith(item.to)
}

function getItemBadge(item) {
  if (typeof item.badge === 'function') {
    return item.badge()
  }
  return item.badge || 0
}

// If the active page is not among the top 4 items, highlight 'More' so the user knows they are in a secondary view
const isMoreActive = computed(() => {
  if (mobileSidebarOpened.value) return true
  const isAnyTopItemActive = topNavItems.value.some((item) => isItemActive(item))
  return !isAnyTopItemActive
})

function handleNavigate(item) {
  recordClick(item.key)
  if (route.path !== item.to) {
    router.push(item.to)
  }
}

function handleOpenMore() {
  mobileSidebarOpened.value = !mobileSidebarOpened.value
}
</script>
