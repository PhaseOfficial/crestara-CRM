<template>
  <div
    v-if="!isAllCompleted || showWhenComplete"
    class="bg-surface-base border border-outline-gray-1 rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-300"
  >
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <!-- Left Info -->
      <div class="flex items-start sm:items-center gap-3.5">
        <div class="size-10 rounded-xl bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center shrink-0 text-ink-blue-7">
          <span class="lucide-compass size-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-ink-gray-9">
              {{ __('Getting Started with Your Client Portal') }}
            </h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-blue-2 text-ink-blue-7">
              {{ business.completedOnboardingStepsCount }} / {{ business.customerOnboardingSteps.length }} {{ __('Steps') }}
            </span>
          </div>
          <p class="text-xs text-ink-gray-5 mt-0.5">
            {{ nextStep ? __('Next: {0} — {1}', [nextStep.title, nextStep.description]) : __('All educational onboarding steps completed!') }}
          </p>
        </div>
      </div>

      <!-- Right Action & Progress -->
      <div class="flex items-center gap-4 self-end sm:self-center">
        <!-- Progress Bar -->
        <div class="hidden md:flex flex-col items-end gap-1 w-32">
          <span class="text-[11px] font-bold text-ink-gray-7">{{ business.onboardingPercentage }}%</span>
          <div class="w-full bg-surface-gray-2 h-1.5 rounded-full overflow-hidden border border-outline-gray-1">
            <div
              class="h-full bg-surface-blue-5 transition-all duration-500 rounded-full"
              :style="{ width: `${business.onboardingPercentage}%` }"
            />
          </div>
        </div>

        <Button
          variant="solid"
          iconLeft="book-open"
          :label="__('Explore Guide')"
          @click="$emit('open-guide')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  showWhenComplete: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['open-guide'])

const business = useBusinessStore()

const isAllCompleted = computed(() => {
  return business.completedOnboardingStepsCount === business.customerOnboardingSteps.length
})

const nextStep = computed(() => {
  return business.customerOnboardingSteps.find((s) => !s.completed)
})
</script>
