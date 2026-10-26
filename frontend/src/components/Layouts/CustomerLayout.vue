<template>
  <div class="min-h-screen bg-surface-gray-2 flex flex-col">
    <!-- Customer Portal Navigation Header -->
    <header class="bg-surface-base border-b border-outline-gray-1 sticky top-0 z-30 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <!-- Logo & Portal Tag -->
          <div class="flex items-center gap-3">
            <router-link to="/portal" class="flex items-center gap-2">
              <img
                src="/crestara_logo.png"
                alt="Crestara CRM"
                class="h-8 w-auto object-contain"
              />
            </router-link>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-blue-2 text-ink-blue-7"
            >
              {{ __('Client Portal') }}
            </span>
          </div>

          <!-- Desktop Navigation Links -->
          <nav class="hidden md:flex space-x-1">
            <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.path === item.to
                  ? 'bg-surface-gray-2 text-ink-gray-9 font-semibold'
                  : 'text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-1'
              "
              @click="recordNavClick(item.key, 'client')"
            >
              {{ __(item.label) }}
            </router-link>
          </nav>

          <!-- Right: Workspace Switch & Account -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Guide & Walkthrough Button -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-blue-7 bg-surface-blue-2 border border-outline-blue-2 hover:bg-surface-blue-3 transition focus:outline-none"
              :title="__('Explore Getting Started Guide')"
              @click="showGuideModal = true"
            >
              <span class="lucide-compass size-4 shrink-0" />
              <span class="hidden sm:inline">{{ __('Guide') }}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-blue-3 text-ink-blue-8">
                {{ business.completedOnboardingStepsCount }}/{{ business.customerOnboardingSteps.length }}
              </span>
            </button>

            <!-- Theme Toggle -->
            <button
              type="button"
              class="p-2 rounded-full text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-2 transition focus:outline-none"
              :title="currentTheme === 'dark' ? __('Switch to Light Mode') : __('Switch to Dark Mode')"
              @click="toggleTheme"
            >
              <span :class="currentTheme === 'dark' ? 'lucide-sun' : 'lucide-moon'" class="size-4" />
            </button>

            <button
              v-if="business.currentRole !== 'Customer'"
              type="button"
              class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-outline-gray-2 text-ink-gray-7 hover:bg-surface-gray-2 transition"
              @click="router.push('/dashboard')"
            >
              <span class="lucide-arrow-left size-3.5" />
              {{ __('CRM Workspace') }}
            </button>

            <!-- Profile & Logout Dropdown -->
            <Dropdown :options="userMenuOptions">
              <template #default>
                <button
                  class="flex items-center gap-2 p-1 rounded-full hover:bg-surface-gray-2 text-sm text-ink-gray-7 focus:outline-none"
                >
                  <Avatar
                    size="sm"
                    :label="business.currentUser.full_name || 'Client'"
                    :image="business.currentUser.avatar"
                  />
                  <span class="hidden lg:inline text-xs font-medium text-ink-gray-8">
                    {{ business.currentUser.full_name }}
                  </span>
                  <span class="lucide-chevron-down size-3.5 text-ink-gray-4" />
                </button>
              </template>
            </Dropdown>

            <!-- Mobile menu button -->
            <button
              class="md:hidden p-2 rounded-md text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-2"
              @click="mobileMenuOpen = !mobileMenuOpen"
            >
              <span :class="mobileMenuOpen ? 'lucide-x' : 'lucide-menu'" class="size-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile drawer links -->
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-outline-gray-1 px-4 pt-2 pb-3 space-y-1 bg-surface-base shadow-lg">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block px-3 py-2 rounded-md text-base font-medium"
          :class="
            $route.path === item.to
              ? 'bg-surface-gray-2 text-ink-gray-9 font-semibold'
              : 'text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-1'
          "
          @click="() => { mobileMenuOpen = false; recordNavClick(item.key, 'client'); }"
        >
          {{ __(item.label) }}
        </router-link>

        <div v-if="business.currentRole !== 'Customer'" class="pt-2 border-t border-outline-gray-1 px-3">
          <button
            type="button"
            class="w-full text-left py-2 text-xs font-medium text-ink-blue-6"
            @click="router.push('/dashboard')"
          >
            ← {{ __('Return to CRM Workspace') }}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
      <slot />
    </main>

    <!-- Modals for Onboarding & Profile Completion -->
    <ProfileCompletionModal
      v-model="showProfileModal"
      @open-change-modal="handleOpenProfileChange"
    />
    <CustomerGuideModal
      v-model="showGuideModal"
      @open-profile-change="handleOpenProfileChange"
    />

    <!-- Mobile Bottom Navigation Bar -->
    <CustomerBottomNav />

    <!-- Footer -->
    <footer class="bg-surface-base border-t border-outline-gray-1 py-4 text-center text-xs text-ink-gray-5 pb-20 md:pb-4">
      <div class="max-w-7xl mx-auto px-4">
        © {{ new Date().getFullYear() }} {{ business.settings.business_name }}. {{ __('Customer Workspace') }}
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import { sessionStore } from '@/stores/session'
import { Dropdown, Avatar, useTheme } from 'frappe-ui'
import ProfileCompletionModal from '@/components/Modals/ProfileCompletionModal.vue'
import CustomerGuideModal from '@/components/Modals/CustomerGuideModal.vue'
import CustomerBottomNav from '@/components/Layouts/CustomerBottomNav.vue'
import { recordNavClick } from '@/composables/navFrequency'

const router = useRouter()
const business = useBusinessStore()
const session = sessionStore()
const mobileMenuOpen = ref(false)
const showGuideModal = ref(false)
const showProfileModal = ref(false)
const { currentTheme, setTheme } = useTheme()

function handleOpenProfileChange() {
  router.push('/portal/account?request_change=true')
}

function toggleTheme() {
  setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
}

const navItems = [
  { key: 'Dashboard', label: 'Dashboard', to: '/portal' },
  { key: 'Purchases', label: 'My Purchases & Invoices', to: '/portal/purchases' },
  { key: 'Calendar', label: 'My Calendar', to: '/portal/calendar' },
  { key: 'Promotions', label: 'Promotions', to: '/portal/promotions' },
  { key: 'Account', label: 'My Account', to: '/portal/account' },
]

const userMenuOptions = computed(() => {
  const options = [
    {
      label: 'My Account',
      icon: 'user',
      onClick: () => router.push({ path: '/portal/account' }),
    },
  ]

  if (business.currentRole !== 'Customer') {
    options.push({
      label: 'CRM Workspace',
      icon: 'arrow-left',
      onClick: () => router.push({ path: '/dashboard' }),
    })
  }

  options.push({
    label: currentTheme.value === 'dark' ? 'Light Theme' : 'Dark Theme',
    icon: currentTheme.value === 'dark' ? 'sun' : 'moon',
    onClick: () => toggleTheme(),
  })

  options.push({
    label: 'Sign Out',
    icon: 'log-out',
    onClick: () => session.logout.submit(),
  })

  return options
})
</script>
