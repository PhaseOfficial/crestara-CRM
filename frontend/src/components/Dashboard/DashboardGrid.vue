<template>
  <div class="flex-1 overflow-y-auto p-3">
    <GridLayout
      v-if="items.length > 0"
      class="h-fit w-full"
      :class="[editing ? 'mb-[20rem] !select-none' : '']"
      :cols="20"
      :rowHeight="42"
      :disabled="!editing"
      :modelValue="items.map((item) => item.layout)"
      @update:modelValue="
        (newLayout) => {
          items.forEach((item, idx) => {
            if (newLayout[idx]) {
              item.layout = newLayout[idx]
            }
          })
        }
      "
    >
      <template #item="{ index }">
        <div class="group relative flex h-full w-full p-2 text-ink-gray-8">
          <div
            class="flex h-full w-full items-center justify-center"
            :class="
              editing
                ? 'pointer-events-none [&>div:first-child]:rounded-xl [&>div:first-child]:group-hover:ring-2 [&>div:first-child]:group-hover:ring-outline-gray-3'
                : ''
            "
          >
            <DashboardItem
              v-if="items[index]"
              :index="index"
              :item="items[index]"
              :editing="editing"
            />
          </div>
          <!-- Delete widget button in edit mode -->
          <div
            v-if="editing"
            class="flex absolute right-1.5 top-1.5 z-20 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <div
              class="rounded-lg p-1.5 bg-surface-gray-9 hover:bg-red-600 text-white transition-colors"
              title="Remove widget"
              @click="items.splice(index, 1)"
            >
              <LucideTrash2 class="size-3.5" aria-hidden="true" />
            </div>
          </div>
        </div>
      </template>
    </GridLayout>
  </div>
</template>

<script setup>
import { GridLayout } from 'frappe-ui'
import LucideTrash2 from '~icons/lucide/trash-2'

defineProps({
  editing: { type: Boolean, default: false },
})

const items = defineModel({ type: Array, default: () => [] })
</script>
