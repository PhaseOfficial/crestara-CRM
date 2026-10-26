<template>
  <Dialog v-model:open="show" :size="'sm'">
    <template #body>
      <div class="p-6 pt-6">
        <div class="flex justify-center">
          <div class="flex flex-col items-center text-center">
            <img
              src="/crestara_logo.png"
              alt="Crestara CRM"
              class="mb-3 h-12 w-auto object-contain max-w-[180px]"
            />
            <h3 class="text-xl font-bold text-ink-gray-9">Crestara CRM</h3>
            <p class="text-xs text-ink-gray-5 mt-1">
              {{ __('Modern customer relationship & pipeline management') }}
            </p>
          </div>
        </div>
        <hr class="border-t my-4" />
        <div class="space-y-2 text-center text-sm text-ink-gray-6">
          <p class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4">
            {{ __('Version 1.0.0') }}
          </p>
          <p class="text-xs text-ink-gray-5">
            {{ __('Integrated with Supabase cloud database & real-time auth') }}
          </p>
        </div>
        <hr class="border-t my-4" />
        <p class="text-xs text-center text-ink-gray-4">
          © {{ new Date().getFullYear() }} Crestara. {{ __('All rights reserved.') }}
        </p>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog } from 'frappe-ui'

let show = defineModel({ type: Boolean })
</script>
