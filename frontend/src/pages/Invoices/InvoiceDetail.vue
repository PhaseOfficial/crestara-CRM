<template>
  <div class="flex flex-col h-full overflow-hidden bg-surface-gray-2">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-3">
          <router-link to="/invoices" class="p-1.5 rounded-md hover:bg-surface-gray-2 text-ink-gray-6">
            <span class="lucide-arrow-left size-5" />
          </router-link>
          <div>
            <h1 class="text-lg font-bold text-ink-gray-9">
              {{ isNew ? __('New Invoice') : invoice.invoice_number }}
            </h1>
            <span
              v-if="!isNew"
              class="text-xs px-2 py-0.5 rounded-full font-semibold"
              :class="getStatusClass(invoice.status)"
            >
              {{ invoice.status }}
            </span>
          </div>
        </div>
      </template>

      <template #right-header>
        <div class="flex items-center gap-2">
          <Button
            v-if="!isNew && invoice.balance_due > 0 && invoice.status !== 'Cancelled'"
            variant="solid"
            :label="__('Record Payment')"
            iconLeft="credit-card"
            @click="showPaymentModal = true"
          />
          <Button
            v-if="!isNew"
            variant="outline"
            :label="__('Print / PDF')"
            iconLeft="printer"
            @click="printInvoice"
          />
          <Button
            v-if="!isNew && invoice.status !== 'Cancelled' && invoice.status !== 'Paid'"
            variant="outline"
            theme="red"
            :label="__('Cancel Invoice')"
            @click="cancelCurrentInvoice"
          />
          <Button
            variant="solid"
            :label="isNew ? __('Create & Issue') : __('Save Changes')"
            :loading="saving"
            @click="saveInvoice"
          />
        </div>
      </template>
    </LayoutHeader>

    <!-- Invoice Sheet -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-8">
      <div class="max-w-4xl mx-auto bg-surface-base rounded-2xl border border-outline-gray-1 p-8 shadow-sm space-y-8">
        <!-- Top Row: Business Branding & Invoice Metadata -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-outline-gray-1 pb-6">
          <div>
            <img src="/crestara_logo.png" alt="Crestara CRM" class="h-10 w-auto object-contain" />
            <p class="text-xs text-ink-gray-5 mt-2 whitespace-pre-line">{{ business.settings.business_address }}</p>
            <p class="text-xs text-ink-gray-5 mt-1">Tax ID: {{ business.settings.tax_id }}</p>
          </div>

          <div class="space-y-3 sm:text-right min-w-[240px]">
            <h2 class="text-2xl font-bold text-ink-gray-9 tracking-tight">
              {{ isNew ? __('DRAFT INVOICE') : invoice.invoice_number }}
            </h2>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <span class="text-ink-gray-5 sm:text-right font-medium">{{ __('Issue Date:') }}</span>
              <input
                v-model="invoice.issue_date"
                type="date"
                class="bg-surface-gray-1 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none"
              />
              <span class="text-ink-gray-5 sm:text-right font-medium">{{ __('Due Date:') }}</span>
              <input
                v-model="invoice.due_date"
                type="date"
                class="bg-surface-gray-1 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none"
              />
              <span class="text-ink-gray-5 sm:text-right font-medium">{{ __('Terms:') }}</span>
              <select
                v-model="invoice.payment_terms"
                class="bg-surface-gray-1 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Bill To Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-surface-gray-1 p-5 rounded-xl border border-outline-gray-1">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-ink-gray-5 mb-2">{{ __('Billed To Client') }}</h3>
            <div class="space-y-2">
              <input
                v-model="invoice.client_name"
                type="text"
                :placeholder="__('Client or Company Name')"
                class="w-full bg-surface-base rounded-md px-3 py-1.5 text-sm border border-outline-gray-2 text-ink-gray-9 font-semibold focus:outline-none"
                required
              />
              <input
                v-model="invoice.contact_name"
                type="text"
                :placeholder="__('Primary Contact Person')"
                class="w-full bg-surface-base rounded-md px-3 py-1.5 text-xs border border-outline-gray-2 text-ink-gray-8 focus:outline-none"
              />
              <input
                v-model="invoice.client_email"
                type="email"
                :placeholder="__('Billing Email Address')"
                class="w-full bg-surface-base rounded-md px-3 py-1.5 text-xs border border-outline-gray-2 text-ink-gray-8 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-ink-gray-5 mb-2">{{ __('Quick Fill from Inventory') }}</h3>
            <p class="text-xs text-ink-gray-5 mb-2">{{ __('Select an item to add it as a new line item:') }}</p>
            <select
              class="w-full bg-surface-base rounded-md px-3 py-2 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none"
              @change="addItemFromInventory($event.target.value); $event.target.value = ''"
            >
              <option value="">{{ __('+ Select product or service...') }}</option>
              <option v-for="prod in business.inventory" :key="prod.id" :value="prod.id">
                {{ prod.name }} (${{ prod.unit_price }}) - {{ prod.type }}
              </option>
            </select>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-ink-gray-9">{{ __('Line Items') }}</h3>
            <Button size="sm" variant="outline" :label="__('Add Custom Item')" iconLeft="plus" @click="addCustomItem" />
          </div>

          <div class="border border-outline-gray-1 rounded-xl overflow-hidden">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4">{{ __('Item & Description') }}</th>
                  <th class="py-3 px-3 w-24 text-center">{{ __('Qty') }}</th>
                  <th class="py-3 px-3 w-32 text-right">{{ __('Unit Price ($)') }}</th>
                  <th class="py-3 px-4 w-32 text-right">{{ __('Amount ($)') }}</th>
                  <th class="py-3 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="(item, idx) in invoice.items" :key="item.id || idx">
                  <td class="py-3 px-4">
                    <input
                      v-model="item.name"
                      type="text"
                      :placeholder="__('Item title')"
                      class="w-full bg-transparent font-medium text-ink-gray-9 focus:outline-none"
                    />
                    <input
                      v-model="item.code"
                      type="text"
                      :placeholder="__('Item code/SKU')"
                      class="w-full bg-transparent text-xs text-ink-gray-4 font-mono focus:outline-none mt-0.5"
                    />
                  </td>
                  <td class="py-3 px-3">
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="1"
                      class="w-full text-center bg-surface-gray-1 border border-outline-gray-2 rounded py-1 text-sm font-semibold text-ink-gray-9 focus:outline-none"
                      @input="recalculateTotals"
                    />
                  </td>
                  <td class="py-3 px-3 text-right">
                    <input
                      v-model.number="item.unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full text-right bg-surface-gray-1 border border-outline-gray-2 rounded py-1 px-2 text-sm font-semibold text-ink-gray-9 focus:outline-none"
                      @input="recalculateTotals"
                    />
                  </td>
                  <td class="py-3 px-4 text-right font-bold text-ink-gray-9">
                    ${{ formatNum(item.quantity * item.unit_price) }}
                  </td>
                  <td class="py-3 px-2 text-center">
                    <button
                      v-if="invoice.items.length > 1"
                      class="p-1 rounded text-ink-gray-4 hover:text-red-600"
                      @click="removeItem(idx)"
                    >
                      <span class="lucide-trash-2 size-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals & Summary Calculation -->
        <div class="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-outline-gray-1">
          <!-- Notes & Payment Terms -->
          <div class="flex-1 space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-ink-gray-5">{{ __('Notes / Instructions') }}</label>
            <textarea
              v-model="invoice.notes"
              rows="3"
              class="w-full bg-surface-gray-1 border border-outline-gray-2 rounded-lg p-3 text-xs text-ink-gray-8 focus:outline-none"
              placeholder="Payment instructions or terms..."
            />
          </div>

          <!-- Financial Calculation Box -->
          <div class="w-full sm:w-80 space-y-2.5 text-sm">
            <div class="flex justify-between text-ink-gray-6">
              <span>{{ __('Subtotal:') }}</span>
              <span class="font-medium text-ink-gray-9">${{ formatNum(invoice.subtotal) }}</span>
            </div>

            <div class="flex items-center justify-between text-ink-gray-6">
              <span class="flex items-center gap-1.5">
                {{ __('Discount (%):') }}
                <input
                  v-model.number="invoice.discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  class="w-16 bg-surface-gray-1 border border-outline-gray-2 rounded px-1.5 py-0.5 text-xs text-right font-semibold"
                  @input="recalculateTotals"
                />
              </span>
              <span class="text-ink-gray-7">-${{ formatNum(invoice.discount_amount) }}</span>
            </div>

            <div class="flex items-center justify-between text-ink-gray-6">
              <span class="flex items-center gap-1.5">
                {{ __('Tax (%):') }}
                <input
                  v-model.number="invoice.tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  class="w-16 bg-surface-gray-1 border border-outline-gray-2 rounded px-1.5 py-0.5 text-xs text-right font-semibold"
                  @input="recalculateTotals"
                />
              </span>
              <span class="text-ink-gray-7">+${{ formatNum(invoice.tax_amount) }}</span>
            </div>

            <div class="border-t border-outline-gray-1 pt-2 flex justify-between font-bold text-lg text-ink-gray-9">
              <span>{{ __('Grand Total:') }}</span>
              <span>${{ formatNum(invoice.total_amount) }}</span>
            </div>

            <div v-if="!isNew" class="flex justify-between text-ink-green-3 font-medium">
              <span>{{ __('Amount Paid:') }}</span>
              <span>${{ formatNum(invoice.amount_paid) }}</span>
            </div>

            <div v-if="!isNew" class="flex justify-between font-bold text-base" :class="invoice.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-6'">
              <span>{{ __('Balance Due:') }}</span>
              <span>${{ formatNum(invoice.balance_due) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Record Payment Modal Component -->
    <RecordPaymentModal
      v-model="showPaymentModal"
      :invoice="invoice"
      @paymentRecorded="onPaymentRecorded"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import RecordPaymentModal from '@/components/Invoices/RecordPaymentModal.vue'
import { Button } from 'frappe-ui'

const route = useRoute()
const router = useRouter()
const business = useBusinessStore()

const isNew = computed(() => route.params.invoiceId === 'new' || !route.params.invoiceId)
const saving = ref(false)
const showPaymentModal = ref(false)

const invoice = reactive({
  id: '',
  invoice_number: '',
  client_name: '',
  client_email: '',
  contact_name: '',
  organization_name: '',
  status: 'Issued',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  payment_terms: 'Net 30',
  currency: 'USD',
  tax_rate: business.settings.tax_rate || 8.5,
  discount_percentage: 0,
  subtotal: 0,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 0,
  amount_paid: 0,
  balance_due: 0,
  items: [
    {
      id: 'item-1',
      product_id: null,
      code: '',
      name: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ],
  notes: business.settings.notes_template || '',
})

onMounted(() => {
  if (!isNew.value) {
    const existing = business.invoices.find((i) => i.id === route.params.invoiceId)
    if (existing) {
      Object.assign(invoice, JSON.parse(JSON.stringify(existing)))
    } else {
      router.replace({ path: '/invoices' })
    }
  }
})

function addItemFromInventory(productId) {
  const prod = business.inventory.find((p) => p.id === productId)
  if (!prod) return
  invoice.items.push({
    id: `item-${Date.now()}`,
    product_id: prod.id,
    code: prod.code,
    name: prod.name,
    quantity: 1,
    unit_price: prod.unit_price,
    amount: prod.unit_price,
  })
  recalculateTotals()
}

function addCustomItem() {
  invoice.items.push({
    id: `item-${Date.now()}`,
    product_id: null,
    code: 'CUSTOM',
    name: 'Consulting / Custom Service',
    quantity: 1,
    unit_price: 150.0,
    amount: 150.0,
  })
  recalculateTotals()
}

function removeItem(idx) {
  invoice.items.splice(idx, 1)
  recalculateTotals()
}

function recalculateTotals() {
  const subtotal = invoice.items.reduce((acc, item) => {
    item.amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    return acc + item.amount
  }, 0)
  const discountAmount = (subtotal * (Number(invoice.discount_percentage) || 0)) / 100
  const taxable = Math.max(0, subtotal - discountAmount)
  const taxAmount = (taxable * (Number(invoice.tax_rate) || 0)) / 100
  const total = taxable + taxAmount

  invoice.subtotal = Number(subtotal.toFixed(2))
  invoice.discount_amount = Number(discountAmount.toFixed(2))
  invoice.tax_amount = Number(taxAmount.toFixed(2))
  invoice.total_amount = Number(total.toFixed(2))
  invoice.balance_due = Number(Math.max(0, invoice.total_amount - (invoice.amount_paid || 0)).toFixed(2))
}

function saveInvoice() {
  if (!invoice.client_name) {
    alert('Please enter a client or company name')
    return
  }
  saving.value = true
  recalculateTotals()

  setTimeout(() => {
    saving.value = false
    if (isNew.value) {
      const created = business.createInvoice(invoice)
      router.replace({ path: `/invoices/${created.id}` })
    } else {
      business.updateInvoice(invoice.id, invoice)
      alert('Invoice updated successfully!')
    }
  }, 400)
}

function cancelCurrentInvoice() {
  if (confirm('Are you sure you want to cancel this invoice?')) {
    business.cancelInvoice(invoice.id)
    invoice.status = 'Cancelled'
    invoice.balance_due = 0
  }
}

function onPaymentRecorded({ invoice: updatedInv }) {
  invoice.amount_paid = updatedInv.amount_paid
  invoice.balance_due = updatedInv.balance_due
  invoice.status = updatedInv.status
}

function printInvoice() {
  window.print()
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getStatusClass(status) {
  switch (status) {
    case 'Paid':
      return 'bg-surface-green-2 text-ink-green-7 border border-outline-green-2'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 border border-outline-red-2'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2'
    case 'Partially paid':
      return 'bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-2'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-4 line-through'
    default:
      return 'bg-surface-gray-2 text-ink-gray-6'
  }
}
</script>
