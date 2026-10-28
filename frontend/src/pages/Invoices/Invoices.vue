<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Invoices') }}</h1>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 font-semibold border border-outline-gray-2/60">
            {{ filteredInvoices.length }}
          </span>
        </div>
      </template>
      <template #right-header>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon="lucide-refresh-cw"
            :tooltip="__('Refresh Invoices')"
            :loading="refreshing"
            @click="refreshInvoices"
          />
          <router-link to="/invoices/new">
            <Button variant="solid" :label="isMobileView ? '' : __('Create Invoice')" iconLeft="lucide-plus" />
          </router-link>
        </div>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6 pb-20 md:pb-6">
      <!-- Invoicing KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Total Revenue') }}</span>
            <span class="lucide-circle-dollar-sign size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-ink-gray-9">{{ business.formatCurrency(business.totalRevenue) }}</div>
          <span class="text-xs text-ink-green-7 dark:text-ink-green-4 mt-1 block">{{ __('Settled via payment transactions') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Outstanding Balance') }}</span>
            <span class="lucide-clock size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-ink-amber-3">{{ business.formatCurrency(business.totalOutstanding) }}</div>
          <span class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1 block">{{ __('Pending payment collection') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Overdue Invoices') }}</span>
            <span class="lucide-alert-triangle size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div class="mt-2 text-2xl font-bold font-mono" :class="business.overdueInvoicesCount > 0 ? 'text-ink-red-7 dark:text-ink-red-4' : 'text-ink-gray-9'">
            {{ business.overdueInvoicesCount }}
          </div>
          <span class="text-xs text-ink-red-7 dark:text-ink-red-4 mt-1 block">{{ __('Requires follow-up action') }}</span>
        </div>

        <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Paid Invoices') }}</span>
            <span class="lucide-check-circle-2 size-4 text-ink-gray-5 dark:text-ink-gray-4" />
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-ink-gray-9">{{ business.paidInvoicesCount }}</div>
          <span class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1 block">{{ __('Fully completed invoices') }}</span>
        </div>
      </div>

      <!-- Filters, Status Tabs & Search Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Status Tabs with Counts -->
        <div class="flex flex-wrap gap-1 bg-surface-gray-2 p-1 rounded-lg text-xs font-medium">
          <button
            v-for="st in statusOptions"
            :key="st"
            class="px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            :class="selectedStatus === st ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-4 hover:text-ink-gray-9'"
            @click="selectedStatus = st"
          >
            <span>{{ __(st) }}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="selectedStatus === st ? 'bg-surface-gray-2 dark:bg-surface-gray-2 text-ink-gray-8 dark:text-ink-gray-2 font-bold' : 'bg-surface-gray-3/50 dark:bg-surface-gray-3/40 text-ink-gray-6 dark:text-ink-gray-4'">
              {{ getStatusCount(st) }}
            </span>
          </button>
        </div>

        <!-- Search Bar and Client Filter -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <select
            v-model="selectedCustomer"
            class="bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-gray-9 focus:outline-none"
          >
            <option value="">{{ __('All Clients') }}</option>
            <option v-for="c in business.clients" :key="c.id" :value="c.id">
              {{ c.company_name }}
            </option>
          </select>

          <div class="w-full sm:w-56">
            <TextInput
              v-model="searchQuery"
              type="search"
              :placeholder="__('Search invoice or client...')"
              iconLeft="lucide-search"
            />
          </div>
        </div>
      </div>

      <!-- Invoices Data Table & Mobile Adaptive Cards -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
        <!-- Desktop Table (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-6">{{ __('Invoice #') }}</th>
                <th class="py-3 px-6">{{ __('Client / Organization') }}</th>
                <th class="py-3 px-6">{{ __('Issue Date') }}</th>
                <th class="py-3 px-6">{{ __('Due Date') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Total Amount') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Balance Due') }}</th>
                <th class="py-3 px-6 text-center">{{ __('Status') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="inv in filteredInvoices"
                :key="inv.id"
                class="hover:bg-surface-gray-1 transition-colors cursor-pointer"
                @click="goToDetail(inv.id)"
              >
                <!-- Invoice # with Monospace Badge -->
                <td class="py-4 px-6">
                  <span class="inline-flex items-center font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60">
                    {{ inv.invoice_number }}
                  </span>
                </td>
                <td class="py-4 px-6">
                  <router-link
                    v-if="inv.customer_id"
                    :to="`/clients/${inv.customer_id}`"
                    class="font-semibold text-ink-gray-9 hover:text-ink-blue-7 dark:hover:text-ink-blue-3 hover:underline"
                    @click.stop
                  >
                    {{ inv.client_name }}
                  </router-link>
                  <div v-else class="font-semibold text-ink-gray-9">{{ inv.client_name }}</div>
                  <div v-if="inv.contact_name" class="text-xs text-ink-gray-6 dark:text-ink-gray-4">{{ inv.contact_name }}</div>
                </td>
                <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">{{ inv.issue_date }}</td>
                <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">
                  <div class="font-medium text-ink-gray-9">{{ inv.due_date }}</div>
                  <div v-if="getInvoiceCountdown(inv)" class="mt-1">
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs"
                      :class="getInvoiceCountdown(inv).classes"
                    >
                      <span :class="getInvoiceCountdown(inv).icon" class="size-2.5" />
                      <span>{{ getInvoiceCountdown(inv).label }}</span>
                    </span>
                  </div>
                </td>
                <td class="py-4 px-6 text-right font-mono font-bold text-ink-gray-9">
                  {{ business.formatCurrency(inv.total_amount, inv.currency) }}
                </td>
                <td class="py-4 px-6 text-right font-mono font-bold" :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-green-7 dark:text-ink-green-4'">
                  {{ business.formatCurrency(inv.balance_due, inv.currency) }}
                </td>
                <td class="py-4 px-6 text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    :class="getStatusClass(inv.status)"
                  >
                    {{ __(inv.status) }}
                  </span>
                </td>
                <td class="py-4 px-6 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                      size="sm"
                      variant="ghost"
                      icon="lucide-check"
                      class="text-ink-green-7 dark:text-ink-green-4 hover:bg-surface-green-2 active:bg-surface-green-3"
                      :tooltip="__('Mark as Paid in Full')"
                      @click="markAsPaidQuick(inv)"
                    />
                    <Button
                      v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                      size="sm"
                      variant="ghost"
                      icon="lucide-credit-card"
                      class="text-ink-gray-7 dark:text-ink-gray-4 hover:text-ink-gray-9 dark:hover:text-ink-gray-2 hover:bg-surface-gray-2 active:bg-surface-gray-3"
                      :tooltip="__('Record Payment')"
                      @click="openPaymentModal(inv)"
                    />
                    <Button
                      v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                      size="sm"
                      variant="ghost"
                      icon="lucide-bell"
                      class="text-ink-amber-8 dark:text-amber-300 hover:bg-surface-amber-2 active:bg-surface-amber-3"
                      :tooltip="__('Send Payment Reminder')"
                      @click="openReminderModal(inv)"
                    />
                    <Button
                      v-if="inv.status === 'Paid' || inv.balance_due <= 0"
                      size="sm"
                      variant="ghost"
                      icon="lucide-file-text"
                      class="text-ink-green-7 dark:text-ink-green-4 hover:bg-surface-green-2 active:bg-surface-green-3"
                      :tooltip="__('Commercial Receipt')"
                      @click="openInvoiceReceipt(inv)"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="lucide-eye"
                      class="text-ink-gray-6 dark:text-ink-gray-4 hover:text-ink-gray-9 dark:hover:text-ink-gray-2 hover:bg-surface-gray-2 active:bg-surface-gray-3"
                      :tooltip="__('View Invoice Details')"
                      @click="goToDetail(inv.id)"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredInvoices.length">
                <td colspan="8" class="py-12 text-center text-ink-gray-5 dark:text-ink-gray-4">
                  <span class="lucide-receipt size-8 text-ink-gray-4 dark:text-ink-gray-5 mx-auto block mb-2" />
                  <p class="text-base font-semibold text-ink-gray-8 dark:text-ink-gray-2">{{ __('No invoices found') }}</p>
                  <p class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1">{{ __('Try adjusting your filters or create a new commercial invoice.') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="inv in filteredInvoices"
            :key="inv.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors cursor-pointer space-y-3"
            @click="goToDetail(inv.id)"
          >
            <!-- Row 1: Document Avatar + Invoice # + Status Badge + Chevron -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="size-8 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center text-ink-blue-7 dark:text-ink-blue-3">
                  <span class="lucide-file-text size-4" />
                </div>
                <span class="font-mono font-bold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2 py-0.5 rounded border border-outline-gray-2/60">
                  {{ inv.invoice_number }}
                </span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  :class="getStatusClass(inv.status)"
                >
                  {{ __(inv.status) }}
                </span>
              </div>
              <span class="lucide-chevron-right size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            </div>

            <!-- Client & Contact Info -->
            <div>
              <div class="font-semibold text-ink-gray-9 text-sm">{{ inv.client_name }}</div>
              <div v-if="inv.contact_name" class="text-xs text-ink-gray-6 dark:text-ink-gray-4">{{ inv.contact_name }}</div>
            </div>

            <!-- Row 2: 2-Column Structured Data Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-4 block">{{ __('Due Date') }}</span>
                <span class="font-medium text-ink-gray-9">{{ inv.due_date }}</span>
                <div v-if="getInvoiceCountdown(inv)" class="mt-0.5">
                  <span
                    class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs"
                    :class="getInvoiceCountdown(inv).classes"
                  >
                    <span :class="getInvoiceCountdown(inv).icon" class="size-2.5" />
                    <span>{{ getInvoiceCountdown(inv).label }}</span>
                  </span>
                </div>
                <span class="text-[10px] text-ink-gray-6 dark:text-ink-gray-4 block mt-0.5">Issued: {{ inv.issue_date }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-4 block">{{ __('Balance Due') }}</span>
                <span
                  class="font-mono font-bold text-sm block"
                  :class="inv.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-green-7 dark:text-ink-green-4'"
                >
                  {{ business.formatCurrency(inv.balance_due, inv.currency) }}
                </span>
                <span class="text-[10px] text-ink-gray-6 dark:text-ink-gray-4 font-mono">Total: {{ business.formatCurrency(inv.total_amount, inv.currency) }}</span>
              </div>
            </div>

            <!-- Row 3: Touch Action Footer (Low-Dominance Outline / Ghost Buttons) -->
            <div class="flex items-center justify-end gap-1.5 pt-1 border-t border-outline-gray-1/40" @click.stop>
              <Button
                v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                size="sm"
                variant="subtle"
                theme="green"
                icon="lucide-check"
                :tooltip="__('Mark as Paid in Full')"
                @click="markAsPaidQuick(inv)"
              />
              <Button
                v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                size="sm"
                variant="outline"
                iconLeft="lucide-credit-card"
                :label="__('Pay')"
                @click="openPaymentModal(inv)"
              />
              <Button
                v-if="inv.balance_due > 0 && inv.status !== 'Cancelled'"
                size="sm"
                variant="outline"
                iconLeft="lucide-bell"
                :label="__('Remind')"
                @click="openReminderModal(inv)"
              />
              <Button
                v-if="inv.status === 'Paid' || inv.balance_due <= 0"
                size="sm"
                variant="outline"
                theme="green"
                iconLeft="lucide-file-text"
                :label="__('Receipt')"
                @click="openInvoiceReceipt(inv)"
              />
              <Button
                size="sm"
                variant="ghost"
                iconRight="lucide-arrow-right"
                :label="__('View')"
                @click="goToDetail(inv.id)"
              />
            </div>
          </div>

          <div v-if="!filteredInvoices.length" class="py-12 text-center text-ink-gray-5 dark:text-ink-gray-4">
            <span class="lucide-receipt size-8 text-ink-gray-4 dark:text-ink-gray-5 mx-auto block mb-2" />
            <p class="text-base font-semibold text-ink-gray-8 dark:text-ink-gray-2">{{ __('No invoices found') }}</p>
            <p class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1">{{ __('Try adjusting your filter or create a new invoice.') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Record Payment Modal Component -->
    <RecordPaymentModal
      v-model="showPaymentModal"
      :invoice="selectedInvoice"
      @paymentRecorded="onPaymentSuccess"
    />

    <!-- Commercial Receipt Modal Component -->
    <CommercialReceiptModal
      v-model="showReceiptModal"
      :invoice="selectedInvoice"
      :payment="selectedPayment"
    />

    <!-- Send Payment Reminder Modal -->
    <SendReminderModal
      v-model="showReminderModal"
      :invoice="selectedInvoice"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { isMobileView } from '@/composables/settings'
import RecordPaymentModal from '@/components/Invoices/RecordPaymentModal.vue'
import CommercialReceiptModal from '@/components/Common/CommercialReceiptModal.vue'
import SendReminderModal from '@/components/Invoices/SendReminderModal.vue'
import { calculateCountdown } from '@/utils/reminders'
import { Button, TextInput } from 'frappe-ui'

const router = useRouter()
const business = useBusinessStore()

const selectedStatus = ref('All')
const selectedCustomer = ref('')
const searchQuery = ref('')
const showPaymentModal = ref(false)
const showReceiptModal = ref(false)
const showReminderModal = ref(false)
const selectedInvoice = ref(null)
const selectedPayment = ref(null)
const refreshing = ref(false)

const statusOptions = ['All', 'Issued', 'Partially paid', 'Paid', 'Overdue', 'Draft', 'Cancelled']

onMounted(async () => {
  await business.fetchInvoicesFromSupabase()
  if (!business.clients || business.clients.length === 0) {
    await business.fetchClientsFromSupabase()
  }
})

async function refreshInvoices() {
  refreshing.value = true
  try {
    await business.fetchInvoicesFromSupabase()
  } finally {
    refreshing.value = false
  }
}

function getStatusCount(status) {
  if (status === 'All') return business.invoices.length
  return business.invoices.filter((i) => i.status === status).length
}

const filteredInvoices = computed(() => {
  return business.invoices.filter((inv) => {
    // Status filter
    if (selectedStatus.value !== 'All' && inv.status !== selectedStatus.value) {
      return false
    }
    // Customer organization filter
    if (selectedCustomer.value && inv.customer_id !== selectedCustomer.value) {
      return false
    }
    // Search query
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchNum = inv.invoice_number?.toLowerCase().includes(q)
      const matchClient = inv.client_name?.toLowerCase().includes(q)
      const matchContact = inv.contact_name?.toLowerCase().includes(q)
      return matchNum || matchClient || matchContact
    }
    return true
  })
})

function goToDetail(id) {
  router.push({ path: `/invoices/${id}` })
}

function openPaymentModal(inv) {
  selectedInvoice.value = inv
  showPaymentModal.value = true
}

function openReminderModal(inv) {
  selectedInvoice.value = inv
  showReminderModal.value = true
}

function getInvoiceCountdown(inv) {
  if (inv.status === 'Paid' || inv.status === 'Cancelled' || Number(inv.balance_due) <= 0) {
    return null
  }
  const cd = calculateCountdown(inv)
  if (cd.isDueToday) {
    return {
      label: 'Due Today',
      icon: 'lucide-bell-ring',
      classes: 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2',
    }
  }
  if (cd.isOverdue) {
    return {
      label: `${cd.daysPastDue}d overdue`,
      icon: 'lucide-alert-circle',
      classes: 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2',
    }
  }
  return {
    label: `Due in ${cd.daysUntilDue}d`,
    icon: 'lucide-clock',
    classes: 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2',
  }
}

async function markAsPaidQuick(inv) {
  if (confirm(`Mark invoice ${inv.invoice_number} as PAID IN FULL?`)) {
    try {
      await business.markInvoiceAsPaid(inv.id)
    } catch (err) {
      alert(err.message || 'Failed to mark as paid')
    }
  }
}

function openInvoiceReceipt(inv) {
  selectedInvoice.value = inv
  // If invoice has recorded payments, use the most recent; else synthesize from invoice
  if (inv.payments && inv.payments.length > 0) {
    selectedPayment.value = inv.payments[0]
  } else {
    selectedPayment.value = {
      id: `rec-${inv.id}`,
      receipt_number: `REC-${inv.invoice_number}`,
      transaction_ref: `TXN-${inv.invoice_number}`,
      amount: inv.total_amount,
      currency: inv.currency,
      payment_method: 'Direct Settlement',
      payment_date: inv.issue_date,
      status: 'Settled',
      notes: 'Settled in full',
    }
  }
  showReceiptModal.value = true
}

function onPaymentSuccess() {
  // Store is reactive, modal auto updates
}

function getStatusClass(status) {
  switch (status) {
    case 'Paid':
      return 'status-badge-paid bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 font-semibold'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2 font-semibold'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2 font-semibold'
    case 'Partially paid':
    case 'Partially Paid':
      return 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2 font-semibold'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2 font-medium'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-5 dark:text-ink-gray-4 line-through border border-outline-gray-2 font-medium'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2 font-medium'
  }
}
</script>

<style>
:root[data-theme='dark'] .status-badge-paid,
.dark .status-badge-paid {
  background-color: rgba(16, 185, 129, 0.18) !important;
  border-color: rgba(16, 185, 129, 0.45) !important;
  color: #34d399 !important;
}
</style>
