<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Payment Reminders') }}</h1>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 font-semibold border border-outline-gray-2/60">
            {{ activeRemindersList.length }}
          </span>
        </div>
      </template>

      <template #right-header>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            iconLeft="lucide-play"
            :label="isMobileView ? '' : __('Test Reminder Run')"
            :loading="testingCron"
            :tooltip="__('Simulate automated reminder run without sending emails')"
            @click="runCronDryRun"
          />
          <router-link to="/business-settings">
            <Button
              size="sm"
              variant="outline"
              iconLeft="lucide-settings"
              :label="isMobileView ? '' : __('Reminder Settings')"
              :tooltip="__('Configure default reminder countdown schedules')"
            />
          </router-link>
        </div>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-20 md:pb-6">
      <!-- Automated Daily Reminders Status & Schedule Banner -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start sm:items-center gap-3">
          <div
            class="size-10 rounded-xl flex items-center justify-center shrink-0 border"
            :class="business.settings.reminder_enabled !== false ? 'bg-surface-green-2 border-outline-green-2 text-ink-green-7 dark:text-ink-green-4' : 'bg-surface-amber-2 border-outline-amber-2 text-ink-amber-8 dark:text-amber-300'"
          >
            <span :class="business.settings.reminder_enabled !== false ? 'lucide-bell-ring size-5' : 'lucide-bell-off size-5'" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-ink-gray-9">
                {{ business.settings.reminder_enabled !== false ? __('Automated Reminders: Active') : __('Automated Reminders: Paused') }}
              </h2>
              <span
                class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border"
                :class="business.settings.reminder_enabled !== false ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2' : 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border-outline-amber-2'"
              >
                {{ business.settings.reminder_enabled !== false ? __('Armed') : __('Disabled') }}
              </span>
            </div>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Schedule: Countdown on days {0} before deadline • Gentle follow-up on days {1} after deadline', [business.settings.reminder_days_before || '7, 3, 1', business.settings.reminder_overdue_days || '3, 7']) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span class="text-xs text-ink-gray-6 dark:text-ink-gray-4">
            {{ __('Daily Schedule: 08:00 AM') }}
          </span>
        </div>
      </div>

      <!-- Dry Run Feedback Banner -->
      <transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="cronTestResult"
          class="p-4 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-sm"
          :class="cronTestResult.success ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2' : 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border-outline-red-2'"
        >
          <div class="flex items-center gap-2">
            <span :class="cronTestResult.success ? 'lucide-check-circle size-4' : 'lucide-alert-circle size-4'" />
            <span class="font-medium">{{ cronTestResult.message }}</span>
          </div>
          <button
            type="button"
            class="text-xs opacity-75 hover:opacity-100 font-bold"
            @click="cronTestResult = null"
          >
            ✕
          </button>
        </div>
      </transition>

      <!-- Reminder KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Overdue Requiring Gentle Reminders -->
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Overdue (Gentle Notices)') }}</span>
            <span class="lucide-alert-triangle size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div
            class="mt-2 text-2xl font-bold"
            :class="overdueInvoices.length > 0 ? 'text-ink-red-7 dark:text-ink-red-4' : 'text-ink-gray-9'"
          >
            {{ overdueInvoices.length }}
          </div>
          <span
            class="text-xs mt-1 block"
            :class="overdueInvoices.length > 0 ? 'text-ink-red-7 dark:text-ink-red-4' : 'text-ink-gray-6 dark:text-ink-gray-4'"
          >
            {{ business.formatCurrency(totalOverdueAmount) }} {{ __('past deadline') }}
          </span>
        </div>

        <!-- Due Today -->
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Due Today (Urgent)') }}</span>
            <span class="lucide-bell-ring size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div
            class="mt-2 text-2xl font-bold"
            :class="dueTodayInvoices.length > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'"
          >
            {{ dueTodayInvoices.length }}
          </div>
          <span
            class="text-xs mt-1 block"
            :class="dueTodayInvoices.length > 0 ? 'text-ink-amber-8 dark:text-amber-300' : 'text-ink-gray-6 dark:text-ink-gray-4'"
          >
            {{ __('Reaching deadline today') }}
          </span>
        </div>

        <!-- Upcoming Countdowns -->
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Upcoming Countdowns') }}</span>
            <span class="lucide-clock size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div class="mt-2 text-2xl font-bold text-ink-blue-7 dark:text-ink-blue-3">
            {{ upcomingInvoices.length }}
          </div>
          <span class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1 block">
            {{ business.formatCurrency(totalUpcomingAmount) }} {{ __('scheduled') }}
          </span>
        </div>

        <!-- Reminders Sent Metrics -->
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Total Dispatched') }}</span>
            <span class="lucide-mail-check size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div class="mt-2 text-2xl font-bold text-ink-green-7 dark:text-ink-green-4">
            {{ totalDispatchedCount }}
          </div>
          <span class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1 block">
            {{ __('Automated & manual notices sent') }}
          </span>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Stage Filter Tabs -->
        <div class="flex flex-wrap gap-1 bg-surface-gray-2 p-1 rounded-lg text-xs font-medium">
          <button
            v-for="tab in filterTabs"
            :key="tab.id"
            class="px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            :class="selectedTab === tab.id ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-xs' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
            @click="selectedTab = tab.id"
          >
            <span>{{ tab.label }}</span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
              :class="selectedTab === tab.id ? 'bg-surface-gray-2 dark:bg-surface-gray-2 text-ink-gray-8 dark:text-ink-gray-2' : 'bg-surface-gray-3/60 dark:bg-surface-gray-3/40 text-ink-gray-6'"
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="w-full sm:w-64">
          <TextInput
            v-model="searchQuery"
            type="search"
            :placeholder="__('Search invoice or client...')"
            iconLeft="search"
          />
        </div>
      </div>

      <!-- Reminders Live Table -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
        <div class="px-6 py-4 border-b border-outline-gray-1 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-ink-gray-9">{{ __('Outstanding Commercial Invoices & Reminder Queue') }}</h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">{{ __('Real-time tracking of countdown triggers, overdue statuses, and email delivery audits.') }}</p>
          </div>
        </div>

        <!-- Desktop Table (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-6">{{ __('Invoice #') }}</th>
                <th class="py-3 px-6">{{ __('Client Recipient') }}</th>
                <th class="py-3 px-6">{{ __('Deadline & Countdown') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Balance Due') }}</th>
                <th class="py-3 px-6">{{ __('Schedule Cadence') }}</th>
                <th class="py-3 px-6">{{ __('Last Reminder Sent') }}</th>
                <th class="py-3 px-6 text-center">{{ __('Reminders Sent') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="item in filteredRemindersList"
                :key="item.id"
                class="hover:bg-surface-gray-1 transition-colors"
              >
                <!-- Invoice # with Link -->
                <td class="py-4 px-6">
                  <router-link
                    :to="`/invoices/${item.id}`"
                    class="font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60 hover:text-ink-blue-7 dark:hover:text-ink-blue-3 transition-colors inline-block"
                  >
                    {{ item.invoice_number }}
                  </router-link>
                </td>

                <!-- Client Name & Email -->
                <td class="py-4 px-6">
                  <div class="font-semibold text-ink-gray-9">{{ item.client_name }}</div>
                  <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 font-mono">{{ item.client_email || '-' }}</div>
                </td>

                <!-- Deadline & Live Countdown Pill -->
                <td class="py-4 px-6">
                  <div class="text-xs font-medium text-ink-gray-9">{{ item.due_date }}</div>
                  <div class="mt-1">
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs"
                      :class="item.countdown.badgeClasses"
                    >
                      <span :class="item.countdown.icon" class="size-2.5" />
                      <span>{{ item.countdown.badgeLabel }}</span>
                    </span>
                  </div>
                </td>

                <!-- Balance Due -->
                <td class="py-4 px-6 text-right">
                  <div class="font-mono font-bold text-sm" :class="item.countdown.isOverdue ? 'text-ink-red-7 dark:text-ink-red-4' : 'text-ink-amber-3'">
                    {{ business.formatCurrency(item.balance_due, item.currency) }}
                  </div>
                  <div class="text-[10px] text-ink-gray-6 dark:text-ink-gray-5 font-mono">
                    {{ __('Total: {0}', [business.formatCurrency(item.total_amount, item.currency)]) }}
                  </div>
                </td>

                <!-- Schedule Cadence -->
                <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">
                  <span v-if="item.custom_reminder_days" class="inline-flex items-center gap-1 font-semibold text-ink-blue-7 dark:text-ink-blue-3">
                    <span class="lucide-sliders-horizontal size-3" />
                    <span>Custom: {{ item.custom_reminder_days }}</span>
                  </span>
                  <span v-else class="text-ink-gray-7 dark:text-ink-gray-6">
                    Default ({{ business.settings.reminder_days_before || '7, 3, 1' }})
                  </span>
                  <div v-if="item.reminders_enabled === false" class="text-[10px] text-ink-red-7 dark:text-ink-red-4 font-semibold mt-0.5">
                    {{ __('Automated Reminders Paused') }}
                  </div>
                </td>

                <!-- Last Sent Timestamp -->
                <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">
                  {{ item.last_reminder_sent_at ? formatDateTime(item.last_reminder_sent_at) : __('Never') }}
                </td>

                <!-- Sent Count Badge -->
                <td class="py-4 px-6 text-center">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                    :class="item.reminders_sent_count > 0 ? 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2' : 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2'"
                  >
                    {{ item.reminders_sent_count || 0 }}
                  </span>
                </td>

                <!-- Actions: Send Reminder & View -->
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <Button
                      size="xs"
                      variant="outline"
                      iconLeft="lucide-bell"
                      :label="__('Remind')"
                      :tooltip="__('Send Payment Reminder to Client')"
                      @click="openReminderModal(item)"
                    />
                    <router-link :to="`/invoices/${item.id}`">
                      <Button
                        size="xs"
                        variant="ghost"
                        iconLeft="lucide-eye"
                        :tooltip="__('View Invoice Details')"
                      />
                    </router-link>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredRemindersList.length">
                <td colspan="8" class="py-12 text-center text-ink-gray-6 dark:text-ink-gray-4">
                  <span class="lucide-bell-off size-8 text-ink-gray-5 dark:text-ink-gray-4 mx-auto block mb-2" />
                  <p class="text-base font-semibold text-ink-gray-9">{{ __('No matching invoices in reminder queue') }}</p>
                  <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-1">{{ __('All outstanding balances are either settled or do not match current filters.') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="item in filteredRemindersList"
            :key="item.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors space-y-3"
          >
            <!-- Row 1: Invoice # + Countdown Pill + Sent Count -->
            <div class="flex items-center justify-between gap-2">
              <router-link
                :to="`/invoices/${item.id}`"
                class="font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded border border-outline-gray-2/60"
              >
                {{ item.invoice_number }}
              </router-link>

              <span
                class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs"
                :class="item.countdown.badgeClasses"
              >
                <span :class="item.countdown.icon" class="size-2.5" />
                <span>{{ item.countdown.badgeLabel }}</span>
              </span>
            </div>

            <!-- Client Info -->
            <div>
              <div class="font-semibold text-ink-gray-9 text-sm">{{ item.client_name }}</div>
              <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 font-mono">{{ item.client_email }}</div>
            </div>

            <!-- Grid: Due Date, Balance, Schedule, Last Sent -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Due Date') }}</span>
                <span class="font-medium text-ink-gray-9">{{ item.due_date }}</span>
                <span class="text-[10px] text-ink-gray-6 dark:text-ink-gray-5 block mt-0.5">
                  {{ item.custom_reminder_days ? `Custom (${item.custom_reminder_days})` : `Default (${business.settings.reminder_days_before || '7, 3, 1'})` }}
                </span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Balance Due') }}</span>
                <span class="font-mono font-bold text-sm block" :class="item.countdown.isOverdue ? 'text-ink-red-7 dark:text-ink-red-4' : 'text-ink-amber-3'">
                  {{ business.formatCurrency(item.balance_due, item.currency) }}
                </span>
                <span class="text-[10px] text-ink-gray-6 dark:text-ink-gray-5 block mt-0.5">
                  {{ __('Sent: {0} times', [item.reminders_sent_count || 0]) }}
                </span>
              </div>
            </div>

            <!-- Action Footer -->
            <div class="flex items-center justify-between pt-1 border-t border-outline-gray-1/40">
              <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-5">
                {{ __('Last: {0}', [item.last_reminder_sent_at ? formatDateTime(item.last_reminder_sent_at) : __('Never')]) }}
              </span>
              <div class="flex items-center gap-1.5">
                <router-link :to="`/invoices/${item.id}`">
                  <Button size="xs" variant="outline" :label="__('View')" />
                </router-link>
                <Button
                  size="xs"
                  variant="solid"
                  iconLeft="lucide-bell"
                  :label="__('Send Reminder')"
                  @click="openReminderModal(item)"
                />
              </div>
            </div>
          </div>

          <div v-if="!filteredRemindersList.length" class="py-12 text-center text-ink-gray-6 dark:text-ink-gray-4">
            <span class="lucide-bell-off size-8 text-ink-gray-5 dark:text-ink-gray-4 mx-auto block mb-2" />
            <p class="text-base font-semibold text-ink-gray-9">{{ __('No active reminders') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Send Reminder Modal Component -->
    <SendReminderModal
      v-model="showReminderModal"
      :invoice="selectedInvoice"
      @sent="onReminderDispatched"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import SendReminderModal from '@/components/Invoices/SendReminderModal.vue'
import { calculateCountdown } from '@/utils/reminders'
import { isMobileView } from '@/composables/settings'
import { Button, TextInput } from 'frappe-ui'

const business = useBusinessStore()

const searchQuery = ref('')
const selectedTab = ref('all')
const showReminderModal = ref(false)
const selectedInvoice = ref(null)

const testingCron = ref(false)
const cronTestResult = ref(null)

onMounted(async () => {
  await business.fetchInvoicesFromSupabase()
  await business.fetchBusinessSettingsFromSupabase()
})

// Unsettled invoices with balance > 0 and not cancelled
const activeRemindersList = computed(() => {
  return (business.invoices || [])
    .filter((inv) => {
      const balance = Number(inv.balance_due)
      return inv.status !== 'Paid' && inv.status !== 'Cancelled' && !isNaN(balance) && balance > 0
    })
    .map((inv) => {
      const cd = calculateCountdown(inv)
      let badgeClasses = 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2'
      let icon = 'lucide-clock'

      if (cd.isDueToday) {
        badgeClasses = 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2'
        icon = 'lucide-bell-ring'
      } else if (cd.isOverdue) {
        badgeClasses = 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2'
        icon = 'lucide-alert-circle'
      }

      return {
        ...inv,
        countdown: {
          ...cd,
          badgeClasses,
          icon,
        },
      }
    })
    .sort((a, b) => {
      // Prioritize overdue, then due today, then upcoming
      const rank = (item) => {
        if (item.countdown.isOverdue) return 1
        if (item.countdown.isDueToday) return 2
        return 3
      }
      const rA = rank(a)
      const rB = rank(b)
      if (rA !== rB) return rA - rB
      return a.countdown.daysUntilDue - b.countdown.daysUntilDue
    })
})

const overdueInvoices = computed(() => {
  return activeRemindersList.value.filter((i) => i.countdown.isOverdue)
})

const dueTodayInvoices = computed(() => {
  return activeRemindersList.value.filter((i) => i.countdown.isDueToday)
})

const upcomingInvoices = computed(() => {
  return activeRemindersList.value.filter((i) => i.countdown.stage === 'upcoming')
})

const remindedInvoices = computed(() => {
  return activeRemindersList.value.filter((i) => Number(i.reminders_sent_count) > 0)
})

const totalOverdueAmount = computed(() => {
  return overdueInvoices.value.reduce((acc, i) => acc + (Number(i.balance_due) || 0), 0)
})

const totalUpcomingAmount = computed(() => {
  return upcomingInvoices.value.reduce((acc, i) => acc + (Number(i.balance_due) || 0), 0)
})

const totalDispatchedCount = computed(() => {
  return (business.invoices || []).reduce((acc, i) => acc + (Number(i.reminders_sent_count) || 0), 0)
})

const filterTabs = computed(() => [
  { id: 'all', label: 'All Unsettled', count: activeRemindersList.value.length },
  { id: 'overdue', label: 'Overdue (Gentle Notices)', count: overdueInvoices.value.length },
  { id: 'due_today', label: 'Due Today', count: dueTodayInvoices.value.length },
  { id: 'upcoming', label: 'Upcoming', count: upcomingInvoices.value.length },
  { id: 'reminded', label: 'Reminded', count: remindedInvoices.value.length },
])

const filteredRemindersList = computed(() => {
  let list = activeRemindersList.value

  if (selectedTab.value === 'overdue') {
    list = overdueInvoices.value
  } else if (selectedTab.value === 'due_today') {
    list = dueTodayInvoices.value
  } else if (selectedTab.value === 'upcoming') {
    list = upcomingInvoices.value
  } else if (selectedTab.value === 'reminded') {
    list = remindedInvoices.value
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((i) => {
    return (
      (i.invoice_number || '').toLowerCase().includes(q) ||
      (i.client_name || '').toLowerCase().includes(q) ||
      (i.client_email || '').toLowerCase().includes(q)
    )
  })
})

function openReminderModal(inv) {
  selectedInvoice.value = inv
  showReminderModal.value = true
}

function onReminderDispatched() {
  business.fetchInvoicesFromSupabase()
}

function formatDateTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return isoStr.split('T')[0]
  }
}

async function runCronDryRun() {
  testingCron.value = true
  cronTestResult.value = null
  try {
    const token = encodeURIComponent(business.settings.cron_secret_token || 'cr_rem_live_secret')
    const res = await fetch(`/api/cron_reminders.php?token=${token}&dry_run=1`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    cronTestResult.value = {
      success: true,
      message: `Automated Reminder Test: Evaluated ${data.invoices_scanned} invoices, ${data.reminders_triggered} reminders matched today's schedule.`,
    }
  } catch (err) {
    cronTestResult.value = {
      success: false,
      message: err.message || 'Could not connect to automated reminder service.',
    }
  } finally {
    testingCron.value = false
  }
}
</script>
