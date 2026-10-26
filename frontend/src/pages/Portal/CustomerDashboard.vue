<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-ink-gray-9">
          {{ __('Welcome back, {0}!', [business.currentUser.full_name]) }}
        </h1>
        <p class="text-sm text-ink-gray-5 mt-1">
          {{ __('Manage your purchases, invoices, upcoming renewals, and account settings.') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <router-link to="/portal/purchases">
          <Button variant="solid" :label="__('View Invoices & Receipts')" iconLeft="receipt" />
        </router-link>
      </div>
    </div>

    <!-- Guided Onboarding / Getting Started Banner -->
    <CustomerGettingStartedBanner
      @open-guide="showGuideModal = true"
    />

    <!-- Quick Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Outstanding Balance') }}</span>
          <span class="lucide-wallet size-5 text-amber-500" />
        </div>
        <div class="mt-3 text-2xl font-bold text-ink-gray-9">
          ${{ formatNum(customerBalance) }}
        </div>
        <p class="text-xs text-ink-gray-4 mt-1">
          {{ customerBalance > 0 ? __('Payment pending') : __('All invoices settled') }}
        </p>
      </div>

      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Total Purchases') }}</span>
          <span class="lucide-receipt size-5 text-blue-500" />
        </div>
        <div class="mt-3 text-2xl font-bold text-ink-gray-9">
          ${{ formatNum(customerTotalPurchases) }}
        </div>
        <p class="text-xs text-ink-gray-4 mt-1">
          {{ __('Across {0} invoices', [customerInvoices.length]) }}
        </p>
      </div>

      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Active Subscriptions') }}</span>
          <span class="lucide-repeat size-5 text-emerald-500" />
        </div>
        <div class="mt-3 text-2xl font-bold text-ink-gray-9">
          1
        </div>
        <p class="text-xs text-ink-green-6 mt-1">
          {{ __('Next renewal Nov 15, 2026') }}
        </p>
      </div>

      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Active Promotions') }}</span>
          <span class="lucide-tag size-5 text-purple-500" />
        </div>
        <div class="mt-3 text-2xl font-bold text-ink-gray-9">
          {{ business.promotions.length }}
        </div>
        <router-link to="/portal/promotions" class="text-xs text-ink-blue-6 hover:underline mt-1 block">
          {{ __('View available discounts →') }}
        </router-link>
      </div>
    </div>

    <!-- Recent Invoices Table -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-outline-gray-1 flex items-center justify-between">
        <h2 class="text-base font-bold text-ink-gray-9">{{ __('Recent Invoices') }}</h2>
        <router-link to="/portal/purchases" class="text-sm font-medium text-blue-600 hover:text-blue-800">
          {{ __('See all ({0})', [customerInvoices.length]) }}
        </router-link>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
              <th class="py-3 px-6">{{ __('Invoice #') }}</th>
              <th class="py-3 px-6">{{ __('Date') }}</th>
              <th class="py-3 px-6">{{ __('Due Date') }}</th>
              <th class="py-3 px-6">{{ __('Amount') }}</th>
              <th class="py-3 px-6">{{ __('Balance') }}</th>
              <th class="py-3 px-6">{{ __('Status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-gray-1">
            <tr
              v-for="inv in customerInvoices.slice(0, 5)"
              :key="inv.id"
              class="hover:bg-surface-gray-1 transition-colors"
            >
              <td class="py-4 px-6 font-semibold text-ink-gray-9">
                {{ inv.invoice_number }}
              </td>
              <td class="py-4 px-6 text-ink-gray-6">
                {{ inv.issue_date }}
              </td>
              <td class="py-4 px-6 text-ink-gray-6">
                {{ inv.due_date }}
              </td>
              <td class="py-4 px-6 font-medium text-ink-gray-9">
                ${{ formatNum(inv.total_amount) }}
              </td>
              <td class="py-4 px-6 font-medium" :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-6'">
                ${{ formatNum(inv.balance_due) }}
              </td>
              <td class="py-4 px-6">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="getStatusClass(inv.status)"
                >
                  {{ __(inv.status) }}
                </span>
              </td>
            </tr>
            <tr v-if="!customerInvoices.length">
              <td colspan="6" class="py-8 text-center text-ink-gray-4">
                {{ __('No invoices issued yet.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Interactive Guide Modal -->
    <CustomerGuideModal
      v-model="showGuideModal"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBusinessStore } from '@/stores/business'
import { Button } from 'frappe-ui'
import CustomerGettingStartedBanner from '@/components/Portal/CustomerGettingStartedBanner.vue'
import CustomerGuideModal from '@/components/Modals/CustomerGuideModal.vue'

const business = useBusinessStore()
const showGuideModal = ref(false)

const customerInvoices = computed(() => {
  const currentEmail = business.currentUser?.email?.toLowerCase()
  if (currentEmail) {
    const matching = business.invoices.filter(
      (inv) => inv.status !== 'Draft' && inv.client_email?.toLowerCase() === currentEmail
    )
    if (matching.length > 0) return matching
  }
  return business.invoices.filter((inv) => inv.status !== 'Draft')
})

const customerBalance = computed(() => {
  return customerInvoices.value
    .filter((inv) => inv.status !== 'Cancelled')
    .reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0)
})

const customerTotalPurchases = computed(() => {
  return customerInvoices.value
    .filter((inv) => inv.status !== 'Cancelled')
    .reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0)
})

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getStatusClass(status) {
  switch (status) {
    case 'Paid':
      return 'bg-surface-green-2 text-ink-green-7'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7'
    case 'Partially paid':
      return 'bg-surface-amber-2 text-ink-amber-7'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7'
  }
}
</script>
