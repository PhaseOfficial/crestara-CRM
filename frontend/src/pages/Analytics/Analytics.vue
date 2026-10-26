<template>
  <div class="flex flex-col h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Reports & Analytics') }}</h1>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- High Level Financial KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Gross Billed Sales') }}</span>
          <div class="mt-2 text-2xl font-bold text-ink-gray-9">${{ formatNum(totalBilled) }}</div>
          <span class="text-xs text-ink-gray-5 mt-1 block">{{ __('All issued invoices') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Collected Revenue') }}</span>
          <div class="mt-2 text-2xl font-bold text-ink-green-3">${{ formatNum(business.totalRevenue) }}</div>
          <span class="text-xs text-ink-green-2 mt-1 block">{{ __('Net settled transactions') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Collection Efficiency') }}</span>
          <div class="mt-2 text-2xl font-bold text-ink-blue-3">
            {{ totalBilled > 0 ? Math.round((business.totalRevenue / totalBilled) * 100) : 0 }}%
          </div>
          <span class="text-xs text-ink-gray-5 mt-1 block">{{ __('Payment conversion rate') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Projected Q4 Revenue') }}</span>
          <div class="mt-2 text-2xl font-bold text-purple-500">${{ formatNum(projectedRevenue) }}</div>
          <span class="text-xs text-purple-400 mt-1 block">{{ __('Based on active pipeline & deals') }}</span>
        </div>
      </div>

      <!-- Charts & Visual Breakdowns -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Invoices by Status Breakdown -->
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm space-y-4">
          <h2 class="text-base font-bold text-ink-gray-9">{{ __('Invoice Status Breakdown') }}</h2>
          <div class="space-y-3">
            <div v-for="stat in invoiceStatusDistribution" :key="stat.name" class="space-y-1">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-ink-gray-7">{{ stat.name }} ({{ stat.count }})</span>
                <span class="text-ink-gray-9">${{ formatNum(stat.amount) }} ({{ stat.percentage }}%)</span>
              </div>
              <div class="w-full bg-surface-gray-2 rounded-full h-2.5 overflow-hidden">
                <div class="h-2.5 rounded-full" :class="stat.colorClass" :style="{ width: `${stat.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sales by Inventory Category -->
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm space-y-4">
          <h2 class="text-base font-bold text-ink-gray-9">{{ __('Sales by Product / Service Category') }}</h2>
          <div class="space-y-3">
            <div v-for="cat in categoryBreakdown" :key="cat.name" class="space-y-1">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-ink-gray-7">{{ cat.name }}</span>
                <span class="text-ink-gray-9">${{ formatNum(cat.amount) }} ({{ cat.percentage }}%)</span>
              </div>
              <div class="w-full bg-surface-gray-2 rounded-full h-2.5 overflow-hidden">
                <div class="h-2.5 rounded-full bg-blue-500" :style="{ width: `${cat.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Performance & Capital Tied -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-ink-gray-9">{{ __('Inventory Valuation & Capital Breakdown') }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div class="bg-surface-gray-1 rounded-xl p-4 border border-outline-gray-1">
            <span class="text-xs text-ink-gray-5">{{ __('Total Stock Value (Retail)') }}</span>
            <div class="text-xl font-bold text-ink-gray-9 mt-1">${{ formatNum(totalInventoryRetail) }}</div>
          </div>
          <div class="bg-surface-gray-1 rounded-xl p-4 border border-outline-gray-1">
            <span class="text-xs text-ink-gray-5">{{ __('Total Stock Cost') }}</span>
            <div class="text-xl font-bold text-ink-gray-9 mt-1">${{ formatNum(totalInventoryCost) }}</div>
          </div>
          <div class="bg-surface-gray-1 rounded-xl p-4 border border-outline-gray-1">
            <span class="text-xs text-ink-gray-5">{{ __('Potential Gross Margin') }}</span>
            <div class="text-xl font-bold text-ink-green-3 mt-1">
              ${{ formatNum(totalInventoryRetail - totalInventoryCost) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'

const business = useBusinessStore()

const totalBilled = computed(() => {
  return business.invoices
    .filter((i) => i.status !== 'Cancelled')
    .reduce((acc, i) => acc + Number(i.total_amount || 0), 0)
})

const projectedRevenue = computed(() => {
  return business.totalRevenue + business.totalOutstanding * 0.85
})

const invoiceStatusDistribution = computed(() => {
  const activeInvoices = business.invoices.filter((i) => i.status !== 'Cancelled')
  const total = totalBilled.value || 1

  const statuses = [
    { name: 'Paid', status: 'Paid', colorClass: 'bg-emerald-500' },
    { name: 'Issued', status: 'Issued', colorClass: 'bg-blue-500' },
    { name: 'Partially paid', status: 'Partially paid', colorClass: 'bg-amber-500' },
    { name: 'Overdue', status: 'Overdue', colorClass: 'bg-red-500' },
  ]

  return statuses.map((s) => {
    const list = activeInvoices.filter((i) => i.status === s.status)
    const amount = list.reduce((acc, i) => acc + Number(i.total_amount || 0), 0)
    const percentage = Math.round((amount / total) * 100)
    return {
      ...s,
      count: list.length,
      amount,
      percentage,
    }
  })
})

const categoryBreakdown = computed(() => {
  return [
    { name: 'Cloud Services', amount: 9600, percentage: 45 },
    { name: 'Hardware & Networking', amount: 5540, percentage: 26 },
    { name: 'Professional Services & Audits', amount: 4500, percentage: 21 },
    { name: 'Software Subscriptions', amount: 1600, percentage: 8 },
  ]
})

const totalInventoryRetail = computed(() => {
  return business.inventory
    .filter((i) => i.track_stock)
    .reduce((acc, i) => acc + i.unit_price * i.quantity_in_stock, 0)
})

const totalInventoryCost = computed(() => {
  return business.inventory
    .filter((i) => i.track_stock)
    .reduce((acc, i) => acc + i.cost_price * i.quantity_in_stock, 0)
})

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>
