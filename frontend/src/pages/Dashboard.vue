<template>
  <div class="flex flex-col h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <ViewBreadcrumbs routeName="Dashboard" />
      </template>
      <template #right-header>
        <Button
          v-if="!editing"
          :label="__('Refresh')"
          :iconLeft="LucideRefreshCcw"
          @click="dashboardItems.reload"
        />
        <Button
          v-if="!editing && isAdmin()"
          :label="__('Edit')"
          :iconLeft="LucidePenLine"
          @click="enableEditing"
        />
        <Button
          v-if="editing"
          :label="__('Chart')"
          iconLeft="plus"
          @click="showAddChartModal = true"
        />
        <Button
          v-if="editing && isAdmin()"
          :label="__('Reset to Default')"
          :iconLeft="LucideUndo2"
          @click="resetToDefault"
        />
        <Button v-if="editing" :label="__('Cancel')" @click="cancel" />
        <Button
          v-if="editing"
          variant="solid"
          :label="__('Save')"
          :disabled="!dirty"
          :loading="saveDashboard.loading"
          @click="save"
        />
      </template>
    </LayoutHeader>

    <div class="p-5 pb-2 flex items-center gap-4">
      <Dropdown
        v-if="!showDatePicker"
        v-model="preset"
        :options="options"
        class="form-control"
        :placeholder="__('Select Range')"
        :button="{
          label: __(preset),
          class:
            '!w-full justify-start [&>span]:mr-auto [&>svg]:text-ink-gray-5',
          variant: 'outline',
          iconRight: 'chevron-down',
          iconLeft: 'calendar',
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
                filters.period = getLastXDays()
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
      <Link
        v-if="isAdmin() || isManager()"
        class="form-control w-48"
        variant="outline"
        :value="filters.user && getUser(filters.user).full_name"
        doctype="User"
        :filters="{
          name: ['in', users.data.crmUsers?.map((u) => u.name)],
          ignore_user_type: 1,
        }"
        :placeholder="__('Sales User')"
        :hideMe="true"
        @change="(v) => updateFilter('user', v)"
      >
        <template #prefix>
          <UserAvatar
            v-if="filters.user"
            class="mr-2"
            :user="filters.user"
            size="sm"
          />
        </template>
        <template #item-prefix="{ option }">
          <UserAvatar class="mr-2" :user="option.value" size="sm" />
        </template>
        <template #item-label="{ option }">
          <Tooltip :text="option.value">
            <div class="cursor-pointer text-ink-gray-9">
              {{ getUser(option.value).full_name }}
            </div>
          </Tooltip>
        </template>
      </Link>
    </div>

    <div class="w-full overflow-y-scroll">
      <!-- Business Management Summary KPI Widget -->
      <div class="px-5 pt-2 pb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-outline-base bg-surface-base hover:border-outline-gray-3 transition cursor-pointer shadow-sm"
            @click="router.push('/invoices')"
          >
            <div>
              <p class="text-xs font-medium text-ink-gray-5">{{ __('Total Revenue') }}</p>
              <h3 class="text-xl font-bold text-ink-gray-9 mt-1">{{ business.formatCurrency(business.totalRevenue) }}</h3>
              <p class="text-[11px] text-ink-green-6 mt-1 flex items-center gap-1">
                <span>↑ 14.8%</span>
                <span class="text-ink-gray-4">{{ __('vs last month') }}</span>
              </p>
            </div>
            <div class="p-3 bg-surface-green-2 rounded-xl text-ink-green-7">
              <LucideReceiptText class="size-5" />
            </div>
          </div>

          <div
            class="flex items-center justify-between p-4 rounded-xl border border-outline-base bg-surface-base hover:border-outline-gray-3 transition cursor-pointer shadow-sm"
            @click="router.push('/invoices')"
          >
            <div>
              <p class="text-xs font-medium text-ink-gray-5">{{ __('Outstanding Balance') }}</p>
              <h3 class="text-xl font-bold text-ink-gray-9 mt-1">{{ business.formatCurrency(business.totalOutstanding) }}</h3>
              <p class="text-[11px] text-ink-amber-6 mt-1">
                {{ business.invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length }} {{ __('unpaid invoices') }}
              </p>
            </div>
            <div class="p-3 bg-surface-amber-2 rounded-xl text-ink-amber-7">
              <LucideCreditCard class="size-5" />
            </div>
          </div>

          <div
            class="flex items-center justify-between p-4 rounded-xl border border-outline-base bg-surface-base hover:border-outline-gray-3 transition cursor-pointer shadow-sm"
            @click="router.push('/reminders')"
          >
            <div>
              <p class="text-xs font-medium text-ink-gray-5">{{ __('Overdue Invoices') }}</p>
              <h3 class="text-xl font-bold text-ink-red-6 mt-1">{{ business.overdueInvoicesCount }}</h3>
              <p class="text-[11px] text-ink-red-5 mt-1">
                {{ __('Requires immediate follow-up') }}
              </p>
            </div>
            <div class="p-3 bg-surface-red-2 rounded-xl text-ink-red-6">
              <LucideAlertCircle class="size-5" />
            </div>
          </div>

          <div
            class="flex items-center justify-between p-4 rounded-xl border border-outline-base bg-surface-base hover:border-outline-gray-3 transition cursor-pointer shadow-sm"
            @click="router.push('/inventory')"
          >
            <div>
              <p class="text-xs font-medium text-ink-gray-5">{{ __('Inventory Health') }}</p>
              <h3 class="text-xl font-bold text-ink-gray-9 mt-1">{{ business.products.length }} {{ __('Products') }}</h3>
              <p class="text-[11px] mt-1" :class="business.lowStockItems.length ? 'text-ink-amber-6 font-medium' : 'text-ink-green-6'">
                {{ business.lowStockItems.length ? `${business.lowStockItems.length} low stock warnings` : 'All stock optimal' }}
              </p>
            </div>
            <div class="p-3 bg-surface-blue-2 rounded-xl text-ink-blue-7">
              <LucidePackage class="size-5" />
            </div>
          </div>
        </div>
      </div>

      <DashboardGrid
        v-if="!dashboardItems.loading && dashboardItems.data"
        v-model="dashboardItems.data"
        class="pt-1"
        :editing="editing"
      />
    </div>
  </div>
  <AddChartModal
    v-if="showAddChartModal"
    v-model="showAddChartModal"
    v-model:items="dashboardItems.data"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import LucideReceiptText from '~icons/lucide/receipt-text'
