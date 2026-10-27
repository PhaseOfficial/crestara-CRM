<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-ink-gray-9 tracking-tight">{{ __('My Purchases & Invoices') }}</h1>
        <p class="text-xs sm:text-sm text-ink-gray-7 dark:text-ink-gray-6 mt-1">
          {{ __('View your invoice history, payment records, item breakdowns, and download official receipts.') }}
        </p>
      </div>
    </div>

    <!-- Invoices List & Mobile Adaptive Cards -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
      <!-- Desktop Table (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
              <th class="py-3 px-6">{{ __('Invoice Number') }}</th>
              <th class="py-3 px-6">{{ __('Issue Date') }}</th>
              <th class="py-3 px-6">{{ __('Due Date') }}</th>
              <th class="py-3 px-6">{{ __('Total') }}</th>
              <th class="py-3 px-6">{{ __('Paid') }}</th>
              <th class="py-3 px-6">{{ __('Balance') }}</th>
              <th class="py-3 px-6">{{ __('Status') }}</th>
              <th class="py-3 px-6 text-right">{{ __('Action') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-gray-1">
            <tr
              v-for="inv in invoices"
              :key="inv.id"
              class="hover:bg-surface-gray-1 transition-colors cursor-pointer"
              @click="openReceipt(inv)"
            >
              <td class="py-4 px-6 font-mono font-bold text-ink-blue-7 dark:text-ink-blue-3">
                {{ inv.invoice_number }}
              </td>
              <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">{{ inv.issue_date }}</td>
              <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">{{ inv.due_date }}</td>
              <td class="py-4 px-6 font-mono font-semibold text-ink-gray-9">
                {{ business.formatCurrency(inv.total_amount, inv.currency) }}
              </td>
              <td class="py-4 px-6 font-mono font-semibold text-ink-green-7 dark:text-ink-green-4">
                {{ business.formatCurrency(inv.amount_paid, inv.currency) }}
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
                <div class="flex items-center justify-end gap-1.5">
                  <Button
                    v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                    size="xs"
                    variant="solid"
                    theme="green"
                    :label="__('Pay Now')"
                    iconLeft="credit-card"
                    @click="openPaymentModal(inv)"
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    :label="__('View Receipt')"
                    iconLeft="file-text"
                    @click="openReceipt(inv)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!invoices.length">
              <td colspan="8" class="py-8 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
                {{ __('No purchases or invoices found.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Adaptive Cards View (< 768px) -->
      <div class="md:hidden divide-y divide-outline-gray-1">
        <div
          v-for="inv in invoices"
          :key="inv.id"
          class="p-4 hover:bg-surface-gray-1 transition-colors space-y-3 cursor-pointer"
          @click="openReceipt(inv)"
        >
          <!-- Top: Invoice Number + Status Badge -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="size-9 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0">
                <span class="lucide-receipt size-4" />
              </div>
              <div class="min-w-0">
                <span class="font-mono font-bold text-ink-gray-9 text-sm block truncate">{{ inv.invoice_number }}</span>
                <span class="text-xs text-ink-gray-7 dark:text-ink-gray-6 truncate block">{{ inv.issue_date }}</span>
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

          <!-- Dates & Financials Grid -->
          <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
            <div>
              <span class="text-[10px] uppercase font-semibold text-ink-gray-7 dark:text-ink-gray-6 block">{{ __('Due Date') }}</span>
              <span class="font-medium text-ink-gray-9">{{ inv.due_date }}</span>
              <span class="text-[11px] text-ink-gray-7 dark:text-ink-gray-6 block mt-0.5 font-mono">
                Total: {{ business.formatCurrency(inv.total_amount, inv.currency) }}
              </span>
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

          <!-- Bottom: View Receipt / Pay Button -->
          <div class="pt-1 flex items-center justify-end gap-2" @click.stop>
            <Button
              v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
              size="sm"
              variant="solid"
              theme="green"
              iconLeft="credit-card"
              :label="__('Pay Now')"
              @click="openPaymentModal(inv)"
            />
            <Button
              size="sm"
              variant="outline"
              iconLeft="file-text"
              :label="__('View Receipt')"
              @click="openReceipt(inv)"
            />
          </div>
        </div>

        <div v-if="!invoices.length" class="py-12 text-center text-ink-gray-5 dark:text-ink-gray-4">
          <span class="lucide-receipt size-8 text-ink-gray-4 mx-auto block mb-2" />
          <p class="text-base font-semibold text-ink-gray-8 dark:text-ink-gray-2">{{ __('No purchases or invoices found') }}</p>
          <p class="text-xs text-ink-gray-6 dark:text-ink-gray-5 mt-1">{{ __('Invoices issued to your account will appear here.') }}</p>
        </div>
      </div>
    </div>

    <!-- Receipt / Invoice Viewer Dialog -->
    <ReceiptModal
      v-model="showReceiptModal"
      :invoice="selectedInvoice"
      @payRequested="openPaymentModal"
    />

    <!-- Record Payment Modal Component -->
    <RecordPaymentModal
      v-model="showPaymentModal"
      :invoice="selectedInvoice"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBusinessStore } from '@/stores/business'
import { Button } from 'frappe-ui'
import ReceiptModal from '@/components/Portal/ReceiptModal.vue'
import RecordPaymentModal from '@/components/Invoices/RecordPaymentModal.vue'

const business = useBusinessStore()
const showReceiptModal = ref(false)
const showPaymentModal = ref(false)
const selectedInvoice = ref(null)

const invoices = computed(() => {
  const currentEmail = business.currentUser?.email?.toLowerCase()
  if (currentEmail) {
    const matching = business.invoices.filter(
      (i) => i.status !== 'Draft' && i.client_email?.toLowerCase() === currentEmail
    )
    if (matching.length > 0) return matching
  }
  return business.invoices.filter((i) => i.status !== 'Draft')
})

function openReceipt(inv) {
  selectedInvoice.value = inv
  showReceiptModal.value = true
}

function openPaymentModal(inv) {
  selectedInvoice.value = inv || selectedInvoice.value
  showPaymentModal.value = true
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Paid':
      return 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 font-semibold'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border-outline-red-2'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border-outline-blue-2'
    case 'Partially paid':
    case 'Partially Paid':
      return 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2 font-semibold'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-5 dark:text-ink-gray-4 border-outline-gray-2'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'
  }
}
</script>
