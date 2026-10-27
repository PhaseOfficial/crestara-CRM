<template>
  <Dialog v-model:open="show" :size="'md'">
    <template #body>
      <div class="bg-surface-base rounded-2xl overflow-hidden p-6 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-outline-gray-1 pb-4">
          <div class="flex items-center gap-2">
            <span class="lucide-mail size-5 text-ink-blue-7 dark:text-ink-blue-3" />
            <h2 class="text-base font-bold text-ink-gray-9">
              {{ isReceipt ? __('Email Commercial Receipt') : __('Email Commercial Invoice') }}
            </h2>
          </div>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2">
            {{ isReceipt ? (payment?.receipt_number || 'RECEIPT') : (invoice?.invoice_number || 'INVOICE') }}
          </span>
        </div>

        <!-- Attachment Badge -->
        <div class="flex items-center gap-2.5 p-3 rounded-xl bg-surface-blue-2/30 border border-outline-blue-2 text-xs text-ink-blue-7 dark:text-ink-blue-3">
          <span class="lucide-paperclip size-4 shrink-0" />
          <div class="min-w-0 flex-1">
            <span class="font-bold block">{{ attachmentFilename }}</span>
            <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4">
              {{ __('LaTeX Vector PDF attachment compiled on demand via cPanel Mailer') }}
            </span>
          </div>
        </div>

        <!-- Feedback Alert -->
        <div
          v-if="errorMessage"
          class="p-3 rounded-xl bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2 text-xs flex items-start gap-2"
        >
          <span class="lucide-alert-triangle size-4 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="font-semibold">{{ __('Failed to dispatch email') }}</p>
            <p class="mt-0.5 text-[11px]">{{ errorMessage }}</p>
          </div>
        </div>

        <div
          v-if="successMessage"
          class="p-3 rounded-xl bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 text-xs flex items-center gap-2"
        >
          <span class="lucide-check-circle-2 size-4 shrink-0" />
          <span class="font-semibold">{{ successMessage }}</span>
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleSend">
          <FormControl
            v-model="recipient"
            :label="__('Recipient Email')"
            type="email"
            :placeholder="__('client@example.com')"
            required
          />

          <FormControl
            v-model="subject"
            :label="__('Subject')"
            type="text"
            required
          />

          <FormControl
            v-model="personalMessage"
            :label="__('Personal Note / Custom Instructions (Optional)')"
            type="textarea"
            rows="3"
            :placeholder="__('e.g. Please find your invoice attached. Contact us for any settlement questions.')"
          />

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button
              variant="outline"
              :label="__('Cancel')"
              @click="show = false"
            />
            <Button
              variant="solid"
              type="submit"
              iconLeft="send"
              :label="__('Send Email with PDF')"
              :loading="sending"
            />
          </div>
        </form>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Dialog, FormControl, Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'
import { sendInvoiceEmail, sendReceiptEmail } from '@/utils/mailer'

const props = defineProps({
  invoice: { type: Object, default: null },
  payment: { type: Object, default: null },
  isReceipt: { type: Boolean, default: false },
})

const emit = defineEmits(['emailSent'])
const show = defineModel({ type: Boolean, default: false })

const business = useBusinessStore()
const recipient = ref('')
const subject = ref('')
const personalMessage = ref('')
const sending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const attachmentFilename = computed(() => {
  if (props.isReceipt && props.payment) {
    return `${props.payment.receipt_number || props.payment.transaction_ref || 'receipt'}.pdf`
  }
  return `${props.invoice?.invoice_number || 'invoice'}.pdf`
})

watch(
  () => show.value,
  (isOpen) => {
    if (isOpen) {
      errorMessage.value = ''
      successMessage.value = ''
      recipient.value = props.invoice?.client_email || ''
      personalMessage.value = ''

      const bizName = business.settings.business_name || 'Crestara CRM'
      if (props.isReceipt && props.payment) {
        const recNum = props.payment.receipt_number || props.payment.transaction_ref || 'RECEIPT'
        subject.value = `Official Payment Receipt ${recNum} - ${bizName}`
      } else if (props.invoice) {
        subject.value = `Invoice ${props.invoice.invoice_number || ''} from ${bizName}`
      }
    }
  },
  { immediate: true },
)

async function handleSend() {
  if (!recipient.value) {
    errorMessage.value = 'Please provide a valid recipient email address.'
    return
  }

  sending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (props.isReceipt && props.payment) {
      await sendReceiptEmail({
        invoice: props.invoice,
        payment: props.payment,
        recipientEmail: recipient.value,
        subject: subject.value,
        personalMessage: personalMessage.value,
        businessSettings: business.settings,
      })
      successMessage.value = `Official receipt successfully dispatched to ${recipient.value}!`
    } else if (props.invoice) {
      await sendInvoiceEmail({
        invoice: props.invoice,
        recipientEmail: recipient.value,
        subject: subject.value,
        personalMessage: personalMessage.value,
        businessSettings: business.settings,
      })
      successMessage.value = `Commercial invoice successfully dispatched to ${recipient.value}!`
    }

    emit('emailSent', { recipient: recipient.value })
    setTimeout(() => {
      show.value = false
    }, 1400)
  } catch (err) {
    errorMessage.value = err.message || 'Unable to connect to cPanel mail service.'
  } finally {
    sending.value = false
  }
}
</script>
