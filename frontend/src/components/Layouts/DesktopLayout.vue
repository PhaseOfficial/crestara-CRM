<template>
  <div class="flex h-screen w-full overflow-hidden bg-surface-base">
    <AppSidebar />
    <div class="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-surface-base">
      <AppHeader />
      <slot />
    </div>
    <GlobalModals />
  </div>
</template>
<script setup>
import AppSidebar from '@/components/Layouts/AppSidebar.vue'
import AppHeader from '@/components/Layouts/AppHeader.vue'
import GlobalModals from '@/components/Modals/GlobalModals.vue'
</script>
