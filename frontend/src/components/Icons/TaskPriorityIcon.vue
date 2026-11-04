<template>
  <div class="grid place-items-center">
    <div
      class="h-3 w-3 rounded-full"
      :class="[
        {
          'bg-red-500 dark:bg-red-400': priority === 'High',
          'bg-amber-500 dark:bg-amber-400': priority === 'Medium',
          'bg-surface-gray-4 dark:bg-surface-gray-5': priority === 'Low',
        },
        $attrs.class,
      ]"
    />
  </div>
</template>
<script setup>
defineOptions({
  inheritAttrs: false,
})

defineProps({
  priority: { type: String, required: true },
})
</script>
