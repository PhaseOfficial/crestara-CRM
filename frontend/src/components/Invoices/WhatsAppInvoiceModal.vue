<template>
  <Dialog v-model:open="show" :size="'md'">
    <template #body>
      <div class="bg-surface-base rounded-2xl overflow-hidden p-6 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-outline-gray-1 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="size-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <WhatsAppIcon class="size-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-ink-gray-9">
                {{ isReceipt ? __('Send Receipt to WhatsApp') : __('Send Invoice to WhatsApp') }}
              </h2>
              <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
                {{ __('Attach publication-grade PDF document to client chat') }}
              </p>
            </div>
          </div>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-surface-gray-2 text-ink-gray-8 dark:text-ink-gray-2 border border-outline-gray-2">
            {{ isReceipt ? (payment?.receipt_number || 'RECEIPT') : (invoice?.invoice_number || 'INVOICE') }}
          </span>
        </div>

        <!-- Document Summary Card -->
        <div class="p-3.5 rounded-xl bg-surface-gray-1 dark:bg-surface-gray-2/40 border border-outline-gray-1 text-xs space-y-1.5">
          <div class="flex items-center justify-between font-semibold">
            <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Client / Recipient:') }}</span>
            <span class="font-bold text-ink-gray-9">{{ invoice?.client_name || payment?.client_name || __('Valued Customer') }}</span>
          </div>
          <div class="flex items-center justify-between font-semibold">
            <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ isReceipt ? __('Amount Settled:') : __('Total Amount Due:') }}</span>
            <span class="font-mono font-bold text-ink-green-7 dark:text-ink-green-4">
              {{ currencySign }}{{ formatAmount(isReceipt ? payment?.amount : (invoice?.balance_due ?? invoice?.total_amount)) }}
            </span>
          </div>
          <div v-if="!isReceipt && invoice?.due_date" class="flex items-center justify-between text-ink-gray-7 dark:text-ink-gray-6">
            <span>{{ __('Payment Due Date:') }}</span>
            <span class="font-medium text-ink-gray-8 dark:text-ink-gray-3">{{ invoice.due_date }}</span>
          </div>
        </div>

        <!-- Feedback Alert -->
        <div
          v-if="errorMessage"
          class="p-3 rounded-xl bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2 text-xs flex items-start gap-2"
        >
          <span class="lucide-alert-triangle size-4 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="font-semibold">{{ __('Action failed') }}</p>
            <p class="mt-0.5 text-[11px]">{{ errorMessage }}</p>
          </div>
        </div>

        <div
          v-if="statusMessage"
          class="p-3 rounded-xl bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 text-xs flex items-center gap-2"
        >
          <span class="lucide-check-circle-2 size-4 shrink-0" />
          <span class="font-semibold">{{ statusMessage }}</span>
        </div>

        <!-- Form Fields -->
        <form class="space-y-4" @submit.prevent="handleSendToWhatsApp">
          <!-- Recipient WhatsApp Phone Number -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6">
                {{ __('Recipient WhatsApp Phone Number') }}
                <span class="text-ink-red-6">*</span>
              </label>
              <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4">
                {{ __('Include country code, e.g. +1 555 123 4567') }}
              </span>
            </div>
            <div class="relative flex items-center">
              <span class="lucide-phone size-4 text-ink-gray-5 dark:text-ink-gray-4 absolute left-3 pointer-events-none" />
              <input
                v-model="recipientPhone"
                type="tel"
                :placeholder="__('+1 (555) 000-1234 or 15550001234')"
                class="w-full bg-surface-base dark:bg-surface-gray-1 rounded-lg pl-9 pr-3 py-2 text-xs border border-outline-gray-2 text-ink-gray-9 font-medium placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-outline-gray-3 transition-colors"
                required
              />
            </div>
          </div>

          <!-- Message Body -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6">
                {{ __('WhatsApp Message Preview') }}
              </label>
              <button
                type="button"
                class="text-[11px] text-ink-blue-7 dark:text-ink-blue-3 hover:underline"
                @click="resetMessage"
              >
                {{ __('Reset Default') }}
              </button>
            </div>
            <textarea
              v-model="message"
              rows="5"
              class="w-full bg-surface-base dark:bg-surface-gray-1 rounded-lg p-3 text-xs border border-outline-gray-2 text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-outline-gray-3 transition-colors font-mono"
              required
            />
          </div>

          <!-- Local File Notice -->
          <div class="flex items-center gap-2 p-2.5 rounded-lg bg-surface-gray-1 dark:bg-surface-gray-2/30 border border-outline-gray-1 text-[11px] text-ink-gray-7 dark:text-ink-gray-6">
            <span class="lucide-file-text size-4 text-ink-blue-7 dark:text-ink-blue-3 shrink-0" />
            <div class="flex-1">
              <span>{{ __('The PDF is automatically generated with publication-grade vector formatting and saved locally for easy drag-and-drop into WhatsApp.') }}</span>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-gray-1">
            <Button
              variant="outline"
              size="sm"
              :label="__('Cancel')"
              @click="show = false"
            />

            <!-- Direct Mobile / Native Web Share (Files API) -->
            <Button
              v-if="canShareFiles"
              variant="outline"
              size="sm"
              iconLeft="share-2"
              :label="__('Direct OS Share')"
              :tooltip="__('Directly attach PDF file via native mobile share')"
              :loading="processing"
              @click="handleNativeFileShare"
            />

            <!-- Primary Send / Open in WhatsApp -->
            <Button
              variant="solid"
              size="sm"
              theme="green"
              :loading="processing"
              type="submit"
            >
              <template #prefix>
                <WhatsAppIcon class="size-3.5 text-white mr-1" />
              </template>
              <span>{{ __('Send to WhatsApp') }}</span>
            </Button>
          </div>
        </form>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Dialog, Button } from 'frappe-ui'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import { useBusinessStore } from '@/stores/business'
