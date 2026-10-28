<template>
  <Dialog
    v-model:open="show"
    size="2xl"
    position="top"
    bare
  >
    <div
      class="w-full overflow-hidden rounded-2xl border border-outline-gray-2 bg-surface-base shadow-2xl transition-all"
      @keydown.down.prevent="navigateDown"
      @keydown.up.prevent="navigateUp"
      @keydown.enter.prevent="selectCurrent"
      @keydown.esc.stop="close"
    >
      <!-- Search Input Header -->
      <div class="flex items-center gap-3 border-b border-outline-gray-1 bg-surface-base px-4 py-3.5">
        <span class="lucide-search size-5 shrink-0 text-ink-gray-5" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="w-full border-none bg-transparent text-sm text-ink-gray-9 placeholder-ink-gray-4 focus:outline-none focus:ring-0 sm:text-base"
          :placeholder="__('Type a command or search clients, tasks, invoices...')"
          autocomplete="off"
          spellcheck="false"
        />
        <button
          v-if="query"
          type="button"
          class="rounded p-1 text-ink-gray-4 hover:bg-surface-gray-2 hover:text-ink-gray-7"
          :title="__('Clear search')"
          @click="query = ''; inputRef?.focus()"
        >
          <span class="lucide-x size-4" />
        </button>
        <kbd
          class="hidden rounded border border-outline-gray-2 bg-surface-gray-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-gray-6 sm:inline-block"
        >
          ESC
        </kbd>
      </div>

      <!-- Results Body -->
      <div
        ref="resultsContainerRef"
        class="max-h-[60vh] overflow-y-auto p-2"
      >
        <!-- Empty Results View -->
        <div
          v-if="query && flattenedItems.length === 0"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <div class="flex size-10 items-center justify-center rounded-full bg-surface-gray-2 text-ink-gray-4">
            <span class="lucide-search-x size-5" />
          </div>
          <p class="mt-3 text-sm font-medium text-ink-gray-8">
            {{ __('No results found for "{0}"', [query]) }}
          </p>
          <p class="mt-1 text-xs text-ink-gray-5">
            {{ __('Try searching for a client name, task title, invoice number, or navigation page.') }}
          </p>
        </div>

        <!-- Grouped Results -->
        <div
          v-for="group in filteredGroups"
          :key="group.title"
          class="mb-3 last:mb-1"
        >
          <div class="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-gray-5">
            {{ __(group.title) }}
          </div>

          <div class="mt-1 space-y-0.5">
            <div
              v-for="item in group.items"
              :key="item.id"
              :data-index="item.globalIndex"
              class="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
              :class="[
                selectedIndex === item.globalIndex
                  ? 'bg-surface-gray-2 text-ink-gray-9 dark:bg-surface-gray-3'
                  : 'text-ink-gray-7 hover:bg-surface-gray-1 hover:text-ink-gray-9'
              ]"
              @mouseenter="selectedIndex = item.globalIndex"
              @click="item.action()"
            >
              <!-- Left: Icon & Titles -->
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-outline-gray-1 bg-surface-base transition-colors"
                  :class="selectedIndex === item.globalIndex ? 'border-outline-gray-3' : ''"
                >
                  <span :class="[item.icon, 'size-4 text-ink-gray-7']" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-xs font-semibold text-ink-gray-9 sm:text-sm">
                    {{ __(item.title) }}
                  </div>
                  <div
                    v-if="item.description"
                    class="truncate text-[11px] text-ink-gray-5 sm:text-xs"
                  >
                    {{ __(item.description) }}
                  </div>
                </div>
              </div>

              <!-- Right: Badges / Keyboard Hints -->
              <div class="flex shrink-0 items-center gap-2 pl-3">
                <span
                  v-if="item.badge"
                  class="rounded border border-outline-gray-2 bg-surface-base px-1.5 py-0.5 text-[10px] font-medium text-ink-gray-6"
                >
                  {{ item.badge }}
                </span>
                <span
                  v-if="item.statusBadge"
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="getStatusBadgeClasses(item.statusBadge)"
                >
                  {{ item.statusBadge }}
                </span>
                <span
                  v-if="selectedIndex === item.globalIndex"
                  class="lucide-corner-down-left size-3.5 text-ink-gray-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Guide -->
      <div class="flex items-center justify-between border-t border-outline-gray-1 bg-surface-gray-1 px-4 py-2.5 text-[11px] text-ink-gray-5">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <kbd class="rounded border border-outline-gray-2 bg-surface-base px-1 py-0.5 font-mono text-[9px] font-semibold">↑</kbd>
            <kbd class="rounded border border-outline-gray-2 bg-surface-base px-1 py-0.5 font-mono text-[9px] font-semibold">↓</kbd>
            <span>{{ __('to navigate') }}</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="rounded border border-outline-gray-2 bg-surface-base px-1.5 py-0.5 font-mono text-[9px] font-semibold">↵</kbd>
            <span>{{ __('to select') }}</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd class="rounded border border-outline-gray-2 bg-surface-base px-1.5 py-0.5 font-mono text-[9px] font-semibold">ESC</kbd>
            <span>{{ __('to close') }}</span>
          </span>
        </div>
        <div class="hidden text-ink-gray-4 sm:block">
          Crestara CRM
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, useTheme } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'
import { openNewTaskModal, openHelpModal } from '@/composables/modals'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const business = useBusinessStore()
const { currentTheme, setTheme } = useTheme()

