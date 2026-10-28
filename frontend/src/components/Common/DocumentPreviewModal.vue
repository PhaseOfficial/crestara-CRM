<template>
  <Dialog v-model:open="show" size="xl" bare>
    <template #default>
      <div class="flex flex-col h-[85vh] max-h-[900px] bg-surface-base rounded-2xl overflow-hidden">
        <!-- Modal Toolbar Header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-outline-gray-1 bg-surface-gray-1 dark:bg-surface-gray-2/70 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="lucide-file-text size-5 text-ink-blue-7 dark:text-ink-blue-3" />
            <div>
              <h2 class="text-sm font-bold text-ink-gray-9">
                {{ title || (isReceipt ? __('Payment Receipt Preview') : __('Invoice PDF Preview')) }}
              </h2>
              <p v-if="isReceipt && (payment?.receipt_number || invoice?.invoice_number)" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 font-mono">
                {{ payment?.receipt_number || payment?.transaction_ref }} <span v-if="invoice?.invoice_number">• {{ invoice.invoice_number }}</span>
              </p>
              <p v-else-if="invoice?.invoice_number" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 font-mono">
                {{ invoice.invoice_number }}
              </p>
            </div>
          </div>

          <!-- Actions Toolbar -->
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft="lucide-printer"
              :label="__('Print')"
              :tooltip="__('Isolated Clean Print (No Screen Chrome)')"
              @click="handlePrint"
            />
            <Button
              variant="outline"
              size="sm"
              iconLeft="lucide-download"
              :label="__('Download PDF')"
              @click="handleDownloadPdf"
            />
            <Button
              variant="solid"
              size="sm"
              iconLeft="lucide-mail"
              :label="__('Email to Client')"
              @click="handleEmail"
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

        <!-- Document Preview Canvas -->
        <div class="flex-1 bg-surface-gray-2 dark:bg-surface-gray-3/80 p-2 sm:p-4 overflow-hidden relative flex items-center justify-center">
          <!-- Loading State -->
          <div v-if="loading" class="flex flex-col items-center gap-2 text-ink-gray-6 dark:text-ink-gray-4 text-xs">
            <span class="lucide-loader-2 size-6 animate-spin text-ink-blue-7 dark:text-ink-blue-3" />
            <span>{{ __('Rendering vector document...') }}</span>
          </div>

          <!-- Embedded Vector PDF Stream -->
          <iframe
            v-else-if="pdfBlobUrl"
            :src="pdfBlobUrl"
            class="w-full h-full rounded-lg shadow-md border border-outline-gray-2 bg-white"
            title="PDF Preview"
          />

          <!-- Fallback when PDF blob cannot be displayed -->
          <div v-else class="text-center p-8 text-ink-gray-6 dark:text-ink-gray-4 text-xs">
            <span class="lucide-alert-circle size-8 text-ink-amber-3 mx-auto block mb-2" />
            <p class="font-medium text-ink-gray-8 dark:text-ink-gray-2">{{ __('Unable to generate PDF preview in this browser.') }}</p>
            <p class="mt-1 text-ink-gray-6 dark:text-ink-gray-4">{{ __('You can still download the PDF or dispatch it via email.') }}</p>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { Dialog, Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'
import {
  getInvoicePdfBlobUrl,
  getInvoicePdfBlobUrlAsync,
  getReceiptPdfBlobUrl,
  getReceiptPdfBlobUrlAsync,
  downloadInvoicePdf,
  downloadReceiptPdf,
  printDocumentPdf,
  loadImageAsBase64,
} from '@/utils/pdfGenerator'

const props = defineProps({
  invoice: { type: Object, default: null },
  payment: { type: Object, default: null },
  isReceipt: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits(['emailRequested'])
const show = defineModel({ type: Boolean, default: false })

const business = useBusinessStore()
const loading = ref(false)
const pdfBlobUrl = ref(null)

function cleanupBlobUrl() {
  if (pdfBlobUrl.value && pdfBlobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(pdfBlobUrl.value)
    pdfBlobUrl.value = null
  }
}

watch(
  () => show.value,
  (isOpen) => {
    if (isOpen) {
      generatePreview()
    } else {
      cleanupBlobUrl()
    }
  },
)

onUnmounted(() => {
  cleanupBlobUrl()
})

async function generatePreview() {
  loading.value = true
  cleanupBlobUrl()

  try {
    if (props.isReceipt && props.payment) {
      pdfBlobUrl.value = await getReceiptPdfBlobUrlAsync(props.invoice, props.payment, business.settings)
    } else if (props.invoice) {
      pdfBlobUrl.value = await getInvoicePdfBlobUrlAsync(props.invoice, business.settings)
    }
  } catch (err) {
    console.error('Failed to generate document preview:', err)
  } finally {
    loading.value = false
  }
}

async function handlePrint() {
  if (pdfBlobUrl.value) {
    printDocumentPdf(pdfBlobUrl.value)
  } else if (props.isReceipt && props.payment) {
    const url = await getReceiptPdfBlobUrlAsync(props.invoice, props.payment, business.settings)
    printDocumentPdf(url)
  } else if (props.invoice) {
    const url = await getInvoicePdfBlobUrlAsync(props.invoice, business.settings)
    printDocumentPdf(url)
  }
}

async function handleDownloadPdf() {
  if (props.isReceipt && props.payment) {
    await downloadReceiptPdf(props.invoice, props.payment, business.settings)
  } else if (props.invoice) {
    await downloadInvoicePdf(props.invoice, business.settings)
  }
}

function handleEmail() {
  show.value = false
  emit('emailRequested', {
    invoice: props.invoice,
    payment: props.payment,
    isReceipt: props.isReceipt,
  })
}
</script>
