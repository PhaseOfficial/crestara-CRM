<template>
  <Dropdown :options="dropdownItems" v-bind="$attrs">
    <template #default="{ open }">
      <button
        class="flex h-12 items-center rounded-md py-2 duration-300 ease-in-out"
        :class="
          isCollapsed
            ? 'w-auto px-0'
            : open
              ? 'w-full px-2 bg-surface-elevation-3 shadow-sm'
              : 'w-full px-2 hover:bg-surface-gray-2'
        "
      >
        <BrandLogo v-model="brand" class="size-8 shrink-0" />
        <div
          class="flex flex-1 flex-col text-left duration-300 ease-in-out truncate"
          :class="
            isCollapsed
              ? 'ml-0 w-0 overflow-hidden opacity-0'
              : 'ml-2 w-auto opacity-100'
          "
        >
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-base-medium font-semibold leading-none text-ink-gray-9 truncate">
              {{ __(brand.name || 'Crestara CRM') }}
            </span>
            <span class="rounded bg-surface-gray-3 px-1 py-0.5 text-[10px] font-medium text-ink-gray-7">
              {{ business.currentRole }}
            </span>
          </div>
          <div class="mt-1 text-sm leading-none text-ink-gray-7 truncate">
            {{ user.full_name || user.email || 'User' }}
          </div>
        </div>
        <div
          class="duration-300 ease-in-out"
          :class="
            isCollapsed
              ? 'ml-0 w-0 overflow-hidden opacity-0'
              : 'ml-2 w-auto opacity-100'
          "
        >
          <span
            class="lucide-chevron-down size-4 text-ink-gray-5"
            aria-hidden="true"
          />
        </div>
      </button>
    </template>
  </Dropdown>
</template>

<script setup>
import BrandLogo from '@/components/BrandLogo.vue'
import FrappeCloudIcon from '@/components/Icons/FrappeCloudIcon.vue'
import AppsIcon from '@/components/Icons/AppsIcon.vue'
import { sessionStore } from '@/stores/session'
import { usersStore } from '@/stores/users'
import { getSettings } from '@/stores/settings'
import { useBusinessStore } from '@/stores/business'
import { showSettings, isMobileView } from '@/composables/settings'
import { showAboutModal } from '@/composables/modals'
import { confirmLoginToFrappeCloud } from '@/composables/frappecloud'
import { createResource, Dropdown, useTheme } from 'frappe-ui'
import { computed, h, markRaw } from 'vue'
import { useRouter } from 'vue-router'

defineProps({
  isCollapsed: { type: Boolean, default: false },
})

const router = useRouter()
const business = useBusinessStore()
const { settings, brand } = getSettings()
const { logout } = sessionStore()
const { getUser } = usersStore()
const { currentTheme, setTheme } = useTheme()

const user = computed(() => getUser() || {})

const apps = createResource({
  url: 'frappe.apps.get_apps',
  cache: 'apps',
  auto: false,
  transform: (data) => [deskApp(), ...crmSiblingApps(data)],
})

const dropdownItems = computed(() => {
  const items = [
    {
      group: 'Workspace',
      items: [
        {
          label: __('Customer Portal'),
          icon: 'external-link',
          onClick: () => router.push('/portal'),
        },
        ...(business.isAdmin
          ? [
              {
                label: __('Business Settings'),
                icon: 'sliders',
                onClick: () => router.push('/business-settings'),
              },
            ]
          : []),
      ],
    },
    {
      group: 'Account & Preferences',
      items: [
        {
          label: currentTheme.value === 'dark' ? __('Light Theme') : __('Dark Theme'),
          icon: currentTheme.value === 'dark' ? 'sun' : 'moon',
          onClick: () => setTheme(currentTheme.value === 'dark' ? 'light' : 'dark'),
        },
        {
          label: __('Settings'),
          icon: 'settings',
          onClick: () => (showSettings.value = true),
          condition: () => !isMobileView.value,
        },
        {
          label: __('About Crestara CRM'),
          icon: 'info',
          onClick: () => (showAboutModal.value = true),
        },
        {
          label: __('Log out'),
          icon: 'log-out',
          onClick: () => logout.submit(),
        },
      ],
    },
  ]

  return items
})

function dropdownItemObj(item) {
  let _item = JSON.parse(JSON.stringify(item))
  let icon = _item.icon || 'external-link'
  if (typeof icon === 'string' && icon.startsWith('<svg')) {
    icon = markRaw(h('div', { innerHTML: icon }))
  }
  _item.icon = icon

  if (_item.is_standard) {
    return getStandardItem(_item)
  }

  return {
    icon: _item.icon,
    label: __(_item.label),
    onClick: () =>
      window.open(_item.route, _item.open_in_new_window ? '_blank' : ''),
  }
}

function getStandardItem(item) {
  switch (item.name1) {
    case 'app_selector':
      return {
        icon: markRaw(AppsIcon),
        label: __(item.label),
        submenu: appMenuItems(),
      }
    case 'settings':
      return {
        icon: item.icon,
        label: __(item.label),
        onClick: () => (showSettings.value = true),
        condition: () => !isMobileView.value,
      }
    case 'login_to_fc':
      return {
        icon: h(FrappeCloudIcon),
        label: __(item.label),
        onClick: () => confirmLoginToFrappeCloud(),
        condition: () => !isMobileView.value && window.is_fc_site,
      }
    case 'about':
      return {
        icon: item.icon,
        label: __(item.label),
        onClick: () => (showAboutModal.value = true),
      }
    case 'logout':
      return {
        icon: item.icon,
        label: __(item.label),
        onClick: () => logout.submit(),
      }
  }
}

function appMenuItems() {
  return (apps.data || []).map((app) => ({
    label: app.title,
    onClick: () => (window.location.href = app.route),
    slots: {
      prefix: () => h('img', { class: 'size-5 rounded', src: app.logo }),
    },
  }))
}

function deskApp() {
  return {
    name: 'frappe',
    logo: '/assets/frappe/images/framework.png',
    title: __('Desk'),
    route: '/desk',
  }
}

function crmSiblingApps(data) {
  return data
    .filter((app) => app.name !== 'crm')
    .map((app) => ({
      name: app.name,
      logo: app.logo,
      title: __(app.title),
      route: app.route,
    }))
}
</script>
