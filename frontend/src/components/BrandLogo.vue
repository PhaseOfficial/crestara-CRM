<template>
  <div v-if="brand?.logo" class="flex items-center justify-center shrink-0">
    <img
      :src="brand.logo"
      class="h-8 w-8 object-contain rounded"
      alt="Crestara CRM"
    />
  </div>
  <CRMLogo v-else class="size-8 shrink-0 rounded object-contain" />
</template>

<script setup>
import CRMLogo from '@/components/Icons/CRMLogo.vue'

const brand = defineModel({ type: Object, default: () => ({}) })
</script>
