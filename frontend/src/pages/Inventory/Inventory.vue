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

    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6">
      <!-- Low Stock Alert Banner -->
      <div v-if="!dismissAlert && business.lowStockItems.length" class="bg-surface-amber-2 border border-outline-amber-2 rounded-xl p-4 flex items-center justify-between">
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
        <div class="flex items-center gap-2 flex-wrap">
          <select
            v-model="selectedType"
            class="bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-gray-9 focus:outline-none"
          >
            <option value="All">{{ __('All Types (Products & Services)') }}</option>
            <option value="Product">{{ __('Tracked Products Only') }}</option>
            <option value="Service">{{ __('Services Only') }}</option>
            <option value="LowStock">{{ __('Low Stock Warnings') }}</option>
          </select>

          <select
            v-model="selectedCategory"
            class="bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-gray-9 focus:outline-none"
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
                <th class="py-3 px-6">{{ __('Item & SKU') }}</th>
                <th class="py-3 px-6">{{ __('Category') }}</th>
                <th class="py-3 px-6">{{ __('Type') }}</th>
                <th class="py-3 px-6">{{ __('Selling Price') }}</th>
                <th v-if="business.isAdmin" class="py-3 px-6">{{ __('Gross Margin') }}</th>
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
                <!-- Item & SKU with Image Thumbnail -->
                <td class="py-3 px-6">
                  <div class="flex items-center gap-3">
                    <div class="size-9 rounded-lg overflow-hidden shrink-0 border border-outline-gray-2/70 bg-surface-gray-2 flex items-center justify-center">
                      <img
                        v-if="item.image_url"
                        :src="item.image_url"
                        :alt="item.name"
                        class="size-full object-cover"
                      />
                      <span v-else class="text-xs font-bold text-ink-gray-6">
                        {{ (item.name || 'P').substring(0, 2).toUpperCase() }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <div class="font-medium text-ink-gray-9 truncate flex items-center gap-1.5">
                        <span>{{ item.name }}</span>
                        <span class="font-mono text-[10px] text-ink-gray-5 font-normal">({{ item.code }})</span>
                      </div>
                      <div class="text-xs text-ink-gray-4 line-clamp-1">{{ item.description || __('No description') }}</div>
                    </div>
                  </div>
                </td>

                <td class="py-3 px-6 text-ink-gray-7">{{ item.category }}</td>
                
                <td class="py-3 px-6">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="item.type === 'Product' ? 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3' : 'bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-3'"
                  >
                    {{ item.type }}
                  </span>
                </td>

                <td class="py-3 px-6 font-bold text-ink-gray-9">
                  {{ business.formatCurrency(item.unit_price) }}
                </td>

                <!-- Gross Margin for Administrators -->
                <td v-if="business.isAdmin" class="py-3 px-6 text-xs text-ink-gray-7">
                  <div v-if="item.unit_price > 0 && item.cost_price > 0">
                    <span class="font-semibold text-ink-green-7 dark:text-ink-green-4">
                      {{ Math.round(((item.unit_price - item.cost_price) / item.unit_price) * 100) }}%
                    </span>
                    <span class="text-[10px] text-ink-gray-4 block">cost: {{ business.formatCurrency(item.cost_price) }}</span>
                  </div>
                  <span v-else class="text-ink-gray-4">—</span>
                </td>

                <!-- Stock Level Column with Quick Adjustment -->
                <td class="py-3 px-6">
                  <span v-if="!item.track_stock || item.type === 'Service'" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4">
                    {{ __('Service / Untracked') }}
                  </span>
                  <div v-else class="flex items-center gap-2">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
                      :class="item.quantity_in_stock <= item.low_stock_threshold ? 'bg-surface-red-2 text-ink-red-7 border border-outline-red-2' : 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4'"
                    >
                      {{ item.quantity_in_stock }} {{ __('units') }}
                      <span v-if="item.quantity_in_stock <= item.low_stock_threshold" class="ml-1 text-[10px] uppercase">({{ __('Low') }})</span>
                    </span>

                    <!-- Quick Stock Increment/Decrement Buttons -->
                    <div class="flex items-center border border-outline-gray-2 rounded bg-surface-base overflow-hidden">
                      <button
                        type="button"
                        class="px-2 py-0.5 text-xs font-bold text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9 transition-colors"
                        :title="__('Deduct 1 unit')"
                        @click.stop="quickAdjustStock(item.id, -1)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        class="px-2 py-0.5 text-xs font-bold text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9 border-l border-outline-gray-2 transition-colors"
                        :title="__('Add 1 unit')"
                        @click.stop="quickAdjustStock(item.id, 1)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </td>

                <td class="py-3 px-6 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" iconLeft="edit-2" @click="openEditModal(item)" />
                    <Button size="sm" variant="ghost" theme="red" iconLeft="trash-2" @click="deleteItem(item.id)" />
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredInventory.length">
                <td :colspan="business.isAdmin ? 7 : 6" class="py-12 text-center text-ink-gray-4">
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
            <!-- Top: Image + Code/SKU + Type Badge -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="size-8 rounded-lg overflow-hidden shrink-0 border border-outline-gray-2 bg-surface-gray-2 flex items-center justify-center">
                  <img
                    v-if="item.image_url"
                    :src="item.image_url"
                    :alt="item.name"
                    class="size-full object-cover"
                  />
                  <span v-else class="text-[10px] font-bold text-ink-gray-6">
                    {{ (item.name || 'P').substring(0, 2).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0">
                  <span class="font-mono font-bold text-ink-gray-9 text-xs">{{ item.code }}</span>
                  <div class="text-[11px] text-ink-gray-5 truncate">{{ item.category }}</div>
                </div>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                :class="item.type === 'Product' ? 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3' : 'bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-3'"
              >
                {{ item.type }}
              </span>
            </div>

            <!-- Name & Description -->
            <div>
              <div class="font-semibold text-ink-gray-9 text-sm">{{ item.name }}</div>
              <div v-if="item.description" class="text-xs text-ink-gray-5 line-clamp-2 mt-0.5">
                {{ item.description }}
              </div>
            </div>

            <!-- Pricing & Stock Details Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/60 p-2.5 rounded-lg items-center">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Selling Price') }}</span>
                <span class="font-bold text-sm text-ink-gray-9">{{ business.formatCurrency(item.unit_price) }}</span>
                <span v-if="business.isAdmin && item.cost_price" class="text-[10px] text-ink-gray-4 block">cost: {{ business.formatCurrency(item.cost_price) }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Stock Level') }}</span>
                <span v-if="!item.track_stock || item.type === 'Service'" class="text-ink-purple-7 dark:text-ink-purple-4 font-semibold text-xs">
                  {{ __('Service') }}
                </span>
                <div v-else class="flex items-center justify-end gap-1.5 mt-0.5">
                  <span
                    class="font-bold text-xs"
                    :class="item.quantity_in_stock <= item.low_stock_threshold ? 'text-ink-red-3' : 'text-ink-gray-9'"
                  >
                    {{ item.quantity_in_stock }} {{ __('units') }}
                  </span>
                  <!-- Mobile Quick Adjust -->
                  <div class="inline-flex items-center border border-outline-gray-2 rounded bg-surface-base">
                    <button
                      type="button"
                      class="px-1.5 py-0.2 text-xs font-bold text-ink-gray-6"
                      @click.stop="quickAdjustStock(item.id, -1)"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      class="px-1.5 py-0.2 text-xs font-bold text-ink-gray-6 border-l border-outline-gray-2"
                      @click.stop="quickAdjustStock(item.id, 1)"
                    >
                      +
                    </button>
                  </div>
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

          <!-- Product / Service Photo Uploader -->
          <div class="flex justify-center py-1 border-b border-outline-gray-1/60 pb-3">
            <CrmImageUploader
              v-model="formData.image_url"
              folder="inventory"
              shape="rounded"
              size="lg"
              :label="__('Item Photo / Media')"
              :description="__('Recommended: PNG, JPG, or WebP (max 5MB)')"
              :fallback-text="(formData.name || 'P').substring(0, 2).toUpperCase()"
            />
          </div>

          <form class="space-y-4" @submit.prevent="saveItem">
            <div class="grid grid-cols-2 gap-3">
              <FormControl
                v-model="formData.type"
                :label="__('Type')"
                type="select"
                :options="['Product', 'Service']"
                required
                @change="onTypeChange"
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
                :label="__('Selling Price ({0})', [business.settings.currency || 'USD'])"
                type="number"
                step="0.01"
                min="0"
                required
              />
              <FormControl
                v-model.number="formData.cost_price"
                :label="__('Cost Price ({0})', [business.settings.currency || 'USD'])"
                type="number"
                step="0.01"
                min="0"
              />
            </div>

            <!-- Service Notice (Services do not have inventory stock) -->
            <div v-if="formData.type === 'Service'" class="bg-surface-purple-2/40 border border-outline-purple-2 rounded-lg p-3 text-xs text-ink-purple-7 dark:text-ink-purple-3 flex items-center gap-2">
              <span class="lucide-sparkles size-4 shrink-0" />
              <span>{{ __('Services and retainers do not hold physical stock. Inventory stock tracking is automatically disabled.') }}</span>
            </div>

            <!-- Product Physical Stock Settings -->
            <div v-else class="bg-surface-gray-1 p-3 rounded-lg border border-outline-gray-1 space-y-3">
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
import CrmImageUploader from '@/components/Common/CrmImageUploader.vue'

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
  image_url: '',
  barcode: '',
})

const categories = computed(() => {
  const cats = new Set(business.inventory.map((i) => i.category).filter(Boolean))
  return Array.from(cats)
})

const filteredInventory = computed(() => {
  return business.inventory.filter((item) => {
    if (selectedType.value === 'Product' && item.type !== 'Product') return false
    if (selectedType.value === 'Service' && item.type !== 'Service') return false
    if (selectedType.value === 'LowStock') {
      if (!item.track_stock || item.type === 'Service' || item.quantity_in_stock > item.low_stock_threshold) {
        return false
      }
    }
    if (selectedCategory.value !== 'All' && item.category !== selectedCategory.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchName = item.name?.toLowerCase().includes(q)
      const matchCode = item.code?.toLowerCase().includes(q)
      const matchDesc = item.description?.toLowerCase().includes(q)
      return matchName || matchCode || matchDesc
    }
    return true
  })
})

function onTypeChange() {
  if (formData.type === 'Service') {
    formData.track_stock = false
    formData.quantity_in_stock = 0
    formData.low_stock_threshold = 0
  } else {
    formData.track_stock = true
    formData.low_stock_threshold = business.settings.default_low_stock_threshold || 5
  }
}

function openAddModal() {
  editingId.value = null
  const defaultThreshold = business.settings.default_low_stock_threshold || 5
  Object.assign(formData, {
    code: `PRD-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    description: '',
    category: 'Hardware',
    type: 'Product',
    unit_price: 100,
    cost_price: 50,
    quantity_in_stock: 10,
    low_stock_threshold: defaultThreshold,
    track_stock: true,
    image_url: '',
    barcode: '',
  })
  showModal.value = true
}

function openEditModal(item) {
  editingId.value = item.id
  Object.assign(formData, JSON.parse(JSON.stringify(item)))
  showModal.value = true
}

async function saveItem() {
  if (editingId.value) {
    await business.updateProduct(editingId.value, formData)
  } else {
    await business.addProduct(formData)
  }
  showModal.value = false
}

async function deleteItem(id) {
  if (confirm('Delete this item from inventory?')) {
    await business.deleteProduct(id)
  }
}

async function quickAdjustStock(id, delta) {
  await business.adjustStock(id, delta)
}
</script>
