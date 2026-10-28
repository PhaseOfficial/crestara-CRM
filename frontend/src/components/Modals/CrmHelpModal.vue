<template>
  <Dialog
    v-model:open="show"
    :title="__('Crestara CRM Help & Documentation')"
    size="2xl"
  >
    <template #default>
      <div class="space-y-6 text-sm text-ink-gray-9 py-2">
        <!-- Header Banner -->
        <div class="rounded-xl bg-surface-gray-2 p-4 border border-outline-gray-1 flex items-start gap-4">
          <div class="size-10 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center shrink-0">
            <span class="lucide-help-circle size-5 text-ink-blue-7 dark:text-ink-blue-3" />
          </div>
          <div>
            <h4 class="font-bold text-ink-gray-9">{{ __('Welcome to Crestara CRM') }}</h4>
            <p class="text-xs text-ink-gray-6 dark:text-ink-gray-5 mt-0.5 leading-relaxed">
              {{ __('Your unified platform for customer relationship management, sales pipelines, billing, inventory, and business operations.') }}
            </p>
          </div>
        </div>

        <!-- Core Feature Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="guide in guides"
            :key="guide.title"
            class="rounded-xl border border-outline-gray-1 p-3.5 bg-surface-base hover:bg-surface-gray-1 transition-colors space-y-2 cursor-pointer group"
            @click="guide.action ? guide.action() : router.push(guide.to)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-bold text-ink-gray-9 text-xs">
                <span :class="[guide.icon, 'size-4 text-ink-blue-7 dark:text-ink-blue-3']" />
                <span>{{ __(guide.title) }}</span>
              </div>
              <span class="lucide-chevron-right size-3.5 text-ink-gray-4 group-hover:text-ink-blue-7 transition-colors" />
            </div>
            <p class="text-xs text-ink-gray-6 dark:text-ink-gray-5 line-clamp-2">
              {{ __(guide.description) }}
            </p>
          </div>
        </div>

        <!-- Useful Keyboard Shortcuts -->
        <div class="border-t border-outline-gray-1 pt-4">
          <h5 class="text-xs font-bold text-ink-gray-7 uppercase tracking-wider mb-2.5">
            {{ __('Productivity Shortcuts') }}
          </h5>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div
              class="flex items-center justify-between p-2 rounded-lg bg-surface-gray-2 border border-outline-gray-1 cursor-pointer hover:bg-surface-gray-3 transition-colors group"
              :title="__('Click to open Command Bar (Ctrl+K)')"
              @click="show = false; openCommandPalette()"
            >
              <span class="text-ink-gray-7 group-hover:text-ink-gray-9 font-medium">{{ __('Command Bar') }}</span>
              <kbd class="px-1.5 py-0.5 rounded bg-surface-base border border-outline-gray-2 font-mono text-[11px] font-semibold">Ctrl+K</kbd>
            </div>
            <div
              class="flex items-center justify-between p-2 rounded-lg bg-surface-gray-2 border border-outline-gray-1 cursor-pointer hover:bg-surface-gray-3 transition-colors group"
              :title="__('Click to create a new task (T)')"
              @click="show = false; openNewTaskModal()"
            >
              <span class="text-ink-gray-7 group-hover:text-ink-gray-9 font-medium">{{ __('New Task') }}</span>
              <kbd class="px-1.5 py-0.5 rounded bg-surface-base border border-outline-gray-2 font-mono text-[11px] font-semibold">T</kbd>
            </div>
            <div
              class="flex items-center justify-between p-2 rounded-lg bg-surface-gray-2 border border-outline-gray-1 cursor-pointer hover:bg-surface-gray-3 transition-colors group"
              :title="__('Click to open Global Search (/)')"
              @click="show = false; openCommandPalette()"
            >
              <span class="text-ink-gray-7 group-hover:text-ink-gray-9 font-medium">{{ __('Global Search') }}</span>
              <kbd class="px-1.5 py-0.5 rounded bg-surface-base border border-outline-gray-2 font-mono text-[11px] font-semibold">/</kbd>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between pt-3 border-t border-outline-gray-1">
          <div class="text-xs text-ink-gray-5">
            <span>Crestara CRM v2.0 • </span>
            <span class="text-ink-green-7 font-medium">{{ __('All Systems Operational') }}</span>
          </div>
          <Button
            variant="solid"
            :label="__('Close')"
            @click="show = false"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Button } from 'frappe-ui'
import { openCommandPalette, openNewTaskModal } from '@/composables/modals'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const guides = [
  {
    title: 'Clients & Directory',
    description: 'Manage organizations, commercial contacts, billing addresses, and credit limits.',
    icon: 'lucide-users',
    to: '/clients',
  },
  {
    title: 'Invoices & Billing',
    description: 'Generate PDF tax invoices, log payments, track receivables, and export receipts.',
    icon: 'lucide-receipt',
    to: '/invoices',
  },
  {
    title: 'Tasks & Kanban',
    description: 'Organize project deliverables, track task priorities, and manage drag-and-drop workflow columns.',
    icon: 'lucide-check-square',
    to: '/tasks',
  },
  {
    title: 'Business Settings',
    description: 'Configure corporate address, remittance bank details, logo, and payment instructions.',
    icon: 'lucide-settings',
    to: '/business-settings',
  },
]
</script>
