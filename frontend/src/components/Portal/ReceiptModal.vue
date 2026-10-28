<template>
  <Dialog v-model:open="isOpen" size="xl" bare>
    <template #default>
      <div v-if="invoice" class="p-6 sm:p-8 bg-surface-base text-ink-gray-9 space-y-6 max-h-[85vh] overflow-y-auto">
        <!-- Receipt Header with Business Logo & Status -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between border-b border-outline-gray-1 pb-6 gap-4">
          <div>
            <img
              :src="business.settings?.logo_url || '/crestara_logo.png'"
              alt="Crestara CRM"
              class="h-10 w-auto object-contain rounded"
            />
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-2 whitespace-pre-line leading-relaxed">
              {{ business.settings.business_address || 'Official Business Address' }}
            </p>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-1">
              {{ business.settings.business_email }} | {{ business.settings.business_phone }}
            </p>
          </div>
          <div class="sm:text-right">
            <span
              class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border"
              :class="getStatusBadgeClass(invoice.status)"
            >
              {{ __(invoice.status) }}
            </span>
            <h2 class="text-xl font-bold font-mono text-ink-gray-9">{{ invoice.invoice_number }}</h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-1">
              {{ __('Issue Date:') }} {{ invoice.issue_date }}
            </p>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
              {{ __('Due Date:') }} {{ invoice.due_date }}
            </p>
          </div>
        </div>

        <!-- Billed To & Terms Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-surface-gray-1/60 dark:bg-surface-gray-1/20 border border-outline-gray-1 p-4 rounded-xl">
          <div>
            <h4 class="text-xs font-semibold uppercase text-ink-gray-7 dark:text-ink-gray-6 tracking-wider">
              {{ __('Billed To:') }}
            </h4>
            <p class="font-bold text-ink-gray-9 mt-1">{{ invoice.client_name }}</p>
            <p v-if="invoice.contact_name" class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ invoice.contact_name }}
            </p>
            <p v-if="invoice.client_email" class="text-xs text-ink-blue-7 dark:text-ink-blue-3 mt-0.5">
              {{ invoice.client_email }}
            </p>
          </div>
          <div class="sm:text-right">
            <h4 class="text-xs font-semibold uppercase text-ink-gray-7 dark:text-ink-gray-6 tracking-wider">
              {{ __('Payment Terms:') }}
            </h4>
            <p class="font-medium text-ink-gray-9 mt-1">{{ invoice.payment_terms || 'Net 30' }}</p>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Currency:') }} <span class="font-mono font-semibold">{{ invoice.currency || 'USD' }}</span>
            </p>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="border border-outline-gray-1 rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
              <tr>
                <th class="py-2.5 px-4">{{ __('Item Description') }}</th>
                <th class="py-2.5 px-4 text-center">{{ __('Qty') }}</th>
                <th class="py-2.5 px-4 text-right">{{ __('Unit Price') }}</th>
                <th class="py-2.5 px-4 text-right">{{ __('Amount') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr v-for="item in invoice.items || []" :key="item.id || item.code">
                <td class="py-3 px-4">
                  <p class="font-medium text-ink-gray-9">{{ item.name }}</p>
                  <p v-if="item.code" class="text-xs text-ink-gray-7 dark:text-ink-gray-6 font-mono">{{ item.code }}</p>
                </td>
                <td class="py-3 px-4 text-center font-mono">{{ item.quantity }}</td>
                <td class="py-3 px-4 text-right font-mono">{{ business.formatCurrency(item.unit_price, invoice.currency) }}</td>
                <td class="py-3 px-4 text-right font-mono font-medium text-ink-gray-9">{{ business.formatCurrency(item.amount, invoice.currency) }}</td>
              </tr>
              <tr v-if="!(invoice.items && invoice.items.length)">
                <td colspan="4" class="py-4 px-4 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
                  {{ __('Standard delivery and service items per commercial agreement.') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals Breakdown -->
        <div class="flex justify-end">
          <div class="w-full sm:w-80 space-y-2 text-xs sm:text-sm">
            <div class="flex justify-between text-ink-gray-7 dark:text-ink-gray-6">
              <span>{{ __('Subtotal:') }}</span>
              <span class="font-mono">{{ business.formatCurrency(invoice.subtotal || invoice.total_amount, invoice.currency) }}</span>
            </div>
            <div v-if="invoice.discount_amount > 0" class="flex justify-between text-ink-gray-7 dark:text-ink-gray-6">
              <span>{{ __('Discount ({0}%):', [invoice.discount_percentage || 0]) }}</span>
              <span class="font-mono text-ink-green-7 dark:text-ink-green-4">-{{ business.formatCurrency(invoice.discount_amount, invoice.currency) }}</span>
            </div>
            <div v-if="invoice.tax_amount > 0" class="flex justify-between text-ink-gray-7 dark:text-ink-gray-6">
              <span>{{ __('Tax ({0}%):', [invoice.tax_rate || 0]) }}</span>
              <span class="font-mono">+{{ business.formatCurrency(invoice.tax_amount, invoice.currency) }}</span>
            </div>
            <div class="border-t border-outline-gray-1 pt-2 flex justify-between font-bold text-sm sm:text-base text-ink-gray-9">
              <span>{{ __('Total:') }}</span>
              <span class="font-mono">{{ business.formatCurrency(invoice.total_amount, invoice.currency) }}</span>
            </div>
            <div class="flex justify-between text-ink-green-7 dark:text-ink-green-4 font-medium text-xs sm:text-sm">
              <span>{{ __('Amount Paid:') }}</span>
              <span class="font-mono">{{ business.formatCurrency(invoice.amount_paid, invoice.currency) }}</span>
            </div>
            <div
              class="flex justify-between font-bold text-xs sm:text-sm pt-1 border-t border-outline-gray-1/60"
              :class="invoice.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'"
            >
              <span>{{ __('Balance Due:') }}</span>
              <span class="font-mono">{{ business.formatCurrency(invoice.balance_due, invoice.currency) }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="invoice.notes" class="bg-surface-gray-1 border border-outline-gray-1 rounded-xl p-3 text-xs text-ink-gray-7 dark:text-ink-gray-6">
          <span class="font-semibold text-ink-gray-9">{{ __('Notes:') }}</span> {{ invoice.notes }}
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
          <Button variant="outline" :label="__('Close')" @click="isOpen = false" />
          <Button variant="solid" :label="__('Print / PDF Receipt')" iconLeft="lucide-printer" @click="printReceipt" />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import { Dialog, Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  invoice: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const business = useBusinessStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

function printReceipt() {
  window.print()
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
