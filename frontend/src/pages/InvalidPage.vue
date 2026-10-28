<template>
  <div
    class="grid h-full place-items-center px-4 py-20 text-center text-lg text-ink-gray-5"
  >
    <div class="space-y-4">
      <div>{{ __('Invalid page or not permitted to access') }}</div>
      <Button
        :route="{ name: 'Dashboard' }"
        :label="__('Go to Dashboard')"
        iconLeft="lucide-layout-dashboard"
      />
    </div>
  </div>
</template>

<script setup>
import { Button } from 'frappe-ui'
</script>
