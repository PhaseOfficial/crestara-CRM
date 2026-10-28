<template>
  <Dialog v-model:open="show" size="md" bare>
    <template #default>
      <div class="bg-surface-base rounded-2xl overflow-hidden p-6 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-outline-gray-1 pb-4">
          <div class="flex items-center gap-2">
            <span class="lucide-bell size-5 text-ink-blue-7 dark:text-ink-blue-3" />
            <h2 class="text-base font-bold text-ink-gray-9">
              {{ __('Send Payment Reminder') }}
            </h2>
          </div>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2">
            {{ invoice?.invoice_number || 'INVOICE' }}
          </span>
        </div>

        <!-- Live Countdown Pill -->
        <div
          class="flex items-center justify-between p-3.5 rounded-xl border text-xs"
          :class="countdownClasses"
        >
          <div class="flex items-center gap-2.5">
            <span :class="countdownIcon" class="size-4 shrink-0" />
            <div>
              <span class="font-bold block tracking-wide uppercase text-[11px]">{{ countdownInfo.badgeLabel }}</span>
              <span class="text-[11px] opacity-80">
                {{ __('Deadline:') }} {{ invoice?.due_date || '-' }}
              </span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[11px] opacity-75 block">{{ __('Balance Due') }}</span>
            <span class="font-bold font-mono text-sm">
              {{ currencySymbol }}{{ formattedBalance }}
            </span>
          </div>
        </div>

        <!-- Template Selector Buttons -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('Reminder Tone & Template Preset') }}
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors text-center"
              :class="activePreset === 'friendly' ? 'bg-surface-blue-2 border-outline-blue-2 text-ink-blue-7 dark:text-ink-blue-3 font-semibold' : 'bg-surface-gray-1 dark:bg-surface-gray-2/50 border-outline-gray-2 text-ink-gray-7 dark:text-ink-gray-6 hover:bg-surface-gray-2'"
              @click="applyPreset('friendly')"
            >
              {{ __('Friendly Countdown') }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors text-center"
              :class="activePreset === 'due_today' ? 'bg-surface-amber-2 border-outline-amber-2 text-ink-amber-8 dark:text-amber-300 font-semibold' : 'bg-surface-gray-1 dark:bg-surface-gray-2/50 border-outline-gray-2 text-ink-gray-7 dark:text-ink-gray-6 hover:bg-surface-gray-2'"
              @click="applyPreset('due_today')"
            >
              {{ __('Due Today') }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors text-center"
              :class="activePreset === 'gentle_overdue' ? 'bg-surface-red-2 border-outline-red-2 text-ink-red-7 dark:text-ink-red-4 font-semibold' : 'bg-surface-gray-1 dark:bg-surface-gray-2/50 border-outline-gray-2 text-ink-gray-7 dark:text-ink-gray-6 hover:bg-surface-gray-2'"
              @click="applyPreset('gentle_overdue')"
            >
              {{ __('Gentle Overdue') }}
            </button>
          </div>
        </div>

        <!-- Feedback Alerts -->
        <div
          v-if="errorMessage"
          class="p-3 rounded-xl bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2 text-xs flex items-start gap-2"
        >
          <span class="lucide-alert-triangle size-4 shrink-0 mt-0.5" />
          <div class="flex-1">
            <p class="font-semibold">{{ __('Failed to dispatch reminder') }}</p>
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
            :label="__('Subject Line')"
            type="text"
            required
          />

          <FormControl
            v-model="personalMessage"
            :label="__('Personalized Note & Instructions')"
            type="textarea"
            :rows="4"
            required
          />

          <!-- Attach PDF Checkbox -->
          <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-ink-gray-7 dark:text-ink-gray-3 pt-1">
            <input
              v-model="attachPdf"
              type="checkbox"
              class="rounded border-outline-gray-2 text-ink-blue-7 focus:ring-ink-blue-7 size-4"
            />
            <span>{{ __('Attach commercial invoice vector PDF for client records') }}</span>
          </label>

          <div class="flex items-center justify-between pt-4 border-t border-outline-gray-1">
            <span v-if="invoice?.last_reminder_sent_at" class="text-[11px] text-ink-gray-5 dark:text-ink-gray-4">
              {{ __('Last sent:') }} {{ formatSentDate(invoice.last_reminder_sent_at) }}
            </span>
            <span v-else class="text-[11px] text-ink-gray-5 dark:text-ink-gray-4">
              {{ __('No reminder sent yet') }}
            </span>

            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                :label="__('Cancel')"
                @click="show = false"
              />
              <Button
                variant="solid"
                type="submit"
                iconLeft="lucide-send"
                :label="__('Send Reminder')"
                :loading="sending"
              />
            </div>
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
import { calculateCountdown, buildReminderTemplate } from '@/utils/reminders'
import { formatAmount, getCurrencySign } from '@/utils/pdfGenerator'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  invoice: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'sent'])

