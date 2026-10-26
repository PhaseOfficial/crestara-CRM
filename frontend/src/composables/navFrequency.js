import { ref, computed } from 'vue'
import {
  STAFF_STORAGE_KEY,
  CLIENT_STORAGE_KEY,
  DEFAULT_STAFF_COUNTS,
  DEFAULT_CLIENT_COUNTS,
  getStoredCounts,
  incrementClickCount,
  rankNavItems,
  rankClientNavItems,
} from '@/utils/navFrequency'
import { useBusinessStore } from '@/stores/business'

// Shared reactive state across components
const staffCounts = ref(getStoredCounts(STAFF_STORAGE_KEY, DEFAULT_STAFF_COUNTS))
const clientCounts = ref(getStoredCounts(CLIENT_STORAGE_KEY, DEFAULT_CLIENT_COUNTS))

/**
 * Record a navigation click for staff or client portal.
 */
export function recordNavClick(key, portalType = 'staff') {
  if (!key) return

  if (portalType === 'staff') {
    staffCounts.value = incrementClickCount(staffCounts.value, key)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffCounts.value))
      } catch (err) {
        console.warn('Failed to save staff nav clicks to localStorage:', err)
      }
    }
  } else {
    clientCounts.value = incrementClickCount(clientCounts.value, key)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clientCounts.value))
      } catch (err) {
        console.warn('Failed to save client nav clicks to localStorage:', err)
      }
    }
  }
}

/**
 * Reset navigation frequency scores to initial default values.
 */
export function resetNavFrequency(portalType = 'staff') {
  if (portalType === 'staff') {
    staffCounts.value = { ...DEFAULT_STAFF_COUNTS }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STAFF_STORAGE_KEY)
    }
  } else {
    clientCounts.value = { ...DEFAULT_CLIENT_COUNTS }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CLIENT_STORAGE_KEY)
    }
  }
}

/**
 * Composable providing dynamic staff bottom navigation items.
 */
export function useStaffNavFrequency() {
  const business = useBusinessStore()

  // Full catalog of available staff candidate destinations
  const candidateItems = [
    {
      key: 'Leads',
      label: 'Leads',
      to: '/leads',
      icon: 'lucide-user-check',
      matchPath: (path) => path.startsWith('/leads'),
    },
    {
      key: 'Deals',
      label: 'Deals',
      to: '/deals',
      icon: 'lucide-badge-dollar-sign',
      matchPath: (path) => path.startsWith('/deals'),
    },
    {
      key: 'Clients',
      label: 'Clients',
      to: '/clients',
      icon: 'lucide-building-2',
      matchPath: (path) => path.startsWith('/clients') || path.startsWith('/organizations'),
      badge: () => business.pendingChangeRequests?.length || 0,
      badgeTheme: 'amber',
    },
    {
      key: 'Invoices',
      label: 'Invoices',
      to: '/invoices',
      icon: 'lucide-receipt',
      matchPath: (path) => path.startsWith('/invoices'),
    },
    {
      key: 'Inventory',
      label: 'Inventory',
      to: '/inventory',
      icon: 'lucide-package',
      matchPath: (path) => path.startsWith('/inventory'),
    },
    {
      key: 'Transactions',
      label: 'Payments',
      to: '/transactions',
      icon: 'lucide-credit-card',
      matchPath: (path) => path.startsWith('/transactions'),
    },
    {
      key: 'Tasks',
      label: 'Tasks',
      to: '/tasks',
      icon: 'lucide-check-square',
      matchPath: (path) => path.startsWith('/tasks'),
    },
    {
      key: 'Contacts',
      label: 'Contacts',
      to: '/contacts',
      icon: 'lucide-users',
      matchPath: (path) => path.startsWith('/contacts'),
    },
    {
      key: 'Notes',
      label: 'Notes',
      to: '/notes',
      icon: 'lucide-file-text',
      matchPath: (path) => path.startsWith('/notes'),
    },
    {
      key: 'Reminders',
      label: 'Reminders',
      to: '/reminders',
      icon: 'lucide-bell-ring',
      matchPath: (path) => path.startsWith('/reminders'),
    },
    {
      key: 'Analytics',
      label: 'Analytics',
      to: '/analytics',
      icon: 'lucide-bar-chart-3',
      matchPath: (path) => path.startsWith('/analytics'),
    },
    {
      key: 'Call Logs',
      label: 'Calls',
      to: '/call-logs',
      icon: 'lucide-phone',
      matchPath: (path) => path.startsWith('/call-logs'),
    },
  ]

  // Top 4 items dynamically ranked by click count
  const topNavItems = computed(() => {
    return rankNavItems(candidateItems, staffCounts.value, 4)
  })

  return {
    staffCounts,
    topNavItems,
    recordClick: (key) => recordNavClick(key, 'staff'),
    resetCounts: () => resetNavFrequency('staff'),
  }
}

/**
 * Composable providing dynamic client portal bottom navigation items.
 */
export function useClientNavFrequency() {
  const candidateItems = [
    {
      key: 'Dashboard',
      label: 'Dashboard',
      to: '/portal',
      icon: 'lucide-layout-dashboard',
      matchPath: (path) => path === '/portal',
    },
    {
      key: 'Purchases',
      label: 'Purchases',
      to: '/portal/purchases',
      icon: 'lucide-receipt',
      matchPath: (path) => path.startsWith('/portal/purchases'),
    },
    {
      key: 'Calendar',
      label: 'Calendar',
      to: '/portal/calendar',
      icon: 'lucide-calendar',
      matchPath: (path) => path.startsWith('/portal/calendar'),
    },
    {
      key: 'Promotions',
      label: 'Promotions',
      to: '/portal/promotions',
      icon: 'lucide-sparkles',
      matchPath: (path) => path.startsWith('/portal/promotions'),
    },
    {
      key: 'Account',
      label: 'My Account',
      to: '/portal/account',
      icon: 'lucide-user',
      matchPath: (path) => path.startsWith('/portal/account'),
    },
  ]

  const rankedNavItems = computed(() => {
    return rankClientNavItems(candidateItems, clientCounts.value)
  })

  return {
    clientCounts,
    rankedNavItems,
    recordClick: (key) => recordNavClick(key, 'client'),
    resetCounts: () => resetNavFrequency('client'),
  }
}
