<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-ink-gray-9 tracking-tight">{{ __('My Calendar & Renewal Schedule') }}</h1>
      <p class="text-xs sm:text-sm text-ink-gray-7 dark:text-ink-gray-6 mt-1">
        {{ __('Keep track of upcoming invoice payment deadlines, subscription renewals, and service milestones.') }}
      </p>
    </div>

    <!-- Timeline of Customer Events -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Upcoming Deadlines -->
      <div class="md:col-span-2 space-y-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 mb-4 flex items-center gap-1.5">
            <span class="lucide-calendar-days size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Scheduled Dates & Deadlines') }}
          </h2>

          <div class="space-y-4">
            <div
              v-for="event in customerEvents"
              :key="event.id"
              class="flex items-start gap-4 p-4 rounded-xl border border-outline-gray-1 bg-surface-base hover:bg-surface-gray-1 transition-colors"
            >
              <div
                class="size-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 border"
                :class="getEventBadge(event.type)"
              >
                <span class="text-[11px] uppercase leading-none">{{ event.month }}</span>
                <span class="text-base leading-none mt-1 font-mono">{{ event.day }}</span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-bold text-ink-gray-9 truncate">{{ event.title }}</h3>
                  <span
                    class="px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0"
                    :class="getEventStatusBadge(event.status)"
                  >
                    {{ __(event.status) }}
                  </span>
                </div>
                <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-1 leading-relaxed">{{ event.description }}</p>
                <div class="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-ink-gray-6 dark:text-ink-gray-5">
                  <span v-if="event.amount > 0">
                    {{ __('Amount:') }}
                    <strong class="font-mono text-ink-gray-9 ml-1">{{ business.formatCurrency(event.amount) }}</strong>
                  </span>
                  <span>
                    {{ __('Ref:') }}
                    <span class="font-mono font-semibold text-ink-gray-8 dark:text-ink-gray-2 ml-1">{{ event.ref }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar Sidebar Summary -->
      <div class="space-y-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm space-y-4">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 flex items-center gap-1.5">
            <span class="lucide-credit-card size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Billing Summary') }}
          </h3>
          <div class="space-y-3 text-xs sm:text-sm">
            <div class="flex justify-between py-2 border-b border-outline-gray-1">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Next Due Date:') }}</span>
              <span class="font-semibold text-ink-gray-9">{{ nextDueDate }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-outline-gray-1">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Next Renewal:') }}</span>
              <span class="font-semibold text-ink-gray-9">{{ nextRenewalDate }}</span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Billing Period:') }}</span>
              <span class="font-semibold text-ink-gray-9">{{ __('Monthly / Annual') }}</span>
            </div>
          </div>
        </div>

        <div class="bg-surface-blue-2 dark:bg-surface-blue-2/40 border border-outline-blue-2 rounded-xl p-5 text-xs text-ink-blue-7 dark:text-ink-blue-3 space-y-2">
          <div class="flex items-center gap-1.5 font-bold text-sm text-ink-blue-8 dark:text-blue-200">
            <span class="lucide-shield-check size-4" />
            {{ __('Automatic Reminders') }}
          </div>
          <p class="leading-relaxed opacity-95">
            {{ __('You will automatically receive email notifications 7 days prior to any invoice due date or subscription renewal.') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useBusinessStore } from '@/stores/business'

const business = useBusinessStore()

onMounted(async () => {
  await Promise.all([
    business.fetchInvoicesFromSupabase?.(),
    business.fetchEventsFromSupabase?.(),
  ])
})

const customerEvents = computed(() => {
  const list = []
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  // 1. Map Outstanding & Overdue Invoices
  for (const inv of business.invoices || []) {
    if (inv.status === 'Paid') continue
    const date = inv.due_date ? new Date(inv.due_date) : new Date()
    const pad = (n) => String(n).padStart(2, '0')
    list.push({
      id: `inv-${inv.id}`,
      month: monthNames[date.getMonth()],
      day: pad(date.getDate()),
      title: `Invoice Payment Due (${inv.invoice_number || 'INV'})`,
      type: 'Invoice Due',
      description:
        inv.notes ||
        `Balance remittance due for ${inv.client_name || 'Customer'}.`,
      amount: Number(inv.balance_due ?? inv.total_amount ?? 0),
      ref: inv.invoice_number || 'INV',
      status: inv.status === 'Overdue' ? 'Overdue' : 'Action Required',
      timestamp: isNaN(date.getTime()) ? 0 : date.getTime(),
    })
  }

  // 2. Map Client Appointments
  for (const ev of business.events || []) {
    const date = ev.fromDate ? new Date(ev.fromDate) : new Date()
    const pad = (n) => String(n).padStart(2, '0')
    list.push({
      id: `evt-${ev.id}`,
      month: monthNames[date.getMonth()],
      day: pad(date.getDate()),
      title: ev.title || 'Client Consultation',
      type: 'Appointment',
      description:
        ev.description ||
        (ev.location
          ? `Location: ${ev.location}`
          : 'Scheduled virtual conference with enterprise team.'),
      amount: 0,
      ref: `CAL-${ev.id ? ev.id.slice(0, 6).toUpperCase() : 'MTG'}`,
      status: 'Confirmed',
      timestamp: isNaN(date.getTime()) ? 0 : date.getTime(),
    })
  }

  // Sort by date ascending
  list.sort((a, b) => a.timestamp - b.timestamp)

  if (list.length > 0) return list

  return [
    {
      id: 'evt-default-1',
      month: 'Nov',
      day: '15',
      title: 'Annual Platform License Renewal',
      type: 'Renewal',
      description:
        'Scheduled renewal for Crestara CRM Enterprise Platform License.',
      amount: 1200.0,
      ref: 'SUB-CRM-PRO',
      status: 'Auto-Renew',
    },
  ]
})

const nextDueDate = computed(() => {
  const nextInv = customerEvents.value.find((e) => e.type === 'Invoice Due')
  return nextInv ? `${nextInv.month} ${nextInv.day}, 2026` : 'No Dues Pending'
})

const nextRenewalDate = computed(() => {
  const nextRen = customerEvents.value.find((e) => e.type === 'Renewal')
  return nextRen ? `${nextRen.month} ${nextRen.day}, 2026` : 'Nov 15, 2026'
})

function getEventBadge(type) {
  switch (type) {
    case 'Invoice Due':
      return 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border-outline-amber-2'
    case 'Renewal':
      return 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
    default:
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border-outline-blue-2'
  }
}

function getEventStatusBadge(status) {
  switch (status) {
    case 'Action Required':
    case 'Overdue':
      return 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border-outline-amber-2'
    case 'Auto-Renew':
      return 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
    default:
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border-outline-blue-2'
  }
}
</script>
