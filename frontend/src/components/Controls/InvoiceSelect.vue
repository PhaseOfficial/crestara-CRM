<template>
  <div ref="containerRef" class="relative w-full text-xs">
    <!-- Selected Invoice Display / Trigger -->
    <div
      v-if="selectedInvoice"
      class="flex items-center justify-between p-2 rounded-lg border border-outline-gray-2 bg-surface-base hover:border-outline-gray-3 transition-colors shadow-2xs group"
    >
      <div
        class="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
        @click="toggleDropdown"
      >
        <div
          class="size-7 rounded-md flex items-center justify-center shrink-0 border"
          :class="getStatusBadge(selectedInvoice.status).iconWrapper"
        >
          <span class="lucide-file-text size-3.5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 font-bold text-ink-gray-9 truncate">
            <span class="font-mono">{{ selectedInvoice.invoice_number }}</span>
            <span
              class="px-1.5 py-0.2 rounded text-[10px] font-semibold border"
              :class="getStatusBadge(selectedInvoice.status).badge"
            >
              {{ selectedInvoice.status || 'Active' }}
            </span>
          </div>
          <div class="text-[11px] text-ink-gray-6 truncate flex items-center gap-1">
            <span>{{ selectedInvoice.client_name || __('Client') }}</span>
            <span>•</span>
            <span class="font-semibold text-ink-gray-8">
              {{ formatInvoiceAmount(selectedInvoice) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1 shrink-0 ml-2">
        <button
          type="button"
          class="px-2 py-1 rounded text-[11px] font-semibold text-ink-gray-7 hover:text-ink-gray-9 hover:bg-surface-gray-2 transition-colors"
          @click="toggleDropdown"
        >
          {{ __('Change') }}
        </button>
        <button
          v-if="clearable"
          type="button"
          class="p-1 rounded text-ink-gray-4 hover:text-ink-red-7 hover:bg-surface-red-2 transition-colors"
          :title="__('Clear selected invoice')"
          @click="clearSelection"
        >
          <span class="lucide-x size-3.5" />
        </button>
      </div>
    </div>

    <!-- Empty Trigger Button (Search Bar Appearance) -->
    <button
      v-else
      type="button"
      class="w-full flex items-center justify-between bg-surface-base border border-outline-gray-2 rounded-lg px-2.5 py-1.5 text-ink-gray-7 hover:border-outline-gray-3 focus:border-outline-gray-4 focus:ring-2 focus:ring-outline-gray-3/20 transition-all shadow-2xs text-left"
      :class="size === 'sm' ? 'h-8' : 'h-9'"
      @click="openDropdown"
    >
      <div class="flex items-center gap-2 min-w-0 text-ink-gray-5">
        <span class="lucide-search size-4 shrink-0" />
        <span class="truncate text-xs">{{ placeholder || __('Search & select an invoice...') }}</span>
      </div>
      <span
        class="lucide-chevron-down size-3.5 text-ink-gray-4 shrink-0 transition-transform duration-150"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>

    <!-- Floating Search Dropdown Panel -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-base border border-outline-gray-2 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-72 min-w-64"
      >
        <!-- Search Bar Header -->
        <div class="p-2 border-b border-outline-gray-1 bg-surface-gray-1/60">
          <div class="relative flex items-center">
            <span class="lucide-search size-3.5 text-ink-gray-5 absolute left-2.5 pointer-events-none" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              :placeholder="__('Search by invoice #, client, status...')"
              class="w-full bg-surface-base border border-outline-gray-2 rounded-md pl-8 pr-7 py-1.5 text-xs text-ink-gray-9 placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              @keydown.escape="closeDropdown"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2 text-ink-gray-4 hover:text-ink-gray-7 p-0.5 rounded"
              :title="__('Clear search')"
              @click="searchQuery = ''"
            >
              <span class="lucide-x size-3" />
            </button>
          </div>
        </div>

        <!-- Scrollable Results List -->
        <div class="overflow-y-auto divide-y divide-outline-gray-1/40 p-1 flex-1">
          <!-- Option: None / Remove Link -->
          <div
            v-if="clearable"
            class="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-gray-1 cursor-pointer transition-colors text-ink-gray-6"
            :class="!modelValue ? 'bg-surface-gray-2 font-semibold text-ink-gray-9' : ''"
            @click="clearSelection"
          >
            <span class="lucide-ban size-3.5 text-ink-gray-4" />
            <span class="text-xs">{{ __('None (No Linked Invoice)') }}</span>
          </div>

          <!-- Matched Invoices -->
          <div
            v-for="inv in filteredInvoices"
            :key="inv.id"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-gray-1 cursor-pointer transition-colors"
            :class="modelValue === inv.id ? 'bg-surface-blue-2/40' : ''"
            @click="selectInvoice(inv)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <div
                class="size-6 rounded flex items-center justify-center shrink-0 border"
                :class="getStatusBadge(inv.status).iconWrapper"
              >
                <span class="lucide-file-text size-3" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 font-bold text-ink-gray-9 truncate">
                  <span class="font-mono text-xs">{{ inv.invoice_number }}</span>
                  <span
                    class="px-1.5 py-0.2 rounded text-[10px] font-semibold border"
                    :class="getStatusBadge(inv.status).badge"
                  >
                    {{ inv.status || 'Active' }}
                  </span>
                </div>
                <div class="text-[11px] text-ink-gray-6 truncate">
                  {{ inv.client_name || __('Client') }}
                  <span v-if="inv.due_date"> • Due {{ inv.due_date }}</span>
                </div>
              </div>
            </div>

            <div class="shrink-0 text-right ml-2 font-mono font-bold text-ink-gray-9 text-xs">
              {{ formatInvoiceAmount(inv) }}
            </div>
          </div>

          <!-- Empty Results State -->
          <div
            v-if="!filteredInvoices.length"
            class="py-6 text-center text-ink-gray-5 space-y-1"
          >
            <span class="lucide-file-search size-5 mx-auto block text-ink-gray-4" />
            <p class="text-xs font-semibold text-ink-gray-7">
              {{ __('No invoices matching "{0}"', [searchQuery]) }}
            </p>
            <p class="text-[11px] text-ink-gray-5">
              {{ __('Try searching by invoice number or client name.') }}
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'sm' },
  clearable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'change'])

