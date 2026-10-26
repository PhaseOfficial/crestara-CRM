<template>
  <Dialog v-model:open="show" :size="'md'">
    <template #body>
      <div class="p-6 bg-surface-base space-y-4">
        <div class="flex items-center justify-between border-b border-outline-gray-1 pb-4">
          <h2 class="text-lg font-bold text-ink-gray-9">
            {{ __('Record Payment for {0}', [invoice?.invoice_number || '']) }}
          </h2>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2">
            {{ invoice?.currency || 'USD' }}
          </span>
        </div>

        <div class="bg-surface-gray-1 rounded-lg p-3 text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-ink-gray-5">{{ __('Client:') }}</span>
            <span class="font-bold text-ink-gray-9">{{ invoice?.client_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-ink-gray-5">{{ __('Total Amount:') }}</span>
            <span class="font-medium text-ink-gray-9">${{ formatNum(invoice?.total_amount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-ink-gray-5">{{ __('Amount Already Paid:') }}</span>
            <span class="font-medium text-ink-green-3">${{ formatNum(invoice?.amount_paid) }}</span>
          </div>
          <div class="flex justify-between pt-1 border-t border-outline-gray-1 font-bold text-sm">
            <span class="text-ink-gray-7">{{ __('Remaining Balance:') }}</span>
            <span class="text-ink-amber-3">${{ formatNum(invoice?.balance_due) }}</span>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="submitPayment">
          <FormControl
            v-model="amount"
            :label="__('Payment Amount ($)')"
            type="number"
            step="0.01"
            :max="invoice?.balance_due"
            min="0.01"
            required
          />

          <FormControl
            v-model="paymentMethod"
            :label="__('Payment Method')"
            type="select"
            :options="[
              'Credit Card',
              'Bank Wire Transfer',
              'Stripe',
              'PayPal',
              'Cash / Check',
            ]"
            required
          />

          <FormControl
            v-model="paymentDate"
            :label="__('Payment Date')"
            type="date"
            required
          />

          <FormControl
            v-model="notes"
            :label="__('Reference / Notes')"
            type="text"
            placeholder="e.g. Wire transfer ref #908234"
          />

          <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button variant="outline" :label="__('Cancel')" @click="show = false" />
            <Button
              variant="solid"
              type="submit"
              :label="__('Confirm & Issue Receipt')"
              :loading="recording"
            />
          </div>
        </form>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useBusinessStore } from '@/stores/business'
import { Dialog, FormControl, Button } from 'frappe-ui'

const props = defineProps({
  invoice: { type: Object, default: null },
})
const emit = defineEmits(['paymentRecorded'])
const show = defineModel({ type: Boolean, default: false })

const business = useBusinessStore()
const recording = ref(false)
const amount = ref(0)
const paymentMethod = ref('Credit Card')
const paymentDate = ref(new Date().toISOString().split('T')[0])
const notes = ref('')

watch(
  () => props.invoice,
  (inv) => {
    if (inv) {
      amount.value = inv.balance_due || 0
      paymentDate.value = new Date().toISOString().split('T')[0]
      notes.value = ''
    }
  },
  { immediate: true },
)

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function submitPayment() {
  if (!props.invoice) return
  recording.value = true
  try {
    const result = business.recordPayment(props.invoice.id, {
      amount: amount.value,
      payment_method: paymentMethod.value,
      payment_date: paymentDate.value,
      notes: notes.value,
    })
    emit('paymentRecorded', result)
    show.value = false
  } catch (err) {
    alert(err.message || 'Payment recording failed')
  } finally {
    recording.value = false
  }
}
</script>
