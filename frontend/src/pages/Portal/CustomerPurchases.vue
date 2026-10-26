<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-ink-gray-9">{{ __('My Purchases & Invoices') }}</h1>
        <p class="text-sm text-ink-gray-5 mt-1">
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
            <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
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
              class="hover:bg-surface-gray-1 transition-colors"
            >
              <td class="py-4 px-6 font-semibold text-ink-gray-9">
                {{ inv.invoice_number }}
              </td>
              <td class="py-4 px-6 text-ink-gray-6">{{ inv.issue_date }}</td>
              <td class="py-4 px-6 text-ink-gray-6">{{ inv.due_date }}</td>
              <td class="py-4 px-6 font-semibold text-ink-gray-9">${{ formatNum(inv.total_amount) }}</td>
              <td class="py-4 px-6 text-ink-green-3 font-semibold">${{ formatNum(inv.amount_paid) }}</td>
              <td class="py-4 px-6 font-semibold" :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-6'">
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
              <td class="py-4 px-6 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  :label="__('View Receipt')"
                  iconLeft="file-text"
                  @click="openReceipt(inv)"
                />
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
            <span class="font-mono font-bold text-ink-gray-9 text-sm">{{ inv.invoice_number }}</span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
              :class="getStatusClass(inv.status)"
            >
              {{ __(inv.status) }}
            </span>
          </div>

          <!-- Dates & Financials Grid -->
          <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/60 p-2.5 rounded-lg">
            <div>
              <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Due Date') }}</span>
              <span class="font-medium text-ink-gray-8">{{ inv.due_date }}</span>
              <span class="text-[10px] text-ink-gray-4 block mt-0.5">Issued: {{ inv.issue_date }}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Balance Due') }}</span>
              <span
                class="font-bold text-sm block"
                :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-6'"
              >
                ${{ formatNum(inv.balance_due) }}
              </span>
              <span class="text-[10px] text-ink-green-3">Paid: ${{ formatNum(inv.amount_paid) }}</span>
            </div>
          </div>

          <!-- Bottom: View Receipt Button -->
          <div class="pt-1 flex items-center justify-end" @click.stop>
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

        <div v-if="!invoices.length" class="py-12 text-center text-ink-gray-4">
          <span class="lucide-receipt size-8 text-ink-gray-4 mx-auto block mb-2" />
          <p class="text-base font-semibold text-ink-gray-7">{{ __('No purchases or invoices found') }}</p>
          <p class="text-xs mt-1">{{ __('Invoices issued to your account will appear here.') }}</p>
        </div>
      </div>
    </div>

    <!-- Receipt / Invoice Viewer Dialog -->
    <Dialog v-model:open="showReceiptModal" :size="'xl'">
      <template #body>
        <div v-if="selectedInvoice" class="p-8 bg-surface-base text-ink-gray-9 space-y-6">
          <!-- Receipt Header with Crestara Logo -->
          <div class="flex justify-between items-start border-b border-outline-gray-1 pb-6">
            <div>
              <img src="/crestara_logo.png" alt="Crestara CRM" class="h-10 w-auto object-contain" />
              <p class="text-xs text-ink-gray-5 mt-2 whitespace-pre-line">{{ business.settings.business_address }}</p>
              <p class="text-xs text-ink-gray-5 mt-1">{{ business.settings.business_email }} | {{ business.settings.business_phone }}</p>
            </div>
            <div class="text-right">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2" :class="getStatusClass(selectedInvoice.status)">
                {{ selectedInvoice.status }}
              </span>
              <h2 class="text-xl font-bold text-ink-gray-9">{{ selectedInvoice.invoice_number }}</h2>
              <p class="text-xs text-ink-gray-5 mt-1">{{ __('Date:') }} {{ selectedInvoice.issue_date }}</p>
              <p class="text-xs text-ink-gray-5">{{ __('Due Date:') }} {{ selectedInvoice.due_date }}</p>
            </div>
          </div>

          <!-- Billed To -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 class="text-xs font-semibold uppercase text-ink-gray-4 tracking-wider">{{ __('Billed To:') }}</h4>
              <p class="font-bold text-ink-gray-9 mt-1">{{ selectedInvoice.client_name }}</p>
              <p class="text-ink-gray-6">{{ selectedInvoice.contact_name }}</p>
              <p class="text-ink-gray-6">{{ selectedInvoice.client_email }}</p>
            </div>
            <div class="text-right">
              <h4 class="text-xs font-semibold uppercase text-ink-gray-4 tracking-wider">{{ __('Payment Terms:') }}</h4>
              <p class="font-medium text-ink-gray-8 mt-1">{{ selectedInvoice.payment_terms }}</p>
            </div>
          </div>

          <!-- Line Items Table -->
          <div class="border border-outline-gray-1 rounded-lg overflow-hidden">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
                <tr>
                  <th class="py-2.5 px-4">{{ __('Item Description') }}</th>
                  <th class="py-2.5 px-4 text-center">{{ __('Qty') }}</th>
                  <th class="py-2.5 px-4 text-right">{{ __('Unit Price') }}</th>
                  <th class="py-2.5 px-4 text-right">{{ __('Amount') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="item in selectedInvoice.items" :key="item.id">
                  <td class="py-3 px-4">
                    <p class="font-medium text-ink-gray-9">{{ item.name }}</p>
                    <p class="text-xs text-ink-gray-5 font-mono">{{ item.code }}</p>
                  </td>
                  <td class="py-3 px-4 text-center">{{ item.quantity }}</td>
                  <td class="py-3 px-4 text-right">${{ formatNum(item.unit_price) }}</td>
                  <td class="py-3 px-4 text-right font-medium">${{ formatNum(item.amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Totals Breakdown -->
          <div class="flex justify-end">
            <div class="w-72 space-y-2 text-sm">
              <div class="flex justify-between text-ink-gray-6">
                <span>{{ __('Subtotal:') }}</span>
                <span>${{ formatNum(selectedInvoice.subtotal) }}</span>
              </div>
              <div v-if="selectedInvoice.discount_amount > 0" class="flex justify-between text-ink-gray-6">
                <span>{{ __('Discount ({0}%):', [selectedInvoice.discount_percentage]) }}</span>
                <span>-${{ formatNum(selectedInvoice.discount_amount) }}</span>
              </div>
              <div class="flex justify-between text-ink-gray-6">
                <span>{{ __('Tax ({0}%):', [selectedInvoice.tax_rate]) }}</span>
                <span>+${{ formatNum(selectedInvoice.tax_amount) }}</span>
              </div>
              <div class="border-t border-outline-gray-1 pt-2 flex justify-between font-bold text-base text-ink-gray-9">
                <span>{{ __('Total:') }}</span>
                <span>${{ formatNum(selectedInvoice.total_amount) }}</span>
              </div>
              <div class="flex justify-between text-ink-green-3 font-medium">
                <span>{{ __('Amount Paid:') }}</span>
                <span>${{ formatNum(selectedInvoice.amount_paid) }}</span>
              </div>
              <div class="flex justify-between font-bold" :class="selectedInvoice.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-6'">
                <span>{{ __('Balance Due:') }}</span>
                <span>${{ formatNum(selectedInvoice.balance_due) }}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="selectedInvoice.notes" class="bg-surface-gray-1 rounded-lg p-3 text-xs text-ink-gray-6">
            <span class="font-semibold text-ink-gray-8">{{ __('Notes:') }}</span> {{ selectedInvoice.notes }}
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button variant="outline" :label="__('Close')" @click="showReceiptModal = false" />
            <Button variant="solid" :label="__('Print / PDF Receipt')" iconLeft="printer" @click="printReceipt" />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBusinessStore } from '@/stores/business'
import { Button, Dialog } from 'frappe-ui'

const business = useBusinessStore()
const showReceiptModal = ref(false)
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

function printReceipt() {
  window.print()
}

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