const business = useBusinessStore()

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const recipient = ref('')
const subject = ref('')
const personalMessage = ref('')
const attachPdf = ref(true)
const sending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const activePreset = ref('friendly')

const currencySymbol = computed(() => {
  return getCurrencySign(props.invoice?.currency || business.settings.currency)
})

const formattedBalance = computed(() => {
  return formatAmount(props.invoice?.balance_due || 0)
})

const countdownInfo = computed(() => {
  return calculateCountdown(props.invoice)
})

const countdownClasses = computed(() => {
  const stage = countdownInfo.value.stage
  if (stage === 'overdue') {
    return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2'
  }
  if (stage === 'due_today') {
    return 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2'
  }
  return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2'
})

const countdownIcon = computed(() => {
  const stage = countdownInfo.value.stage
  if (stage === 'overdue') return 'lucide-alert-circle'
  if (stage === 'due_today') return 'lucide-bell-ring'
  return 'lucide-clock'
})

function formatSentDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return isoStr.split('T')[0]
  }
}

function applyPreset(presetType) {
  activePreset.value = presetType
  const mockCd = { ...countdownInfo.value }
  if (presetType === 'friendly') {
    mockCd.stage = 'upcoming'
    mockCd.daysUntilDue = Math.max(1, mockCd.daysUntilDue > 0 ? mockCd.daysUntilDue : 5)
  } else if (presetType === 'due_today') {
    mockCd.stage = 'due_today'
    mockCd.daysUntilDue = 0
  } else if (presetType === 'gentle_overdue') {
    mockCd.stage = 'overdue'
    mockCd.daysPastDue = Math.max(1, mockCd.daysPastDue > 0 ? mockCd.daysPastDue : 3)
  }

  const tpl = buildReminderTemplate({
    invoice: props.invoice,
    businessSettings: business.settings,
    countdown: mockCd,
  })

  subject.value = tpl.subject
  personalMessage.value = tpl.personalMessage
}

function initializeForm() {
  errorMessage.value = ''
  successMessage.value = ''
  recipient.value = props.invoice?.client_email || ''

  // Auto-select template preset based on invoice countdown stage
  const stage = countdownInfo.value.stage
  if (stage === 'overdue') {
    applyPreset('gentle_overdue')
  } else if (stage === 'due_today') {
    applyPreset('due_today')
  } else {
    applyPreset('friendly')
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      initializeForm()
    }
  },
)

async function handleSend() {
  if (!recipient.value) {
    errorMessage.value = 'Recipient email address is required'
    return
  }

  sending.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await business.sendManualInvoiceReminder(props.invoice.id, {
      recipientEmail: recipient.value,
      subject: subject.value,
      personalMessage: personalMessage.value,
      attachPdf: attachPdf.value,
    })

    successMessage.value = 'Payment reminder dispatched successfully!'
    emit('sent')
    setTimeout(() => {
      show.value = false
    }, 1500)
  } catch (err) {
    errorMessage.value = err.message || 'Failed to dispatch payment reminder'
  } finally {
    sending.value = false
  }
}
</script>