const inputRef = ref(null)
const resultsContainerRef = ref(null)
const query = ref('')
const selectedIndex = ref(0)

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

function close() {
  show.value = false
}

// Auto-focus the search input when opened
watch(
  () => show.value,
  (isOpen) => {
    if (isOpen) {
      query.value = ''
      selectedIndex.value = 0
      nextTick(() => {
        inputRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

// Reset selection index when query changes
watch(query, () => {
  selectedIndex.value = 0
})

function getStatusBadgeClasses(status) {
  const s = String(status).toLowerCase()
  if (['done', 'completed', 'paid'].includes(s)) {
    return 'bg-surface-green-2 text-ink-green-7 dark:bg-surface-green-3'
  }
  if (['todo', 'in progress', 'pending', 'unpaid'].includes(s)) {
    return 'bg-surface-amber-2 text-ink-amber-7 dark:bg-surface-amber-3'
  }
  if (['overdue', 'cancelled', 'urgent', 'high'].includes(s)) {
    return 'bg-surface-red-2 text-ink-red-7 dark:bg-surface-red-3'
  }
  return 'bg-surface-gray-2 text-ink-gray-7'
}

// Define Static Quick Actions
const quickActions = computed(() => [
  {
    id: 'action-new-task',
    title: 'Create New Task',
    description: 'Log an action item, set due date and assign staff',
    icon: 'lucide-plus-circle',
    badge: 'T',
    keywords: ['task', 'create', 'new', 'todo'],
    action: () => {
      close()
      openNewTaskModal()
    },
  },
  {
    id: 'action-new-invoice',
    title: 'Create Tax Invoice',
    description: 'Generate a customer bill, specify line items and tax rates',
    icon: 'lucide-receipt',
    badge: 'Invoice',
    keywords: ['invoice', 'bill', 'receipt', 'charge', 'tax', 'new'],
    action: () => {
      close()
      router.push('/invoices')
    },
  },
  {
    id: 'action-toggle-theme',
    title: currentTheme.value === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
    description: 'Toggle UI color theme between dark and light appearance',
    icon: currentTheme.value === 'dark' ? 'lucide-sun' : 'lucide-moon',
    badge: 'Theme',
    keywords: ['dark', 'light', 'theme', 'mode', 'color', 'appearance'],
    action: () => {
      setTheme(currentTheme.value === 'dark' ? 'light' : 'dark')
      close()
    },
  },
  {
    id: 'action-open-help',
    title: 'Help & Documentation',
    description: 'Quick start guides, system overview, and keyboard shortcuts',
    icon: 'lucide-help-circle',
    badge: '?',
    keywords: ['help', 'docs', 'documentation', 'guide', 'shortcuts', 'manual'],
    action: () => {
      close()
      openHelpModal()
    },
  },
])

// Define Navigation Pages (Retired modules Leads, Deals, Contacts, Notes excluded)
const navigationItems = computed(() => {
  const items = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'Overview of business metrics, activities, and tasks',
      icon: 'lucide-layout-dashboard',
      keywords: ['dashboard', 'home', 'metrics', 'overview'],
      action: () => {
        close()
        router.push('/')
      },
    },
    {
      id: 'nav-clients',
      title: 'Clients & Directory',
      description: 'Client organizations, commercial profiles, and addresses',
      icon: 'lucide-users',
      keywords: ['clients', 'customers', 'organizations', 'companies', 'directory'],
      action: () => {
        close()
        router.push('/clients')
      },
    },
    {
      id: 'nav-invoices',
      title: 'Invoices & Billing',
      description: 'Tax invoices, receivable tracking, and PDF receipts',
      icon: 'lucide-receipt',
      keywords: ['invoices', 'bills', 'billing', 'accounts', 'receivables'],
      action: () => {
        close()
        router.push('/invoices')
      },
    },
    {
      id: 'nav-tasks',
      title: 'Tasks & Kanban',
      description: 'Project task management, kanban board, and assignments',
      icon: 'lucide-check-square',
      keywords: ['tasks', 'kanban', 'todo', 'projects', 'board'],
      action: () => {
        close()
        router.push('/tasks')
      },
    },
    {
      id: 'nav-calendar',
      title: 'Calendar & Scheduling',
      description: 'Upcoming meetings, client appointments, and schedule',
      icon: 'lucide-calendar',
      keywords: ['calendar', 'events', 'schedule', 'meetings', 'appointments'],
      action: () => {
        close()
        router.push('/calendar')
      },
    },
    {
      id: 'nav-transactions',
      title: 'Transactions',
      description: 'Payment records, remittances, and balance logs',
      icon: 'lucide-credit-card',
      keywords: ['transactions', 'payments', 'money', 'remittance', 'records'],
      action: () => {
        close()
        router.push('/transactions')
      },
    },
    {
      id: 'nav-inventory',
      title: 'Inventory & Stock',
      description: 'Stock catalog, pricing tiers, and warehouse items',
      icon: 'lucide-package',
      keywords: ['inventory', 'stock', 'items', 'products', 'warehouse'],
      action: () => {
        close()
        router.push('/inventory')
      },
    },
    {
      id: 'nav-reminders',
      title: 'Payment Reminders',
      description: 'Automated invoice follow-ups and email notifications',
      icon: 'lucide-bell-ring',
      keywords: ['reminders', 'notifications', 'followups', 'emails', 'overdue'],
      action: () => {
        close()
        router.push('/reminders')
      },
    },
  ]

  if (business.isAdmin) {
    items.push({
      id: 'nav-business-settings',
      title: 'Business Settings',
      description: 'Company information, remittance banking, and logo configuration',
      icon: 'lucide-sliders-horizontal',
      keywords: ['business', 'settings', 'admin', 'profile', 'bank', 'remittance', 'logo'],
      action: () => {
        close()
        router.push('/business-settings')
      },
    })
  }

  return items
})

// Build Real-Time Filtered Search Groups
const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const groups = []

  // 1. Quick Actions Group
  const matchedActions = quickActions.value.filter((action) => {
    if (!q) return true
    return (
      action.title.toLowerCase().includes(q) ||
      action.description.toLowerCase().includes(q) ||
      action.keywords?.some((k) => k.includes(q))
    )
  })
  if (matchedActions.length) {
    groups.push({
      title: 'Quick Actions',
      items: matchedActions,
    })
  }

  // 2. Navigation Pages Group
  const matchedNav = navigationItems.value.filter((item) => {
    if (!q) return true
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q))
    )
  })
  if (matchedNav.length) {
    groups.push({
      title: 'Navigation',
      items: matchedNav,
    })
  }

  // If query is provided, search active entities from Supabase / businessStore
  if (q) {
    // 3. Clients Search (from business.customers)
    const rawClients = Array.isArray(business.customers) ? business.customers : []
    const matchedClients = rawClients
      .filter((c) => {
        const name = (c.company_name || c.name || c.full_name || '').toLowerCase()
        const email = (c.email || '').toLowerCase()
        const phone = (c.phone || '').toLowerCase()
        const city = (c.city || '').toLowerCase()
        return name.includes(q) || email.includes(q) || phone.includes(q) || city.includes(q)
      })
      .slice(0, 5)
      .map((c) => ({
        id: `client-${c.id || c.name}`,
        title: c.company_name || c.name || c.full_name || 'Client Organization',
        description: [c.email, c.phone, c.city].filter(Boolean).join(' • ') || 'Client Organization',
        icon: 'lucide-building-2',
        badge: 'Client',
        action: () => {
          close()
          router.push('/clients')
        },
      }))

    if (matchedClients.length) {
      groups.push({
        title: 'Clients & Organizations',
        items: matchedClients,
      })
    }

    // 4. Tasks Search (from business.tasks)
    const rawTasks = Array.isArray(business.tasks) ? business.tasks : []
    const matchedTasks = rawTasks
      .filter((t) => {
        const title = (t.title || '').toLowerCase()
        const desc = (t.description || '').toLowerCase()
        const status = (t.status || '').toLowerCase()
        return title.includes(q) || desc.includes(q) || status.includes(q)
      })
      .slice(0, 5)
      .map((t) => ({
        id: `task-${t.id || t.name}`,
        title: t.title || 'Task',
        description: t.due_date ? `Due ${t.due_date}` : (t.description ? t.description.slice(0, 60) : 'CRM Task'),
        icon: 'lucide-check-circle-2',
        statusBadge: t.status || 'Backlog',
        badge: t.priority && t.priority !== 'Low' ? t.priority : undefined,
        action: () => {
          close()
          router.push('/tasks')
        },
      }))

    if (matchedTasks.length) {
      groups.push({
        title: 'Tasks & Deliverables',
        items: matchedTasks,
      })
    }

    // 5. Invoices Search (from business.invoices)
    const rawInvoices = Array.isArray(business.invoices) ? business.invoices : []
    const matchedInvoices = rawInvoices
      .filter((inv) => {
        const invNo = (inv.invoice_number || inv.name || '').toLowerCase()
        const cust = (inv.customer_name || '').toLowerCase()
        const status = (inv.status || '').toLowerCase()
        return invNo.includes(q) || cust.includes(q) || status.includes(q)
      })
      .slice(0, 5)
      .map((inv) => ({
        id: `invoice-${inv.id || inv.name}`,
        title: inv.invoice_number || inv.name || 'Invoice',
        description: [inv.customer_name, inv.grand_total ? `$${Number(inv.grand_total).toLocaleString()}` : ''].filter(Boolean).join(' • '),
        icon: 'lucide-file-text',
        statusBadge: inv.status || 'Unpaid',
        action: () => {
          close()
          const invId = inv.id || inv.name
          router.push(`/invoices/${invId}`)
        },
      }))

    if (matchedInvoices.length) {
      groups.push({
        title: 'Invoices & Billing',
        items: matchedInvoices,
      })
    }
  }

  // Assign global flat indices to all items for keyboard navigation
  let counter = 0
  for (const group of groups) {
    for (const item of group.items) {
      item.globalIndex = counter++
    }
  }

  return groups
})

// Flattened Items List for Arrow Key Navigation
const flattenedItems = computed(() => {
  const items = []
  for (const group of filteredGroups.value) {
    for (const item of group.items) {
      items.push(item)
    }
  }
  return items
})

function navigateDown() {
  if (flattenedItems.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % flattenedItems.value.length
  scrollToActiveItem()
}

function navigateUp() {
  if (flattenedItems.value.length === 0) return
  selectedIndex.value =
    (selectedIndex.value - 1 + flattenedItems.value.length) % flattenedItems.value.length
  scrollToActiveItem()
}

function selectCurrent() {
  if (flattenedItems.value.length === 0) return
  const item = flattenedItems.value[selectedIndex.value]
  if (item && item.action) {
    item.action()
  }
}

function scrollToActiveItem() {
  nextTick(() => {
    const el = resultsContainerRef.value?.querySelector(`[data-index="${selectedIndex.value}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  })
}
</script>
