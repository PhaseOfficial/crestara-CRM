<template>
  <div class="flex flex-col h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Transactions') }}</h1>
          <span class="text-xs px-2 py-0.5 rounded-full bg-surface-gray-2 text-ink-gray-6 font-semibold">
            {{ filteredTransactions.length }}
          </span>
        </div>
      </template>
      <template #right-header>
        <div class="text-xs text-ink-gray-5">
          {{ __('Total Settled:') }}
          <strong class="text-sm font-bold text-ink-gray-9 ml-1">{{ business.formatCurrency(business.totalRevenue) }}</strong>
        </div>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <select
            v-model="selectedMethod"
            class="bg-surface-gray-1 border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-gray-9 focus:outline-none"
          >
            <option value="All">{{ __('All Payment Methods') }}</option>
            <option value="Credit Card">{{ __('Credit Card') }}</option>
            <option value="Stripe">{{ __('Stripe') }}</option>
            <option value="Bank Wire Transfer">{{ __('Bank Wire Transfer') }}</option>
          </select>
        </div>

        <div class="w-full sm:w-64">
          <TextInput
            v-model="searchQuery"
            type="search"
            :placeholder="__('Search transaction or client...')"
            iconLeft="search"
          />
        </div>
      </div>

      <!-- Transactions Ledger Table & Mobile Adaptive Cards -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
        <!-- Desktop Table (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-6">{{ __('Transaction Ref') }}</th>
                <th class="py-3 px-6">{{ __('Client') }}</th>
                <th class="py-3 px-6">{{ __('Related Invoice') }}</th>
                <th class="py-3 px-6">{{ __('Payment Date') }}</th>
                <th class="py-3 px-6">{{ __('Method') }}</th>
                <th class="py-3 px-6">{{ __('Amount') }}</th>
                <th class="py-3 px-6">{{ __('Status') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Receipt') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="tx in filteredTransactions"
                :key="tx.id"
                class="hover:bg-surface-gray-1 transition-colors"
              >
                <td class="py-4 px-6 font-mono font-semibold text-ink-gray-9">
                  {{ tx.transaction_ref }}
                </td>
                <td class="py-4 px-6 font-medium text-ink-gray-9">
                  {{ tx.client_name }}
                </td>
                <td class="py-4 px-6 text-ink-blue-3 font-medium">
                  <router-link :to="`/invoices/${tx.invoice_id}`" class="hover:underline">
                    {{ tx.invoice_number }}
                  </router-link>
                </td>
                <td class="py-4 px-6 text-ink-gray-6">{{ tx.payment_date }}</td>
                <td class="py-4 px-6 text-ink-gray-7">{{ tx.payment_method }}</td>
                <td class="py-4 px-6 font-bold text-ink-green-3">
                  +{{ business.formatCurrency(tx.amount, tx.currency) }}
                </td>
                <td class="py-4 px-6">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-green-2 text-ink-green-7 border border-outline-green-2">
                    {{ __(tx.status) }}
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    iconLeft="file-text"
                    :label="__('View')"
                    @click="viewReceipt(tx)"
                  />
                </td>
              </tr>
              <tr v-if="!filteredTransactions.length">
                <td colspan="8" class="py-12 text-center text-ink-gray-4">
                  <p class="text-base font-semibold text-ink-gray-7">{{ __('No transactions found') }}</p>
                  <p class="text-xs mt-1">{{ __('Payment transactions will be listed here once recorded.') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="tx in filteredTransactions"
            :key="tx.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors space-y-3"
          >
            <!-- Top: Ref + Status Pill -->
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono font-bold text-ink-gray-9 text-xs">{{ tx.transaction_ref }}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-green-2 text-ink-green-7 border border-outline-green-2">
                {{ __(tx.status) }}
              </span>
            </div>

            <!-- Client & Linked Invoice -->
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="font-semibold text-ink-gray-9 text-sm">{{ tx.client_name }}</div>
                <div class="text-xs text-ink-gray-5 mt-0.5">
                  {{ __('Invoice:') }}
                  <router-link :to="`/invoices/${tx.invoice_id}`" class="text-ink-blue-6 hover:underline font-medium">
                    {{ tx.invoice_number }}
                  </router-link>
                </div>
              </div>

              <div class="text-right">
                <span class="font-bold text-sm text-ink-green-3 block">
                  +{{ business.formatCurrency(tx.amount, tx.currency) }}
                </span>
                <span class="text-[10px] text-ink-gray-4">{{ tx.payment_method }}</span>
              </div>
            </div>

            <!-- Footer: Date & View Receipt Button -->
            <div class="flex items-center justify-between pt-1 border-t border-outline-gray-1/40 text-xs text-ink-gray-5">
              <span>{{ tx.payment_date }}</span>
              <Button
                size="sm"
                variant="outline"
                iconLeft="file-text"
                :label="__('View Receipt')"
                @click="viewReceipt(tx)"
              />
            </div>
          </div>

          <div v-if="!filteredTransactions.length" class="py-12 text-center text-ink-gray-4">
            <span class="lucide-credit-card size-8 text-ink-gray-4 mx-auto block mb-2" />
            <p class="text-base font-semibold text-ink-gray-7">{{ __('No transactions found') }}</p>
            <p class="text-xs mt-1">{{ __('Payment transactions will be listed here once recorded.') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Official Commercial Receipt Modal -->
    <CommercialReceiptModal
      v-model="showReceiptModal"
      :invoice="activeInvoice"
      :payment="activeTx"
      @emailRequested="onEmailRequested"
    />

    <!-- Email Receipt Modal -->
    <EmailInvoiceModal
      v-model="showEmailModal"
      :invoice="activeInvoice"
      :payment="activeTx"
      :isReceipt="true"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import CommercialReceiptModal from '@/components/Common/CommercialReceiptModal.vue'
import EmailInvoiceModal from '@/components/Invoices/EmailInvoiceModal.vue'
import { Button, TextInput } from 'frappe-ui'

const business = useBusinessStore()
const searchQuery = ref('')
const selectedMethod = ref('All')
const showReceiptModal = ref(false)
const showEmailModal = ref(false)
const activeTx = ref(null)

const activeInvoice = computed(() => {
  if (!activeTx.value) return null
  return business.invoices.find(
    (i) => i.id === activeTx.value.invoice_id || i.invoice_number === activeTx.value.invoice_number,
  ) || null
})

function onEmailRequested() {
  showEmailModal.value = true
}

const filteredTransactions = computed(() => {
  return business.transactions.filter((tx) => {
    if (selectedMethod.value !== 'All' && !tx.payment_method?.includes(selectedMethod.value)) {
      return false
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchRef = tx.transaction_ref?.toLowerCase().includes(q)
      const matchClient = tx.client_name?.toLowerCase().includes(q)
      const matchInv = tx.invoice_number?.toLowerCase().includes(q)
      return matchRef || matchClient || matchInv
    }
    return true
  })
})

function viewReceipt(tx) {
  activeTx.value = tx
  showReceiptModal.value = true
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>
