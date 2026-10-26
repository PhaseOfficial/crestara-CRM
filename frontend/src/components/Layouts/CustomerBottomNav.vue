<template>
  <nav
    class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-base/95 backdrop-blur border-t border-outline-gray-1 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around"
    aria-label="Client portal mobile bottom navigation"
  >
    <button
      v-for="item in rankedNavItems"
      :key="item.key"
      type="button"
      class="relative flex flex-1 flex-col items-center justify-center py-1 px-1 transition-colors min-h-[48px] focus:outline-none"
      :class="isItemActive(item) ? 'text-ink-blue-7 dark:text-ink-blue-3 font-semibold' : 'text-ink-gray-5 hover:text-ink-gray-8'"
      @click="handleNavigate(item)"
    >
      <!-- Active Top Accent Pill -->
      <span
        v-if="isItemActive(item)"
        class="absolute top-0 w-6 h-0.5 rounded-full bg-surface-blue-6"
      />

      <div class="relative grid place-items-center">
        <span :class="[item.icon, 'size-5 shrink-0']" aria-hidden="true" />
      </div>

      <span class="text-[10px] leading-tight mt-1 truncate max-w-[56px]">
        {{ __(item.label) }}
      </span>
    </button>
  </nav>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useClientNavFrequency } from '@/composables/navFrequency'

const route = useRoute()
const router = useRouter()
const { rankedNavItems, recordClick } = useClientNavFrequency()

function isItemActive(item) {
  if (item.matchPath) {
    return item.matchPath(route.path)
  }
  return route.path === item.to
}

function handleNavigate(item) {
  recordClick(item.key)
  if (route.path !== item.to) {
    router.push(item.to)
  }
}
</script>
