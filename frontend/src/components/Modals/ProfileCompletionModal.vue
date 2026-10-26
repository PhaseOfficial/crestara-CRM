<template>
  <Dialog
    v-model="isOpen"
    :options="{
      title: __('Complete Your Account Profile'),
      size: 'md',
    }"
  >
    <template #body-content>
      <div class="space-y-5 text-ink-gray-8">
        <!-- Banner alert -->
        <div class="flex items-start gap-3 bg-surface-amber-2 border border-outline-amber-2 p-3.5 rounded-xl text-ink-amber-7">
          <span class="lucide-alert-triangle size-5 shrink-0 mt-0.5" />
          <div class="text-xs space-y-1">
            <h4 class="font-bold text-sm text-ink-amber-8">
              {{ __('Please Complete Your Profile Details') }}
            </h4>
            <p class="leading-relaxed opacity-95">
              {{ __('To ensure accurate invoice billing, official payment receipts, and seamless service delivery, please complete your organizational and contact details.') }}
            </p>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="bg-surface-gray-2 p-4 rounded-xl border border-outline-gray-1 space-y-2">
          <div class="flex justify-between items-center text-xs">
            <span class="font-bold text-ink-gray-9">{{ __('Profile Completeness') }}</span>
            <span class="font-bold font-mono text-ink-blue-7">{{ business.profileCompletion.percentage }}%</span>
          </div>
          <div class="w-full bg-surface-gray-3 h-2 rounded-full overflow-hidden">
            <div
              class="h-full bg-surface-blue-5 transition-all duration-500 rounded-full"
              :style="{ width: `${business.profileCompletion.percentage}%` }"
            />
          </div>
        </div>

        <!-- Missing Information Checklist -->
        <div class="space-y-2">
          <h5 class="text-xs font-bold uppercase tracking-wider text-ink-gray-5">
            {{ __('Information Needed') }} ({{ business.profileCompletion.missing.length }})
          </h5>
          <div class="divide-y divide-outline-gray-1 border border-outline-gray-1 rounded-lg overflow-hidden bg-surface-base">
            <div
              v-for="item in business.profileCompletion.missing"
              :key="item.key"
              class="flex items-center justify-between p-3 text-xs hover:bg-surface-gray-1"
            >
              <div class="flex items-center gap-2">
                <span class="lucide-circle-alert size-4 text-ink-amber-6 shrink-0" />
                <span class="font-semibold text-ink-gray-9">{{ item.label }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2">
                {{ __('Required') }}
              </span>
            </div>

            <div
              v-for="item in completedItems"
              :key="item.key"
              class="flex items-center justify-between p-3 text-xs bg-surface-gray-1/40 opacity-75"
            >
              <div class="flex items-center gap-2">
                <span class="lucide-check-circle-2 size-4 text-ink-green-6 shrink-0" />
                <span class="text-ink-gray-6 line-through">{{ item.label }}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-green-2 text-ink-green-7 border border-outline-green-2">
                {{ __('Completed') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #actions>
      <div class="flex items-center justify-between w-full">
        <Button
          variant="subtle"
          :label="__('Remind Me Later')"
          @click="dismissForSession"
        />
        <Button
          variant="solid"
          iconLeft="arrow-right"
          :label="__('Complete Profile Now')"
          @click="goToCompleteProfile"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'open-change-modal'])

const router = useRouter()
const business = useBusinessStore()
const isOpen = ref(false)

const completedItems = computed(() => {
  return (business.profileCompletion.checklist || []).filter(
    (item) => Boolean(item.value && String(item.value).trim())
  )
})

function dismissForSession() {
  isOpen.value = false
  emit('update:modelValue', false)
  try {
    sessionStorage.setItem('crestara_profile_nudge_dismissed', 'true')
  } catch {
    // ignore
  }
}

function goToCompleteProfile() {
  dismissForSession()
  router.push('/portal/account')
  emit('open-change-modal')
}

onMounted(() => {
  // Auto-check on login/portal entry
  try {
    const isDismissed = sessionStorage.getItem('crestara_profile_nudge_dismissed') === 'true'
    if (!isDismissed && !business.profileCompletion.isComplete) {
      isOpen.value = true
    }
  } catch {
    if (!business.profileCompletion.isComplete) {
      isOpen.value = true
    }
  }
})
</script>
