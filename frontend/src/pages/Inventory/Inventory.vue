<template>
  <div class="flex flex-col h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Inventory & Services') }}</h1>
          <span class="text-xs px-2 py-0.5 rounded-full bg-surface-gray-2 text-ink-gray-6 font-semibold">
            {{ filteredInventory.length }}
          </span>
        </div>
      </template>
      <template #right-header>
        <Button variant="solid" :label="isMobileView ? '' : __('Add Product / Service')" iconLeft="plus" @click="openAddModal" />
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Low Stock Alert Banner -->
      <div v-if="business.lowStockItems.length" class="bg-surface-amber-2 border border-outline-amber-2 rounded-xl p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="lucide-alert-triangle size-5 text-ink-amber-7 shrink-0" />
          <div>
            <h4 class="text-xs font-bold text-ink-amber-7">{{ __('Low Stock Warning') }}</h4>
            <p class="text-xs text-ink-amber-7 opacity-90 mt-0.5">
              {{ __('The following items are running below reorder threshold: {0}', [business.lowStockItems.map(i => `${i.name} (${i.quantity_in_stock} left)`).join(', ')]) }}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" :label="__('Dismiss')" @click="dismissAlert = true" />
      </div>

      <!-- Filters & Search -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <select
            v-model="selectedType"
            class="bg-surface-gray-1 border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-gray-9 focus:outline-none"
          >
            <option value="All">{{ __('All Types (Products & Services)') }}</option>
            <option value="Product">{{ __('Tracked Products Only') }}</option>
            <option value="Service">{{ __('Services Only') }}</option>
          </select>

          <select
            v-model="selectedCategory"
            class="bg-surface-gray-1 border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-gray-9 focus:outline-none"
          >
            <option value="All">{{ __('All Categories') }}</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="w-full sm:w-64">
          <TextInput
            v-model="searchQuery"
            type="search"
            :placeholder="__('Search item name or code...')"
            iconLeft="search"
          />
        </div>
      </div>

      <!-- Inventory Table & Mobile Adaptive Cards -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
        <!-- Desktop Table (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-6">{{ __('Code / SKU') }}</th>
                <th class="py-3 px-6">{{ __('Product / Service Name') }}</th>
                <th class="py-3 px-6">{{ __('Category') }}</th>
                <th class="py-3 px-6">{{ __('Type') }}</th>
                <th class="py-3 px-6">{{ __('Unit Price') }}</th>
                <th class="py-3 px-6">{{ __('Stock Level') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="item in filteredInventory"
                :key="item.id"
                class="hover:bg-surface-gray-1 transition-colors"
              >
                <td class="py-4 px-6 font-mono text-xs font-semibold text-ink-gray-9">
                  {{ item.code }}
                </td>
                <td class="py-4 px-6">
                  <div class="font-medium text-ink-gray-9">{{ item.name }}</div>
                  <div class="text-xs text-ink-gray-4 line-clamp-1">{{ item.description }}</div>
                </td>
                <td class="py-4 px-6 text-ink-gray-7">{{ item.category }}</td>
                <td class="py-4 px-6">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="item.type === 'Product' ? 'bg-surface-blue-2 text-ink-blue-7' : 'bg-surface-purple-2 text-ink-purple-7'"
                  >
                    {{ item.type }}
                  </span>
                </td>
                <td class="py-4 px-6 font-bold text-ink-gray-9">
                  ${{ formatNum(item.unit_price) }}
                </td>
                <td class="py-4 px-6">
                  <span v-if="!item.track_stock" class="text-xs text-ink-gray-4">
                    {{ __('Non-stock / Service') }}
                  </span>
                  <div v-else class="flex items-center gap-2">
                    <span class="font-bold text-sm" :class="item.quantity_in_stock <= item.low_stock_threshold ? 'text-ink-red-3' : 'text-ink-gray-9'">
                      {{ item.quantity_in_stock }} units
                    </span>
                    <span
                      v-if="item.quantity_in_stock <= item.low_stock_threshold"
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-red-2 text-ink-red-7 border border-outline-red-2"
                    >
                      {{ __('Low Stock') }}
                    </span>
                  </div>
                </td>
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" iconLeft="edit-2" @click="openEditModal(item)" />
                    <Button size="sm" variant="ghost" theme="red" iconLeft="trash-2" @click="deleteItem(item.id)" />
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredInventory.length">
                <td colspan="7" class="py-12 text-center text-ink-gray-4">
                  <p class="text-base font-semibold text-ink-gray-7">{{ __('No inventory items found') }}</p>
                  <p class="text-xs mt-1">{{ __('Add your first product or service above.') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="item in filteredInventory"
            :key="item.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors space-y-3"
          >
            <!-- Top: Code/SKU + Type Badge -->
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono font-bold text-ink-gray-9 text-xs">{{ item.code }}</span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                :class="item.type === 'Product' ? 'bg-surface-blue-2 text-ink-blue-7' : 'bg-surface-purple-2 text-ink-purple-7'"
              >
                {{ item.type }}
              </span>
            </div>

            <!-- Name, Category & Description -->
            <div>
              <div class="font-semibold text-ink-gray-9 text-sm">{{ item.name }}</div>
              <div class="text-xs text-ink-gray-5">{{ item.category }}</div>
              <div v-if="item.description" class="text-xs text-ink-gray-4 line-clamp-2 mt-1">
                {{ item.description }}
              </div>
            </div>

            <!-- Pricing & Stock Details Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/60 p-2.5 rounded-lg items-center">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Unit Price') }}</span>
                <span class="font-bold text-sm text-ink-gray-9">${{ formatNum(item.unit_price) }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Stock Level') }}</span>
                <span v-if="!item.track_stock" class="text-ink-gray-5 text-xs">
                  {{ __('Service') }}
                </span>
                <div v-else class="flex items-center justify-end gap-1.5 mt-0.5">
                  <span class="font-bold text-sm" :class="item.quantity_in_stock <= item.low_stock_threshold ? 'text-ink-red-3' : 'text-ink-gray-9'">
                    {{ item.quantity_in_stock }} units
                  </span>
                  <span
                    v-if="item.quantity_in_stock <= item.low_stock_threshold"
                    class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-surface-red-2 text-ink-red-7 border border-outline-red-2"
                  >
                    {{ __('Low') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-gray-1/40">
              <Button size="sm" variant="outline" iconLeft="edit-2" :label="__('Edit')" @click="openEditModal(item)" />
              <Button size="sm" variant="subtle" theme="red" iconLeft="trash-2" :label="__('Delete')" @click="deleteItem(item.id)" />
            </div>
          </div>

          <div v-if="!filteredInventory.length" class="py-12 text-center text-ink-gray-4">
            <span class="lucide-package size-8 text-ink-gray-4 mx-auto block mb-2" />
            <p class="text-base font-semibold text-ink-gray-7">{{ __('No inventory items found') }}</p>
            <p class="text-xs mt-1">{{ __('Add your first product or service above.') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <Dialog v-model:open="showModal" :size="'md'">
      <template #body>
        <div class="p-6 bg-surface-base space-y-4">
          <div class="border-b border-outline-gray-1 pb-3 flex justify-between items-center">
            <h2 class="text-lg font-bold text-ink-gray-9">
              {{ editingId ? __('Edit Item') : __('Add Product or Service') }}
            </h2>
          </div>

          <form class="space-y-4" @submit.prevent="saveItem">
            <div class="grid grid-cols-2 gap-3">
              <FormControl
                v-model="formData.type"
                :label="__('Type')"
                type="select"
                :options="['Product', 'Service']"
                required
              />
              <FormControl
                v-model="formData.code"
                :label="__('SKU / Code')"
                type="text"
                placeholder="e.g. PRD-001"
                required
              />
            </div>

            <FormControl
              v-model="formData.name"
              :label="__('Item Name')"
              type="text"
              placeholder="e.g. 48-Port Managed Switch"
              required
            />

            <FormControl
              v-model="formData.category"
              :label="__('Category')"
              type="text"
              placeholder="e.g. Hardware, Cloud, Consulting"
              required
            />

            <FormControl
              v-model="formData.description"
              :label="__('Description')"
              type="textarea"
              rows="2"
            />

            <div class="grid grid-cols-2 gap-3">
              <FormControl
                v-model.number="formData.unit_price"
                :label="__('Selling Price ($)')"
                type="number"
                step="0.01"
                min="0"
                required
              />
              <FormControl
                v-model.number="formData.cost_price"
                :label="__('Cost Price ($)')"
                type="number"
                step="0.01"
                min="0"
              />
            </div>

            <div v-if="formData.type === 'Product'" class="bg-surface-gray-1 p-3 rounded-lg border border-outline-gray-1 space-y-3">
              <label class="flex items-center gap-2 text-xs font-semibold text-ink-gray-8 cursor-pointer">
                <input v-model="formData.track_stock" type="checkbox" class="rounded text-blue-600" />
                <span>{{ __('Track Inventory Stock for this item') }}</span>
              </label>

              <div v-if="formData.track_stock" class="grid grid-cols-2 gap-3 pt-2">
                <FormControl
                  v-model.number="formData.quantity_in_stock"
                  :label="__('Current Stock Qty')"
                  type="number"
                  min="0"
                />
                <FormControl
                  v-model.number="formData.low_stock_threshold"
                  :label="__('Low Stock Threshold')"
                  type="number"
                  min="0"
                />
              </div>
            </div>

            <div class="pt-4 border-t border-outline-gray-1 flex justify-end gap-2">
              <Button variant="outline" :label="__('Cancel')" @click="showModal = false" />
              <Button variant="solid" type="submit" :label="__('Save Item')" />
            </div>
          </form>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { isMobileView } from '@/composables/settings'
import { Button, TextInput, Dialog, FormControl } from 'frappe-ui'

const business = useBusinessStore()
const searchQuery = ref('')
const selectedType = ref('All')
const selectedCategory = ref('All')
const dismissAlert = ref(false)

const showModal = ref(false)
const editingId = ref(null)

const formData = reactive({
  code: '',
  name: '',
  description: '',
  category: 'General',
  type: 'Product',
  unit_price: 0,
  cost_price: 0,
  quantity_in_stock: 0,
  low_stock_threshold: 5,
  track_stock: true,
})

const categories = computed(() => {
  const cats = new Set(business.inventory.map((i) => i.category).filter(Boolean))
  return Array.from(cats)
})

const filteredInventory = computed(() => {
  return business.inventory.filter((item) => {
    if (selectedType.value !== 'All' && item.type !== selectedType.value) return false
    if (selectedCategory.value !== 'All' && item.category !== selectedCategory.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = item.name?.toLowerCase().includes(q)
      const matchCode = item.code?.toLowerCase().includes(q)
      return matchName || matchCode
    }
    return true
  })
})

function openAddModal() {
  editingId.value = null
  Object.assign(formData, {
    code: `PRD-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    description: '',
    category: 'Hardware',
    type: 'Product',
    unit_price: 100,
    cost_price: 50,
    quantity_in_stock: 10,
    low_stock_threshold: 3,
    track_stock: true,
  })
  showModal.value = true
}

function openEditModal(item) {
  editingId.value = item.id
  Object.assign(formData, JSON.parse(JSON.stringify(item)))
  showModal.value = true
}

function saveItem() {
  if (editingId.value) {
    business.updateProduct(editingId.value, formData)
  } else {
    business.addProduct(formData)
  }
  showModal.value = false
}

function deleteItem(id) {
  if (confirm('Delete this item from inventory?')) {
    business.deleteProduct(id)
  }
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>
