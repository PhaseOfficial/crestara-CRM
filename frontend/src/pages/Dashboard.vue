<template>
  <div class="flex flex-col h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <ViewBreadcrumbs routeName="Dashboard" />
      </template>
      <template #right-header>
        <!-- Normal Mode Controls -->
        <template v-if="!editing">
          <Button
            :label="__('Refresh')"
            :iconLeft="LucideRefreshCcw"
            :loading="isRefreshing"
            @click="refreshDashboard"
          />
          <Button
            v-if="isAdmin() || isManager()"
            :label="__('Edit Layout')"
            :iconLeft="LucidePenLine"
            @click="enableEditing"
          />
          <Button
            variant="solid"
            :label="__('New Invoice')"
            :iconLeft="LucidePlus"
            @click="router.push('/invoices')"
          />
        </template>

        <!-- Edit Mode Controls -->
        <template v-else>
          <Button
            :label="__('Add Chart')"
            :iconLeft="LucidePlus"
            @click="showAddChartModal = true"
          />
          <Button
            :label="__('Reset to Default')"
            :iconLeft="LucideUndo2"
            @click="handleResetToDefault"
          />
          <Button :label="__('Cancel')" @click="cancel" />
          <Button
            variant="solid"
            :label="__('Save Layout')"
            :disabled="!dirty"
            :loading="isSaving"
            @click="save"
          />
        </template>
      </template>
    </LayoutHeader>

    <!-- Filter Bar -->
    <div class="p-5 pb-2 flex flex-wrap items-center gap-3">
      <!-- Date Range Dropdown / Picker -->
      <Dropdown
        v-if="!showDatePicker"
        v-model="preset"
        :options="presetOptions"
        class="form-control"
        :placeholder="__('Select Range')"
        :button="{
          label: __(preset),
          class:
            '!w-48 justify-start [&>span]:mr-auto [&>svg]:text-ink-gray-5',
          variant: 'outline',
          iconRight: 'lucide-chevron-down',
          iconLeft: 'lucide-calendar',
        }"
      />
      <DateRangePicker
        v-else
        ref="datePickerRef"
        class="!w-48"
        :value="filters.period"
        variant="outline"
        :placeholder="__('Period')"
        :formatter="formatRange"
        @change="
          (v) =>
            updateFilter('period', v, () => {
              showDatePicker = false
              if (!v) {
                filters.period = getLastXDays(30)
                preset = 'Last 30 Days'
              } else {
                preset = formatter(v)
              }
            })
        "
      >
        <template #prefix>
          <LucideCalendar class="size-4 text-ink-gray-5 mr-2" />
        </template>
      </DateRangePicker>

      <!-- Staff Selector Dropdown -->
      <Dropdown
        v-if="isAdmin() || isManager()"
        :options="staffOptions"
        :button="{
          label: selectedStaffLabel,
          class:
            '!w-48 justify-start [&>span]:mr-auto [&>svg]:text-ink-gray-5',
          variant: 'outline',
          iconRight: 'lucide-chevron-down',
          iconLeft: 'lucide-user',
        }"
      />

      <!-- Active Period Badge -->
      <div
        v-if="fromDate && toDate"
        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-1"
      >
        <span>{{ formatRange(fromDate) }}</span>
        <span>→</span>
        <span>{{ formatRange(toDate) }}</span>
      </div>
      <div
        v-else-if="preset === 'All Time'"
        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-1"
      >
        <span>{{ __('All Time History') }}</span>
      </div>
    </div>

    <!-- Main Dashboard Scroll Canvas -->
    <div class="w-full flex-1 overflow-y-auto">
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center py-20 text-ink-gray-5 gap-3"
      >
        <LucideRefreshCcw class="size-6 animate-spin text-ink-blue-7" />
        <span class="text-sm font-medium">{{ __('Calculating dashboard telemetry...') }}</span>
      </div>

      <!-- Customizable 20-col Dashboard Grid -->
      <div v-else class="px-3">
        <DashboardGrid
          v-if="dashboardItems.length > 0"
          v-model="dashboardItems"
          :editing="editing"
        />

        <div
          v-else
          class="flex flex-col items-center justify-center p-12 text-ink-gray-5 border border-dashed border-outline-gray-2 rounded-xl my-4"
        >
          <p class="text-sm">{{ __('No charts configured on dashboard.') }}</p>
          <Button
            variant="outline"
            size="sm"
            class="mt-3"
            :label="__('Restore Default Dashboard')"
            @click="handleResetToDefault"
          />
        </div>
      </div>

      <!-- Actionable Operations Layer (Shown in non-editing mode) -->
      <div v-if="!editing && !isLoading" class="px-5 py-6 space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Urgent Overdue Watchlist -->
          <div
            class="bg-surface-base rounded-xl border border-outline-gray-1 shadow-sm p-5 space-y-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-lg bg-surface-red-2 text-ink-red-7">
                  <LucideAlertCircle class="size-4" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-ink-gray-9">
                    {{ __('Overdue Invoices Watchlist') }}
                  </h3>
                  <p class="text-xs text-ink-gray-6">
                    {{ overdueInvoices.length }} {{ __('invoices require immediate collection follow-up') }}
                  </p>
                </div>
              </div>
              <router-link
                to="/reminders"
                class="text-xs font-semibold text-ink-blue-7 dark:text-ink-blue-3 hover:underline"
              >
                {{ __('View Reminders →') }}
              </router-link>
            </div>

            <!-- Overdue List -->
            <div class="divide-y divide-outline-gray-1">
              <div
                v-for="inv in overdueInvoices.slice(0, 4)"
                :key="inv.id"
                class="py-3 flex items-center justify-between gap-4"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-xs text-ink-blue-7 dark:text-ink-blue-3">
                      {{ inv.invoice_number }}
                    </span>
                    <span class="text-xs text-ink-gray-9 font-medium truncate">
                      {{ inv.client_name }}
                    </span>
                  </div>
                  <div class="text-[11px] text-ink-red-7 mt-0.5">
                    {{ __('Due date was {0}', [inv.due_date]) }}
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-right">
                    <span class="font-mono font-bold text-xs text-ink-gray-9 block">
                      {{ business.formatCurrency(inv.balance_due || inv.total_amount, inv.currency) }}
                    </span>
                    <span class="text-[10px] text-ink-gray-5 uppercase font-semibold">
                      {{ __('Balance') }}
                    </span>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    :iconLeft="LucideSend"
                    :label="__('Remind')"
                    :loading="sendingReminderId === inv.id"
                    @click="handleSendReminder(inv)"
                  />
                </div>
              </div>

              <div
                v-if="overdueInvoices.length === 0"
                class="py-8 text-center text-xs text-ink-green-7 dark:text-ink-green-4 font-medium"
              >
                ✓ {{ __('All invoices are paid or within agreed payment terms. Zero overdue accounts!') }}
              </div>
            </div>
          </div>

          <!-- Recent Settlement Transactions -->
          <div
            class="bg-surface-base rounded-xl border border-outline-gray-1 shadow-sm p-5 space-y-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="p-2 rounded-lg bg-surface-green-2 text-ink-green-7">
                  <LucideReceiptText class="size-4" />
                </div>
                <div>
                  <h3 class="text-sm font-bold text-ink-gray-9">
                    {{ __('Recent Cash Settlements') }}
                  </h3>
                  <p class="text-xs text-ink-gray-6">
                    {{ __('Real-time cash payments settled against issued invoices') }}
                  </p>
                </div>
              </div>
              <router-link
                to="/transactions"
                class="text-xs font-semibold text-ink-blue-7 dark:text-ink-blue-3 hover:underline"
              >
                {{ __('All Transactions →') }}
              </router-link>
            </div>

            <!-- Transactions List -->
            <div class="divide-y divide-outline-gray-1">
              <div
                v-for="tx in recentSettlements.slice(0, 4)"
                :key="tx.id"
                class="py-3 flex items-center justify-between gap-4"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-semibold text-xs text-ink-gray-9">
                      {{ tx.receipt_number || tx.invoice_number || 'REC-SETTLED' }}
                    </span>
                    <span class="text-xs text-ink-gray-7 truncate">
                      {{ tx.client_name }}
                    </span>
                  </div>
                  <div class="text-[11px] text-ink-gray-5 mt-0.5">
                    {{ tx.payment_date || (tx.created_at ? tx.created_at.slice(0, 10) : '') }} • {{ tx.payment_method || 'Direct Transfer' }}
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <span class="font-mono font-bold text-xs text-ink-green-7 dark:text-ink-green-4 block">
                    +{{ business.formatCurrency(tx.amount, tx.currency) }}
                  </span>
                  <span class="text-[10px] text-ink-green-7 uppercase font-semibold">
                    {{ __('Settled') }}
                  </span>
                </div>
              </div>

              <div
                v-if="recentSettlements.length === 0"
                class="py-8 text-center text-xs text-ink-gray-5"
              >
                {{ __('No settled payments recorded in this period yet.') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Chart Modal -->
    <AddChartModal
      v-if="showAddChartModal"
      v-model="showAddChartModal"
      v-model:items="dashboardItems"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import { usersStore } from '@/stores/users'
import {
  setDashboardStoreResolver,
  getDashboard,
  saveDashboardLayout,
  resetDashboardToDefault,
  isDateInRange,
  DashboardLayoutItem,
} from '@/utils/dashboardEndpoints'
import { getLastXDays, formatter, formatRange } from '@/utils/dashboard'
import { copy } from '@/utils'
import LucideRefreshCcw from '~icons/lucide/refresh-ccw'
import LucideUndo2 from '~icons/lucide/undo-2'
import LucidePenLine from '~icons/lucide/pen-line'
import LucideCalendar from '~icons/lucide/calendar'
import LucidePlus from '~icons/lucide/plus'
import LucideAlertCircle from '~icons/lucide/alert-circle'
import LucideReceiptText from '~icons/lucide/receipt-text'
import LucideSend from '~icons/lucide/send'
import DashboardGrid from '@/components/Dashboard/DashboardGrid.vue'
import AddChartModal from '@/components/Dashboard/AddChartModal.vue'
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import {
  usePageMeta,
  DateRangePicker,
  Dropdown,
  Button,
  toast,
} from 'frappe-ui'
import { ref, reactive, computed, provide, onMounted } from 'vue'

const router = useRouter()
const business = useBusinessStore()
const { isManager, isAdmin } = usersStore()

// Bind business store resolver for dashboard endpoints
setDashboardStoreResolver(() => business)

const editing = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const isRefreshing = ref(false)
const sendingReminderId = ref<string | null>(null)

const showDatePicker = ref(false)
const datePickerRef = ref(null)
const preset = ref('Last 30 Days')
const showAddChartModal = ref(false)

const dashboardItems = ref<DashboardLayoutItem[]>([])
const oldItems = ref<DashboardLayoutItem[]>([])

const filters = reactive({
  period: getLastXDays(30) as any,
  user: null as string | null,
})

const fromDate = computed(() => {
  if (!filters.period) return null
  if (Array.isArray(filters.period)) return filters.period[0] || null
  if (typeof filters.period === 'string') return filters.period.split(',')[0] || null
  return null
})

const toDate = computed(() => {
  if (!filters.period) return null
  if (Array.isArray(filters.period)) return filters.period[1] || null
  if (typeof filters.period === 'string') return filters.period.split(',')[1] || null
  return null
})

provide('fromDate', fromDate)
provide('toDate', toDate)
provide('filters', filters)

const dirty = computed(() => {
  if (!editing.value) return false
  const cleanCurrent = dashboardItems.value.map((it) => ({
    name: it.name,
    type: it.type,
    layout: it.layout,
  }))
  const cleanOld = oldItems.value.map((it) => ({
    name: it.name,
    type: it.type,
    layout: it.layout,
  }))
  return JSON.stringify(cleanCurrent) !== JSON.stringify(cleanOld)
})

// Overdue Invoices
const overdueInvoices = computed(() => {
  return (business.invoices || []).filter(
    (inv: any) =>
      inv.status === 'Overdue' &&
      isDateInRange(inv.issue_date || inv.created_at, fromDate.value, toDate.value),
  )
})

// Recent Settlements
const recentSettlements = computed(() => {
  return (business.transactions || []).filter(
    (tx: any) =>
      tx.status === 'Settled' &&
      isDateInRange(tx.payment_date || tx.created_at, fromDate.value, toDate.value),
  )
})

// Date Preset Options
const presetOptions = computed(() => [
  {
    group: 'Presets',
    hideLabel: true,
    items: [
      {
        label: __('Last 7 Days'),
        onClick: () => {
          preset.value = 'Last 7 Days'
          filters.period = getLastXDays(7)
          loadDashboard()
        },
      },
      {
        label: __('Last 30 Days'),
        onClick: () => {
          preset.value = 'Last 30 Days'
          filters.period = getLastXDays(30)
          loadDashboard()
        },
      },
      {
        label: __('Last 60 Days'),
        onClick: () => {
          preset.value = 'Last 60 Days'
          filters.period = getLastXDays(60)
          loadDashboard()
        },
      },
      {
        label: __('Last 90 Days'),
        onClick: () => {
          preset.value = 'Last 90 Days'
          filters.period = getLastXDays(90)
          loadDashboard()
        },
      },
      {
        label: __('All Time'),
        onClick: () => {
          preset.value = 'All Time'
          filters.period = null
          loadDashboard()
        },
      },
    ],
  },
  {
    label: __('Custom Range'),
    onClick: () => {
      showDatePicker.value = true
      setTimeout(() => datePickerRef.value?.open(), 0)
      preset.value = 'Custom Range'
      filters.period = null
    },
  },
])

// Staff User Selector Options
const selectedStaffLabel = computed(() => {
  if (!filters.user) return __('All Staff')
  const u = (business.users || []).find((user: any) => user.id === filters.user || user.email === filters.user)
  return u ? u.full_name || u.email : __('All Staff')
})

const staffOptions = computed(() => [
  {
    group: 'Staff Filter',
    hideLabel: true,
    items: [
      {
        label: __('All Staff'),
        onClick: () => {
          filters.user = null
          loadDashboard()
        },
      },
      ...(business.users || []).map((u: any) => ({
        label: u.full_name || u.email,
        onClick: () => {
          filters.user = u.id || u.email
          loadDashboard()
        },
      })),
    ],
  },
])

function updateFilter(key: string, value: any, callback?: () => void) {
  if (key === 'period' && Array.isArray(value)) {
    filters[key] = value.join(',')
  } else {
    filters[key] = value
  }
  callback?.()
  loadDashboard()
}

async function loadDashboard() {
  isLoading.value = true
  try {
    const items = await getDashboard(
      {
        from_date: fromDate.value,
        to_date: toDate.value,
        user: filters.user,
      },
      business,
    )
    dashboardItems.value = items
    if (!editing.value) {
      oldItems.value = copy(items)
    }
  } catch (err) {
    console.error('[Dashboard] Error loading items:', err)
  } finally {
    isLoading.value = false
  }
}

async function refreshDashboard() {
  isRefreshing.value = true
  try {
    await Promise.all([
      business.fetchInvoicesFromSupabase?.(),
      business.fetchBusinessSettingsFromSupabase?.(),
      business.fetchInventoryFromSupabase?.(),
      business.fetchClientsFromSupabase?.(),
    ])
    await loadDashboard()
    toast.success(__('Dashboard refreshed successfully'))
  } catch (err) {
    console.warn('[Dashboard] Refresh notice:', err)
    await loadDashboard()
  } finally {
    isRefreshing.value = false
  }
}

function enableEditing() {
  editing.value = true
  oldItems.value = copy(dashboardItems.value)
}

function cancel() {
  editing.value = false
  dashboardItems.value = copy(oldItems.value)
}

async function save() {
  isSaving.value = true
  try {
    const ok = await saveDashboardLayout(dashboardItems.value)
    if (ok) {
      oldItems.value = copy(dashboardItems.value)
      editing.value = false
      toast.success(__('Dashboard layout saved successfully'))
    } else {
      toast.error(__('Could not save dashboard layout'))
    }
  } finally {
    isSaving.value = false
  }
}

async function handleResetToDefault() {
  isLoading.value = true
  try {
    const items = await resetDashboardToDefault(
      {
        from_date: fromDate.value,
        to_date: toDate.value,
        user: filters.user,
      },
      business,
    )
    dashboardItems.value = items
    oldItems.value = copy(items)
    editing.value = false
    toast.success(__('Restored default dashboard layout'))
  } finally {
    isLoading.value = false
  }
}

async function handleSendReminder(inv: any) {
  sendingReminderId.value = inv.id
  try {
    await business.sendManualInvoiceReminder(inv.id)
    toast.success(__('Payment reminder sent to {0}', [inv.client_email || inv.client_name]))
  } catch (err: any) {
    toast.error(err.message || __('Failed to dispatch reminder'))
  } finally {
    sendingReminderId.value = null
  }
}

onMounted(() => {
  loadDashboard()
})

usePageMeta(() => {
  return { title: __('CRM Dashboard') }
})
</script>
