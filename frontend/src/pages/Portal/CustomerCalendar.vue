<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-ink-gray-9">{{ __('My Calendar & Renewal Schedule') }}</h1>
      <p class="text-sm text-ink-gray-5 mt-1">
        {{ __('Keep track of upcoming invoice payment deadlines, subscription renewals, and service milestones.') }}
      </p>
    </div>

    <!-- Timeline of Customer Events -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Upcoming Deadlines -->
      <div class="md:col-span-2 space-y-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm">
          <h2 class="text-base font-bold text-ink-gray-9 mb-4 flex items-center gap-2">
            <span class="lucide-calendar-days size-5 text-ink-blue-3" />
            {{ __('Scheduled Dates & Deadlines') }}
          </h2>

          <div class="space-y-4">
            <div
              v-for="event in customerEvents"
              :key="event.id"
              class="flex items-start gap-4 p-4 rounded-lg border border-outline-gray-1 hover:bg-surface-gray-1 transition-colors"
            >
              <div
                class="size-12 rounded-lg flex flex-col items-center justify-center font-bold shrink-0"
                :class="getEventBadge(event.type)"
              >
                <span class="text-xs uppercase leading-none">{{ event.month }}</span>
                <span class="text-base leading-none mt-0.5">{{ event.day }}</span>
              </div>

              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-ink-gray-9">{{ event.title }}</h3>
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    :class="event.status === 'Action Required' ? 'bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2' : 'bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2'"
                  >
                    {{ event.status }}
                  </span>
                </div>
                <p class="text-xs text-ink-gray-5 mt-1">{{ event.description }}</p>
                <div class="mt-2 flex items-center gap-4 text-xs text-ink-gray-4">
                  <span>{{ __('Amount:') }} <strong class="text-ink-gray-8">${{ formatNum(event.amount) }}</strong></span>
                  <span>{{ __('Ref:') }} {{ event.ref }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar Sidebar Summary -->
      <div class="space-y-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm">
          <h3 class="text-sm font-bold text-ink-gray-9 mb-3">{{ __('Billing Summary') }}</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-outline-gray-1">
              <span class="text-ink-gray-5">{{ __('Next Due Date:') }}</span>
              <span class="font-semibold text-ink-gray-9">Nov 09, 2026</span>
            </div>
            <div class="flex justify-between py-2 border-b border-outline-gray-1">
              <span class="text-ink-gray-5">{{ __('Next Renewal:') }}</span>
              <span class="font-semibold text-ink-gray-9">Nov 15, 2026</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-ink-gray-5">{{ __('Billing Period:') }}</span>
              <span class="font-semibold text-ink-gray-9">{{ __('Monthly / Annual') }}</span>
            </div>
          </div>
        </div>

        <div class="bg-surface-blue-2 border border-outline-blue-2 rounded-xl p-5 text-xs text-ink-blue-7 space-y-2">
          <div class="flex items-center gap-1.5 font-bold text-sm text-ink-blue-7">
            <span class="lucide-shield-check size-4" />
            {{ __('Automatic Reminders') }}
          </div>
          <p class="opacity-90">
            {{ __('You will automatically receive email notifications 7 days prior to any invoice due date or subscription renewal.') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBusinessStore } from '@/stores/business'

const business = useBusinessStore()

const customerEvents = computed(() => {
  return [
    {
      id: 'evt-1',
      month: 'Nov',
      day: '09',
      title: 'Invoice Payment Due (INV-2026-1043)',
      type: 'Invoice Due',
      description: 'Crestara Core Router and VoIP desk phones hardware delivery balance.',
      amount: 4296.6,
      ref: 'INV-2026-1043',
      status: 'Action Required',
    },
    {
      id: 'evt-2',
      month: 'Nov',
      day: '15',
      title: 'Annual Platform License Renewal',
      type: 'Renewal',
      description: 'Scheduled renewal for Crestara CRM Enterprise Platform License.',
      amount: 1200.0,
      ref: 'SUB-CRM-PRO',
      status: 'Auto-Renew',
    },
    {
      id: 'evt-3',
      month: 'Dec',
      day: '01',
      title: 'Quarterly Infrastructure Review',
      type: 'Appointment',
      description: 'Scheduled virtual check-in with Crestara enterprise engineering team.',
      amount: 0.0,
      ref: 'CAL-MTG-09',
      status: 'Confirmed',
    },
  ]
})

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getEventBadge(type) {
  switch (type) {
    case 'Invoice Due':
      return 'bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2'
    case 'Renewal':
      return 'bg-surface-green-2 text-ink-green-7 border border-outline-green-2'
    default:
      return 'bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2'
  }
}
</script>
