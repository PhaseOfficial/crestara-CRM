<template>
  <FrappeUIProvider>
    <NotPermitted v-if="$route.name === 'Not Permitted'" />
    <router-view v-else-if="$route.name === 'Onboarding'" />
    <CustomerLayout v-else-if="session.isLoggedIn && $route.path.startsWith('/portal')">
      <router-view :key="$route.fullPath" />
    </CustomerLayout>
    <Layout v-else-if="session.isLoggedIn" class="isolate">
      <router-view :key="$route.fullPath" />
    </Layout>
    <router-view v-else />
    <Dialogs />
    <DoctypeModals v-if="session.isLoggedIn" />
    <EventNotificationPopup v-if="session.isLoggedIn" />
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
import { FrappeUIProvider, setConfig, useTheme } from 'frappe-ui'
import { computed, defineAsyncComponent, provide, watch } from 'vue'

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

setConfig('systemTimezone', window.timezone?.system || null)
setConfig('localTimezone', window.timezone?.user || null)
setConfig('translatedMessages', window.translated_messages || {})
</script>