import {
  generateInvoicePdf,
  generateReceiptPdf,
  preparePdfSettings,
  getCurrencySign,
  formatAmount,
} from '@/utils/pdfGenerator'
import { uploadPdfAsset } from '@/utils/storage'

const props = defineProps({
  invoice: { type: Object, default: null },
  payment: { type: Object, default: null },
  isReceipt: { type: Boolean, default: false },
})

const emit = defineEmits(['sent'])
const show = defineModel({ type: Boolean, default: false })

const business = useBusinessStore()
const recipientPhone = ref('')
const message = ref('')
const processing = ref(false)
const errorMessage = ref('')
const statusMessage = ref('')
const canShareFiles = ref(false)

const currencySign = computed(() => {
  return getCurrencySign(
    props.payment?.currency || props.invoice?.currency || business.settings.currency,
  )
})

const filename = computed(() => {
  if (props.isReceipt && props.payment) {
    const recNum = props.payment.receipt_number || props.payment.transaction_ref || 'receipt'
    return `${recNum}.pdf`
  }
  return `${props.invoice?.invoice_number || 'invoice'}.pdf`
})

function cleanPhoneNumber(raw) {
  if (!raw) return ''
  // Strip spaces, dashes, parentheses, dots
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '')
  // If starts with +, remove + for wa.me URL
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }
  return cleaned
}

function buildDefaultMessage(pdfPublicUrl = '') {
  const bizName = business.settings.business_name || 'Crestara CRM'
  const clientName =
    props.invoice?.contact_name ||
    props.invoice?.client_name ||
    props.payment?.client_name ||
    'Valued Client'

  if (props.isReceipt && props.payment) {
    const recNum = props.payment.receipt_number || props.payment.transaction_ref || 'RECEIPT'
    const amt = `${currencySign.value}${formatAmount(props.payment.amount)}`
    let text = `Hello *${clientName}*,\n\n`
    text += `Thank you for your payment! Here is your official commercial receipt *${recNum}* from *${bizName}*.\n\n`
    text += `💰 *Amount Settled:* ${amt}\n`
    text += `📅 *Date:* ${props.payment.payment_date || new Date().toISOString().split('T')[0]}\n`
    if (props.invoice?.invoice_number) {
      text += `📄 *Invoice Ref:* ${props.invoice.invoice_number}\n`
    }
    if (pdfPublicUrl) {
      text += `\n📥 *Download Official Receipt PDF:*\n${pdfPublicUrl}\n`
    }
    text += `\nThank you for choosing *${bizName}*!`
    return text
  }

  // Invoice Message
  const invNum = props.invoice?.invoice_number || 'INVOICE'
  const balance = `${currencySign.value}${formatAmount(
    props.invoice?.balance_due ?? props.invoice?.total_amount,
  )}`
  let text = `Hello *${clientName}*,\n\n`
  text += `Please find your invoice *${invNum}* from *${bizName}*.\n\n`
  text += `💵 *Total Amount:* ${currencySign.value}${formatAmount(props.invoice?.total_amount)}\n`
  text += `⚖️ *Balance Due:* ${balance}\n`
  if (props.invoice?.due_date) {
    text += `📅 *Due Date:* ${props.invoice.due_date}\n`
  }
  if (pdfPublicUrl) {
    text += `\n📥 *Download Official Invoice PDF:*\n${pdfPublicUrl}\n`
  }
  text += `\nPlease let us know if you have any questions.\nThank you for your business!`
  return text
}