import LucideCreditCard from '~icons/lucide/credit-card'
import LucidePackage from '~icons/lucide/package'
import LucideAlertCircle from '~icons/lucide/alert-circle'
import AddChartModal from '@/components/Dashboard/AddChartModal.vue'
import LucideRefreshCcw from '~icons/lucide/refresh-ccw'
import LucideUndo2 from '~icons/lucide/undo-2'
import LucidePenLine from '~icons/lucide/pen-line'
import DashboardGrid from '@/components/Dashboard/DashboardGrid.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import Link from '@/components/Controls/Link.vue'
import { usersStore } from '@/stores/users'
import { copy } from '@/utils'
import { getLastXDays, formatter, formatRange } from '@/utils/dashboard'
import {
  usePageMeta,
  createResource,
  DateRangePicker,
  Dropdown,
  Tooltip,
} from 'frappe-ui'
import { ref, reactive, computed, provide } from 'vue'

const router = useRouter()
const business = useBusinessStore()
const { users, getUser, isManager, isAdmin } = usersStore()

const editing = ref(false)

const showDatePicker = ref(false)
const datePickerRef = ref(null)
const preset = ref('Last 30 Days')
const showAddChartModal = ref(false)

const filters = reactive({
  period: getLastXDays(),
  user: null,
})

const fromDate = computed(() => {
  if (!filters.period) return null
  return filters.period.split(',')[0]
})

const toDate = computed(() => {
  if (!filters.period) return null
  return filters.period.split(',')[1]
})

function updateFilter(key: string, value: unknown, callback?: () => void) {
  filters[key] = value
  callback?.()
  dashboardItems.reload()
}

const options = computed(() => [
  {
    group: 'Presets',
    hideLabel: true,
    items: [
      {
        label: __('Last 7 Days'),
        onClick: () => {
          preset.value = 'Last 7 Days'
          filters.period = getLastXDays(7)
          dashboardItems.reload()
        },
      },
      {
        label: __('Last 30 Days'),
        onClick: () => {
          preset.value = 'Last 30 Days'
          filters.period = getLastXDays(30)
          dashboardItems.reload()
        },
      },
      {
        label: __('Last 60 Days'),
        onClick: () => {
          preset.value = 'Last 60 Days'
          filters.period = getLastXDays(60)
          dashboardItems.reload()
        },
      },
      {
        label: __('Last 90 Days'),
        onClick: () => {
          preset.value = 'Last 90 Days'
          filters.period = getLastXDays(90)
          dashboardItems.reload()
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
      filters.period = null // Reset period to allow custom date selection
    },
  },
])

const dashboardItems = createResource({
  url: 'crm.api.dashboard.get_dashboard',
  makeParams() {
    return {
      from_date: fromDate.value,
      to_date: toDate.value,
      user: filters.user,
    }
  },
  auto: true,
})

const dirty = computed(() => {
  if (!editing.value) return false
  return JSON.stringify(dashboardItems.data) !== JSON.stringify(oldItems.value)
})

const oldItems = ref([])

provide('fromDate', fromDate)
provide('toDate', toDate)
provide('filters', filters)

function enableEditing() {
  editing.value = true
  oldItems.value = copy(dashboardItems.data)
}

function cancel() {
  editing.value = false
  dashboardItems.data = copy(oldItems.value)
}

const saveDashboard = createResource({
  url: 'frappe.client.set_value',
  method: 'POST',
  onSuccess: () => {
    dashboardItems.reload()
    editing.value = false
  },
})

function save() {
  const dashboardItemsCopy = copy(dashboardItems.data)

  dashboardItemsCopy.forEach((item: Record<string, unknown>) => {
    delete item.data
  })

  saveDashboard.submit({
    doctype: 'CRM Dashboard',
    name: 'Manager Dashboard',
    fieldname: 'layout',
    value: JSON.stringify(dashboardItemsCopy),
  })
}

function resetToDefault() {
  createResource({
    url: 'crm.api.dashboard.reset_to_default',
    auto: true,
    onSuccess: () => {
      dashboardItems.reload()
      editing.value = false
    },
  })
}

usePageMeta(() => {
  return { title: __('CRM Dashboard') }
})
</script>
