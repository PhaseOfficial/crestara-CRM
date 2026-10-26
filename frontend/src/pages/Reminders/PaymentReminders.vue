<template>
  <div class="flex flex-col h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Payment Reminders') }}</h1>
          <span class="text-xs px-2 py-0.5 rounded-full bg-surface-gray-2 text-ink-gray-6 font-semibold">
            {{ business.reminders.length }}
          </span>
        </div>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Reminder Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Overdue Invoices Pending Reminder') }}</span>
          <div class="mt-2 text-2xl font-bold text-ink-red-3">
            {{ business.reminders.filter(r => r.status === 'Overdue').length }}
          </div>
          <span class="text-xs text-ink-red-2 mt-1 block">{{ __('Requires immediate collection outreach') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Upcoming 30-Day Deadlines') }}</span>
          <div class="mt-2 text-2xl font-bold text-ink-amber-3">
            {{ business.reminders.filter(r => r.status === 'Upcoming').length }}
          </div>
          <span class="text-xs text-ink-gray-5 mt-1 block">{{ __('Automated schedule armed') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-5">{{ __('Reminder Delivery Health') }}</span>
          <div class="mt-2 text-2xl font-bold text-ink-green-3">100%</div>
          <span class="text-xs text-ink-green-2 mt-1 block">{{ __('Zero delivery failures') }}</span>
        </div>
      </div>

      <!-- Reminders Table -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-outline-gray-1 flex items-center justify-between">
          <h2 class="text-base font-bold text-ink-gray-9">{{ __('Active Reminder Schedule') }}</h2>
          <span class="text-xs text-ink-gray-5">{{ __('Automated notices sent via verified company email') }}</span>
        </div>

        <!-- Desktop Table (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-6">{{ __('Invoice / Target') }}</th>
                <th class="py-3 px-6">{{ __('Client Recipient') }}</th>
                <th class="py-3 px-6">{{ __('Due Date') }}</th>
                <th class="py-3 px-6">{{ __('Balance Due') }}</th>
                <th class="py-3 px-6">{{ __('Reminder Rule') }}</th>
                <th class="py-3 px-6">{{ __('Last Sent') }}</th>
                <th class="py-3 px-6">{{ __('Status') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Action') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="rem in business.reminders"
                :key="rem.id"
                class="hover:bg-surface-gray-1 transition-colors"
              >
                <td class="py-4 px-6 font-semibold text-ink-gray-9">
                  {{ rem.invoice_number }}
                </td>
                <td class="py-4 px-6">
                  <div class="font-medium text-ink-gray-9">{{ rem.client_name }}</div>
                  <div class="text-xs text-ink-gray-4">{{ rem.client_email }}</div>
                </td>
                <td class="py-4 px-6 text-ink-gray-6">{{ rem.due_date }}</td>
                <td class="py-4 px-6 font-bold" :class="rem.status === 'Overdue' ? 'text-ink-red-3' : 'text-ink-gray-9'">
                  ${{ formatNum(rem.balance_due) }}
                </td>
                <td class="py-4 px-6 text-xs text-ink-gray-7">{{ rem.reminder_type }}</td>
                <td class="py-4 px-6 text-xs text-ink-gray-5">{{ rem.last_sent_date || __('Never') }}</td>
                <td class="py-4 px-6">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="rem.delivery_status === 'Delivered' ? 'bg-surface-green-2 text-ink-green-7 border border-outline-green-2' : 'bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2'"
                  >
                    {{ rem.delivery_status }}
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    :label="__('Send Now')"
                    iconLeft="send"
                    @click="triggerReminder(rem.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="rem in business.reminders"
            :key="rem.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors space-y-3"
          >
            <!-- Top: Invoice Number + Delivery Status -->
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono font-bold text-ink-gray-9 text-sm">{{ rem.invoice_number }}</span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                :class="rem.delivery_status === 'Delivered' ? 'bg-surface-green-2 text-ink-green-7 border border-outline-green-2' : 'bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2'"
              >
                {{ rem.delivery_status }}
              </span>
            </div>

            <!-- Client & Email -->
            <div>
              <div class="font-semibold text-ink-gray-9 text-sm">{{ rem.client_name }}</div>
              <div class="text-xs text-ink-gray-5">{{ rem.client_email }}</div>
            </div>

            <!-- Details Grid: Due Date, Balance, Rule -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/60 p-2.5 rounded-lg">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Due Date') }}</span>
                <span class="font-medium text-ink-gray-8">{{ rem.due_date }}</span>
                <span class="text-[10px] text-ink-gray-4 block mt-0.5">{{ rem.reminder_type }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Balance Due') }}</span>
                <span class="font-bold text-sm" :class="rem.status === 'Overdue' ? 'text-ink-red-3' : 'text-ink-gray-9'">
                  ${{ formatNum(rem.balance_due) }}
                </span>
                <span class="text-[10px] text-ink-gray-5 block mt-0.5">Last: {{ rem.last_sent_date || __('Never') }}</span>
              </div>
            </div>

            <!-- Action Button -->
            <div class="flex items-center justify-end pt-1 border-t border-outline-gray-1/40">
              <Button
                size="sm"
                variant="outline"
                iconLeft="send"
                :label="__('Send Now')"
                @click="triggerReminder(rem.id)"
              />
            </div>
          </div>

          <div v-if="!business.reminders.length" class="py-12 text-center text-ink-gray-4">
            <span class="lucide-bell size-8 text-ink-gray-4 mx-auto block mb-2" />
            <p class="text-base font-semibold text-ink-gray-7">{{ __('No active reminders') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { Button } from 'frappe-ui'

const business = useBusinessStore()

function triggerReminder(id) {
  business.sendReminder(id)
  alert('Reminder notification dispatched successfully!')
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>
