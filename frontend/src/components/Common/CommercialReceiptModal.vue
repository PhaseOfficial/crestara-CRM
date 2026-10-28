<template>
  <Dialog v-model:open="show" size="lg" bare>
    <template #default>
      <div class="bg-surface-base rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Receipt Top Bar -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-outline-gray-1 bg-surface-gray-1 dark:bg-surface-gray-2/70">
          <div class="flex items-center gap-2">
            <span class="lucide-receipt size-5 text-ink-green-7 dark:text-ink-green-4" />
            <h2 class="text-base font-bold text-ink-gray-9">
              {{ __('Commercial Payment Receipt') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft="lucide-printer"
              :label="__('Print')"
              @click="printReceipt"
            />
            <Button
              variant="outline"
              size="sm"
              iconLeft="lucide-download"
              :label="__('Download PDF')"
              @click="downloadReceipt"
            />
            <Button
              variant="solid"
              size="sm"
              iconLeft="lucide-mail"
              :label="__('Email Receipt')"
              @click="openEmailModal"
            />
            <button
              type="button"
              class="p-1 rounded-md text-ink-gray-4 dark:text-ink-gray-5 hover:text-ink-gray-8 dark:hover:text-ink-gray-2 hover:bg-surface-gray-2 transition-colors ml-1"
              @click="show = false"
            >
              <span class="lucide-x size-4" />
            </button>
          </div>
        </div>

        <!-- Receipt Content Sheet (High-End Typography) -->
        <div class="p-6 sm:p-8 overflow-y-auto space-y-6">
          <!-- Top Header: Business Branding & Receipt Number -->
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-outline-gray-1 pb-5">
            <div>
              <div class="flex items-center gap-2.5">
                <img
                  v-if="business.settings.logo_url"
                  :src="business.settings.logo_url"
                  alt="Logo"
                  class="h-10 w-auto max-w-[160px] object-contain rounded"
                />
                <span v-else class="text-lg font-bold text-ink-gray-9">{{ business.settings.business_name || 'Crestara CRM' }}</span>
              </div>
              <p v-if="business.settings.legal_name" class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 mt-1">{{ business.settings.legal_name }}</p>
              <p v-if="business.settings.business_address" class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-0.5 whitespace-pre-line">{{ business.settings.business_address }}</p>
              <div class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-0.5 space-x-2">
                <span v-if="business.settings.tax_id">{{ __('Tax ID / TIN:') }} {{ business.settings.tax_id }}</span>
              </div>
            </div>

            <div class="sm:text-right space-y-1">
              <span class="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 uppercase tracking-wider">
                {{ __('Official Receipt') }}
              </span>
              <h3 class="text-xl font-bold font-mono text-ink-gray-9">
                {{ payment?.receipt_number || payment?.transaction_ref || 'REC-SETTLED' }}
              </h3>
              <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
                {{ __('Date:') }} {{ payment?.payment_date || '-' }}
              </p>
            </div>
          </div>

          <!-- Received From & Invoice Context -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-gray-1 dark:bg-surface-gray-2/40 p-4 rounded-xl border border-outline-gray-1 text-xs">
            <div>
              <span class="text-ink-gray-7 dark:text-ink-gray-6 font-bold uppercase tracking-wider text-[10px] block mb-1">{{ __('Received From') }}</span>
              <p class="font-bold text-sm text-ink-gray-9">{{ invoice?.client_name || payment?.client_name || 'Valued Customer' }}</p>
              <p v-if="invoice?.client_email" class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">{{ invoice.client_email }}</p>
              <p v-if="invoice?.contact_name" class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">{{ __('Attn:') }} {{ invoice.contact_name }}</p>
            </div>

            <div class="sm:text-right">
              <span class="text-ink-gray-7 dark:text-ink-gray-6 font-bold uppercase tracking-wider text-[10px] block mb-1">{{ __('Settlement Reference') }}</span>
              <p class="font-medium text-ink-gray-8 dark:text-ink-gray-3">
                <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Invoice Number:') }}</span> <span class="font-bold font-mono text-ink-gray-9">{{ invoice?.invoice_number || 'Direct Payment' }}</span>
              </p>
              <p class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
                {{ __('Payment Method:') }} <span class="font-semibold text-ink-gray-9">{{ payment?.payment_method || 'Electronic Transfer' }}</span>
              </p>
              <p v-if="payment?.transaction_ref && payment?.transaction_ref !== payment?.receipt_number" class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
                {{ __('Transaction Ref:') }} <span class="font-mono text-ink-gray-9">{{ payment.transaction_ref }}</span>
              </p>
            </div>
          </div>

          <!-- Settlement Breakdown Table -->
          <div class="border border-outline-gray-1 rounded-xl overflow-hidden bg-surface-base">
            <table class="w-full text-xs">
              <thead class="bg-surface-gray-1 dark:bg-surface-gray-2/50 border-b border-outline-gray-1 font-semibold text-ink-gray-7 dark:text-ink-gray-6 text-[11px] uppercase tracking-wider">
                <tr>
                  <th class="text-left p-3">{{ __('Description') }}</th>
                  <th class="text-left p-3">{{ __('Channel / Method') }}</th>
                  <th class="text-right p-3">{{ __('Credited Amount') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1 bg-surface-base">
                <tr class="hover:bg-surface-gray-1 dark:hover:bg-surface-gray-2/40 transition-colors">
                  <td class="p-3">
                    <div class="font-semibold text-ink-gray-9">
                      {{ __('Payment toward Invoice {0}', [invoice?.invoice_number || '']) }}
                    </div>
                    <div v-if="payment?.notes" class="text-ink-gray-7 dark:text-ink-gray-6 text-[11px] mt-0.5">
                      {{ payment.notes }}
                    </div>
                  </td>
                  <td class="p-3 text-ink-gray-7 dark:text-ink-gray-6 font-medium">
                    {{ payment?.payment_method || 'Electronic Transfer' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-sm text-ink-green-7 dark:text-ink-green-4">
                    {{ curSign }}{{ formatNum(payment?.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Reconciliation & Seal -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <!-- Official Verification Seal Badge -->
            <div class="flex items-center gap-3 p-3 rounded-xl border border-outline-green-2 bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 max-w-sm">
              <span class="lucide-badge-check size-8 shrink-0 text-ink-green-7 dark:text-ink-green-4" />
              <div class="text-[11px]">
                <div class="font-bold tracking-tight uppercase">{{ __('Audit Verified Settlement') }}</div>
                <div class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">{{ __('Authenticated commercial receipt recorded in ledger.') }}</div>
              </div>
            </div>

            <!-- Financial Reconciliation Balance -->
            <div class="w-full sm:w-64 space-y-1.5 text-xs text-right">
              <div v-if="invoice" class="flex justify-between text-ink-gray-7 dark:text-ink-gray-6">
                <span>{{ __('Invoice Total:') }}</span>
                <span class="font-mono font-medium text-ink-gray-9">{{ curSign }}{{ formatNum(invoice.total_amount) }}</span>
              </div>
              <div class="flex justify-between font-bold text-sm text-ink-green-7 dark:text-ink-green-4 border-t border-outline-gray-1 pt-1.5">
                <span>{{ __('Amount Paid (This Receipt):') }}</span>
                <span class="font-mono">{{ curSign }}{{ formatNum(payment?.amount) }}</span>
              </div>
              <div v-if="invoice" class="flex justify-between font-bold text-xs">
                <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Remaining Balance:') }}</span>
                <span class="font-mono" :class="invoice.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-green-7 dark:text-ink-green-4'">
                  {{ curSign }}{{ formatNum(invoice.balance_due) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import { Dialog, Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'
import {
  downloadReceiptPdf,
  printDocumentPdf,
  generateReceiptPdf,
  getCurrencySign,
  loadImageAsBase64,
} from '@/utils/pdfGenerator'

const props = defineProps({
  invoice: { type: Object, default: null },
  payment: { type: Object, default: null },
})

const emit = defineEmits(['emailRequested'])
const show = defineModel({ type: Boolean, default: false })

const business = useBusinessStore()

const curSign = computed(() => {
  return getCurrencySign(props.payment?.currency || props.invoice?.currency || business.settings.currency)
})

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

async function ensureSettingsLogo() {
  if (business.settings.logo_url) {
    if (!business.settings.logo_data_uri || business.settings._resolved_logo_url !== business.settings.logo_url) {
      const b64 = await loadImageAsBase64(business.settings.logo_url)
      if (b64) {
        business.settings.logo_data_uri = b64
        business.settings._resolved_logo_url = business.settings.logo_url
      }
    }
  }
}

async function printReceipt() {
  if (props.payment) {
    await ensureSettingsLogo()
    const doc = generateReceiptPdf(props.invoice, props.payment, business.settings)
    printDocumentPdf(doc)
  }
}

async function downloadReceipt() {
  if (props.payment) {
    await ensureSettingsLogo()
    await downloadReceiptPdf(props.invoice, props.payment, business.settings)
  }
}

function openEmailModal() {
  show.value = false
  emit('emailRequested', {
    invoice: props.invoice,
    payment: props.payment,
    isReceipt: true,
  })
}
</script>
