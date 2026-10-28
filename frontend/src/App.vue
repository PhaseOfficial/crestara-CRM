<template>
  <FrappeUIProvider>
    <NotPermitted v-if="$route.name === 'Not Permitted'" />
    <component :is="resolvedLayout" v-else :class="{ isolate: isCrmLayout }">
      <router-view :key="$route.fullPath" />
    </component>
    <Dialogs />
    <DoctypeModals v-if="session.isLoggedIn && !isStandaloneRoute" />
    <EventNotificationPopup v-if="session.isLoggedIn && !isStandaloneRoute" />

    <!-- Fullscreen smooth transition overlay during sign out -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="session.logout.loading"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-base"
        role="status"
        aria-live="polite"
      >
        <div class="flex flex-col items-center gap-3">
          <LoadingIndicator class="size-8 text-ink-gray-5" />
          <p class="text-sm font-medium text-ink-gray-6">{{ __('Signing out...') }}</p>
        </div>
      </div>
    </Transition>
  </FrappeUIProvider>
</template>

<script setup>
import NotPermitted from '@/pages/NotPermitted.vue'
import EventNotificationPopup from '@/components/EventNotificationPopup.vue'
import DoctypeModals from '@/components/Modals/DoctypeModals.vue'
import CustomerLayout from '@/components/Layouts/CustomerLayout.vue'
import { Dialogs } from '@/utils/dialogs'
import { sessionStore } from '@/stores/session'
import { isMobileView } from '@/composables/settings'
import { FrappeUIProvider, setConfig, useTheme, LoadingIndicator } from 'frappe-ui'
import { computed, defineAsyncComponent, provide, h, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const session = sessionStore()
provide('session', session)

const { setTheme, currentTheme } = useTheme()
if (!localStorage.getItem('theme')) {
  setTheme('light')
}

watch(
  currentTheme,
  (theme) => {
    if (typeof document !== 'undefined') {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' &&
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', Boolean(isDark))
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    }
  },
  { immediate: true }
)

const MobileLayout = defineAsyncComponent(
  () => import('./components/Layouts/MobileLayout.vue'),
)
const DesktopLayout = defineAsyncComponent(
  () => import('./components/Layouts/DesktopLayout.vue'),
)
const Layout = computed(() => (isMobileView.value ? MobileLayout : DesktopLayout))

// Empty layout wrapper for standalone pages (Login, Onboarding, Not Permitted)
const EmptyLayout = (props, { slots }) => h('div', { class: 'h-full w-full' }, slots.default?.())

const isStandaloneRoute = computed(() => {
  return route.name === 'Login' || route.name === 'Onboarding' || route.name === 'Not Permitted'
})

const isPortalRoute = computed(() => {
  return Boolean(route.path && route.path.startsWith('/portal'))
})

const isCrmLayout = computed(() => {
  return resolvedLayout.value === Layout.value
})

const resolvedLayout = computed(() => {
  if (isStandaloneRoute.value) {
    return EmptyLayout
  }
  if (session.isLoggedIn && isPortalRoute.value) {
    return CustomerLayout
  }
  if (session.isLoggedIn) {
    return Layout.value
  }
  return EmptyLayout
})

setConfig('systemTimezone', window.timezone?.system || null)
setConfig('localTimezone', window.timezone?.user || null)
setConfig('translatedMessages', window.translated_messages || {})
</script>