const business = useBusinessStore()

const containerRef = ref(null)
const searchInputRef = ref(null)
const isOpen = ref(false)
const searchQuery = ref('')

const selectedInvoice = computed(() => {
  if (!props.modelValue) return null
  return (business.invoices || []).find(
    (i) => i.id === props.modelValue || i.invoice_number === props.modelValue,
  )
})

const filteredInvoices = computed(() => {
  const list = business.invoices || []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((inv) => {
    const num = (inv.invoice_number || '').toLowerCase()
    const client = (inv.client_name || '').toLowerCase()
    const status = (inv.status || '').toLowerCase()
    const amt = String(inv.total_amount || '')
    const due = (inv.due_date || '').toLowerCase()
    return (
      num.includes(q) ||
      client.includes(q) ||
      status.includes(q) ||
      amt.includes(q) ||
      due.includes(q)
    )
  })
})

function formatInvoiceAmount(inv) {
  const sym = inv.currency || business.settings.currency || '$'
  const val = Number(inv.total_amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${sym}${val}`
}

function getStatusBadge(status) {
  switch (status) {
    case 'Paid':
      return {
        badge: 'bg-surface-green-2 text-ink-green-7 border-outline-green-2',
        iconWrapper: 'bg-surface-green-2 border-outline-green-2 text-ink-green-7',
      }
    case 'Overdue':
      return {
        badge: 'bg-surface-red-2 text-ink-red-7 border-outline-red-2',
        iconWrapper: 'bg-surface-red-2 border-outline-red-2 text-ink-red-7',
      }
    case 'Partially Paid':
      return {
        badge: 'bg-surface-amber-2 text-ink-amber-7 border-outline-amber-2',
        iconWrapper: 'bg-surface-amber-2 border-outline-amber-2 text-ink-amber-7',
      }
    default:
      return {
        badge: 'bg-surface-blue-2 text-ink-blue-7 border-outline-blue-2',
        iconWrapper: 'bg-surface-blue-2 border-outline-blue-2 text-ink-blue-7',
      }
  }
}

function openDropdown() {
  isOpen.value = true
  searchQuery.value = ''
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function closeDropdown() {
  isOpen.value = false
  searchQuery.value = ''
}

function toggleDropdown() {
  if (isOpen.value) {
    closeDropdown()
  } else {
    openDropdown()
  }
}

function selectInvoice(inv) {
  emit('update:modelValue', inv.id)
  emit('change', inv)
  closeDropdown()
}

function clearSelection() {
  emit('update:modelValue', '')
  emit('change', null)
  closeDropdown()
}

function handleClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (!business.invoices || !business.invoices.length) {
    business.fetchInvoicesFromSupabase?.().catch(() => {})
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
