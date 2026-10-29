<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-ink-gray-9 tracking-tight">
          {{ __('Welcome back, {0}!', [business.currentUser.full_name]) }}
        </h1>
        <p class="text-xs sm:text-sm text-ink-gray-7 dark:text-ink-gray-6 mt-1">
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
      <!-- Outstanding Balance -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('Outstanding Balance') }}
          </span>
          <span class="lucide-wallet size-4 text-ink-gray-5 dark:text-ink-gray-4" />
        </div>
        <div
          class="text-2xl font-bold font-mono"
          :class="customerBalance > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'"
        >
          {{ business.formatCurrency(customerBalance) }}
        </div>
        <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
          {{ customerBalance > 0 ? __('Payment pending') : __('All invoices settled') }}
        </p>
      </div>

      <!-- Total Purchases -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('Total Purchases') }}
          </span>
          <span class="lucide-receipt size-4 text-ink-gray-5 dark:text-ink-gray-4" />
        </div>
        <div class="text-2xl font-bold font-mono text-ink-gray-9">
          {{ business.formatCurrency(customerTotalPurchases) }}
        </div>
        <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
          {{ __('Across {0} invoices', [customerInvoices.length]) }}
        </p>
      </div>

      <!-- Active Subscriptions -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('Active Subscriptions') }}
          </span>
          <span class="lucide-repeat size-4 text-ink-gray-5 dark:text-ink-gray-4" />
        </div>
        <div class="text-2xl font-bold font-mono text-ink-gray-9">
          1
        </div>
        <p class="text-xs text-ink-green-7 dark:text-ink-green-4 font-medium">
          {{ __('Next renewal Nov 15, 2026') }}
        </p>
      </div>

      <!-- Active Promotions -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('Active Promotions') }}
          </span>
          <span class="lucide-tag size-4 text-ink-gray-5 dark:text-ink-gray-4" />
        </div>
        <div class="text-2xl font-bold font-mono text-ink-gray-9">
          {{ business.promotions.length }}
        </div>
        <router-link to="/portal/promotions" class="text-xs text-ink-blue-7 dark:text-ink-blue-3 hover:underline block font-medium">
          {{ __('View available discounts →') }}
        </router-link>
      </div>
    </div>

    <!-- Recent Invoices Table (Desktop Table + Mobile Adaptive Cards) -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-outline-gray-1 flex items-center justify-between">
        <h2 class="text-base font-bold text-ink-gray-9">{{ __('Recent Invoices') }}</h2>
        <router-link
          to="/portal/purchases"
          class="text-xs font-semibold text-ink-blue-7 dark:text-ink-blue-3 hover:underline"
        >
          {{ __('See all ({0})', [customerInvoices.length]) }}
        </router-link>
      </div>

      <!-- Desktop View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
              <th class="py-3 px-6">{{ __('Invoice #') }}</th>
              <th class="py-3 px-6">{{ __('Issue Date') }}</th>
              <th class="py-3 px-6">{{ __('Due Date') }}</th>
              <th class="py-3 px-6">{{ __('Amount') }}</th>
              <th class="py-3 px-6">{{ __('Balance') }}</th>
              <th class="py-3 px-6">{{ __('Status') }}</th>
              <th class="py-3 px-6 text-right">{{ __('Action') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-gray-1">
            <tr
              v-for="inv in customerInvoices.slice(0, 5)"
              :key="inv.id"
              class="hover:bg-surface-gray-1 transition-colors cursor-pointer"
              @click="openReceipt(inv)"
            >
              <td class="py-4 px-6 font-mono font-bold text-ink-blue-7 dark:text-ink-blue-3">
                {{ inv.invoice_number }}
              </td>
              <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">
                {{ inv.issue_date }}
              </td>
              <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">
                {{ inv.due_date }}
              </td>
              <td class="py-4 px-6 font-mono font-semibold text-ink-gray-9">
                {{ business.formatCurrency(inv.total_amount, inv.currency) }}
              </td>
              <td
                class="py-4 px-6 font-mono font-semibold"
                :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'"
              >
                {{ business.formatCurrency(inv.balance_due, inv.currency) }}
              </td>
              <td class="py-4 px-6">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  :class="getStatusBadgeClass(inv.status)"
                >
                  {{ __(inv.status) }}
                </span>
              </td>
              <td class="py-4 px-6 text-right" @click.stop>
                <Button
                  size="xs"
                  variant="outline"
                  iconLeft="file-text"
                  :label="__('View')"
                  @click="openReceipt(inv)"
                />
              </td>
            </tr>
            <tr v-if="!customerInvoices.length">
              <td colspan="7" class="py-8 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
                {{ __('No invoices issued yet.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Adaptive Cards (< 768px) -->
      <div class="md:hidden divide-y divide-outline-gray-1">
        <div
          v-for="inv in customerInvoices.slice(0, 5)"
          :key="inv.id"
          class="p-4 hover:bg-surface-gray-1 transition-colors cursor-pointer space-y-3"
          @click="openReceipt(inv)"
        >
          <!-- Top Row: Entity, Status & Chevron -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="size-9 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0">
                <span class="lucide-receipt size-4" />
              </div>
              <div class="min-w-0">
                <div class="font-mono font-bold text-ink-gray-9 text-sm truncate">{{ inv.invoice_number }}</div>
                <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 truncate">{{ inv.issue_date }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                :class="getStatusBadgeClass(inv.status)"
              >
                {{ __(inv.status) }}
              </span>
              <span class="lucide-chevron-right size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            </div>
          </div>

          <!-- 2-Column Data Grid -->
          <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
            <div>
              <span class="text-[10px] uppercase font-semibold text-ink-gray-7 dark:text-ink-gray-6 block">{{ __('Due Date') }}</span>
              <span class="font-medium text-ink-gray-9">{{ inv.due_date }}</span>
              <div class="text-[11px] text-ink-gray-7 dark:text-ink-gray-6 mt-0.5 font-mono">
                Total: {{ business.formatCurrency(inv.total_amount, inv.currency) }}
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] uppercase font-semibold text-ink-gray-7 dark:text-ink-gray-6 block">{{ __('Balance Due') }}</span>
              <span
                class="font-mono font-bold text-sm block"
                :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'"
              >
                {{ business.formatCurrency(inv.balance_due, inv.currency) }}
              </span>
              <span class="text-[10px] text-ink-green-7 dark:text-ink-green-4 font-mono">
                Paid: {{ business.formatCurrency(inv.amount_paid, inv.currency) }}
              </span>
            </div>
          </div>

          <!-- Mobile Quick Action Footer -->
          <div class="pt-1 flex items-center justify-end gap-2 border-t border-outline-gray-1/40" @click.stop>
            <Button
              size="sm"
              variant="outline"
              iconLeft="file-text"
              :label="__('View Receipt / Invoice')"
              class="w-full sm:w-auto"
              @click="openReceipt(inv)"
            />
          </div>
        </div>

        <div v-if="!customerInvoices.length" class="py-12 text-center text-ink-gray-5 dark:text-ink-gray-4">
          <span class="lucide-receipt size-8 text-ink-gray-4 mx-auto block mb-2" />
          <p class="text-base font-semibold text-ink-gray-8 dark:text-ink-gray-2">{{ __('No invoices issued yet') }}</p>
          <p class="text-xs text-ink-gray-6 dark:text-ink-gray-5 mt-1">{{ __('Official invoices will appear here once issued.') }}</p>
        </div>
      </div>
    </div>

    <!-- Receipt / Invoice Viewer Dialog -->
    <ReceiptModal
      v-model="showReceiptModal"
      :invoice="selectedInvoice"
    />

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
import ReceiptModal from '@/components/Portal/ReceiptModal.vue'

const business = useBusinessStore()
const showGuideModal = ref(false)
const showReceiptModal = ref(false)
const selectedInvoice = ref(null)

const customerInvoices = computed(() => {
  const currentEmail = business.currentUser?.email?.toLowerCase()
  if (!currentEmail) return []
  return business.invoices.filter(
    (inv) => inv.status !== 'Draft' && inv.client_email?.toLowerCase() === currentEmail
  )
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

function openReceipt(inv) {
  selectedInvoice.value = inv
  showReceiptModal.value = true
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Paid':
      return 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border-outline-red-2'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border-outline-blue-2'
    case 'Partially paid':
    case 'Partially Paid':
      return 'bg-surface-amber-2 text-ink-amber-7 dark:text-ink-amber-4 border-outline-amber-2'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-5 dark:text-ink-gray-4 border-outline-gray-2'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'
  }
}
</script>
