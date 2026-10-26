<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden">
    <div class="flex flex-1 overflow-hidden">
      <MobileSidebar />
      <div class="flex h-full flex-1 flex-col overflow-auto bg-surface-base pb-20">
        <MobileAppHeader />
        <slot />
      </div>
    </div>
    <MobileBottomNav />
    <GlobalModals />
  </div>
</template>
<script setup>
import MobileSidebar from '@/components/Mobile/MobileSidebar.vue'
import MobileAppHeader from '@/components/Mobile/MobileAppHeader.vue'
import MobileBottomNav from '@/components/Mobile/MobileBottomNav.vue'
import GlobalModals from '@/components/Modals/GlobalModals.vue'
</script>