function resetMessage() {
  message.value = buildDefaultMessage()
}

watch(
  () => show.value,
  (isOpen) => {
    if (isOpen) {
      errorMessage.value = ''
      statusMessage.value = ''

      // Attempt to auto-populate phone from invoice or customer
      const autoPhone =
        props.invoice?.client_phone ||
        props.invoice?.phone ||
        props.invoice?.mobile_no ||
        props.payment?.phone ||
        ''
      recipientPhone.value = autoPhone

      // Populate default message
      resetMessage()

      // Check for Web Share Files support
      try {
        if (typeof navigator !== 'undefined' && navigator.canShare) {
          const testFile = new File([''], 'test.pdf', { type: 'application/pdf' })
          canShareFiles.value = navigator.canShare({ files: [testFile] })
        } else {
          canShareFiles.value = false
        }
      } catch {
        canShareFiles.value = false
      }
    }
  },
)

async function generatePdfDocument() {
  const activeSettings = await preparePdfSettings(business.settings)
  if (props.isReceipt && props.payment) {
    return generateReceiptPdf(props.invoice, props.payment, activeSettings)
  }
  return generateInvoicePdf(props.invoice, activeSettings)
}

async function handleNativeFileShare() {
  processing.value = true
  errorMessage.value = ''

  try {
    const doc = await generatePdfDocument()
    const pdfBlob = doc.output('blob')
    const pdfFile = new File([pdfBlob], filename.value, { type: 'application/pdf' })

    if (navigator.share) {
      await navigator.share({
        title: props.isReceipt
          ? `Receipt ${props.payment?.receipt_number || ''}`
          : `Invoice ${props.invoice?.invoice_number || ''}`,
        text: message.value,
        files: [pdfFile],
      })
      statusMessage.value = __('Shared successfully via WhatsApp!')
      emit('sent', { method: 'share', recipient: recipientPhone.value })
      setTimeout(() => {
        show.value = false
      }, 1500)
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      errorMessage.value = err.message || __('Native share failed')
    }
  } finally {
    processing.value = false
  }
}

async function handleSendToWhatsApp() {
  const clean = cleanPhoneNumber(recipientPhone.value)
  if (!clean || clean.length < 5) {
    errorMessage.value = __('Please enter a valid phone number with country code')
    return
  }

  processing.value = true
  errorMessage.value = ''
  statusMessage.value = ''

  try {
    // 1. Generate the official publication-grade PDF
    const doc = await generatePdfDocument()
    const pdfBlob = doc.output('blob')

    // 2. Automatically download the PDF locally for the user
    doc.save(filename.value)

    // 3. Upload PDF to Supabase storage to generate direct tap-to-view URL
    let pdfUrl = ''
    try {
      const uploadRes = await uploadPdfAsset(
        pdfBlob,
        filename.value,
        props.isReceipt ? 'receipts' : 'invoices',
      )
      if (uploadRes.success && uploadRes.url) {
        pdfUrl = uploadRes.url
      }
    } catch (uploadErr) {
      console.warn('PDF cloud upload skipped, continuing with local PDF & WhatsApp chat:', uploadErr)
    }

    // 4. If URL was generated and not yet in message, add it
    let outgoingMessage = message.value
    if (pdfUrl && !outgoingMessage.includes(pdfUrl)) {
      outgoingMessage += `\n\n📥 *Download PDF:* ${pdfUrl}`
    }

    // 5. Open WhatsApp Web or mobile app
    const encoded = encodeURIComponent(outgoingMessage)
    const whatsappUrl = `https://wa.me/${clean}?text=${encoded}`
    window.open(whatsappUrl, '_blank')

    statusMessage.value = __('Opening WhatsApp! PDF has also been saved to your downloads.')
    emit('sent', { method: 'whatsapp', recipient: clean, pdfUrl })

    setTimeout(() => {
      show.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to prepare WhatsApp dispatch:', err)
    errorMessage.value = err.message || __('Failed to prepare WhatsApp message')
  } finally {
    processing.value = false
  }
}
</script>
