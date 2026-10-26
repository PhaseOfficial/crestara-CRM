<template>
  <Dialog
    v-model="isOpen"
    :options="{
      title: __('Client Portal Quickstart & Feature Guide'),
      size: '3xl',
    }"
  >
    <template #body-content>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[420px]">
        <!-- Left Steps Navigation (4 cols) -->
        <div class="md:col-span-5 border-r border-outline-gray-1 pr-4 space-y-2">
          <div class="flex items-center justify-between pb-3 border-b border-outline-gray-1">
            <span class="text-xs font-bold text-ink-gray-5 uppercase tracking-wider">
              {{ __('Onboarding Checklist') }}
            </span>
            <span class="text-xs font-bold text-ink-blue-7">
              {{ business.completedOnboardingStepsCount }} / {{ business.customerOnboardingSteps.length }} {{ __('Done') }}
            </span>
          </div>

          <div class="space-y-1 mt-2">
            <button
              v-for="(step, idx) in business.customerOnboardingSteps"
              :key="step.id"
              type="button"
              class="w-full text-left p-3 rounded-xl transition flex items-center justify-between gap-3 text-xs"
              :class="activeStepIndex === idx ? 'bg-surface-blue-2 text-ink-blue-8 font-semibold border border-outline-blue-2' : 'hover:bg-surface-gray-2 text-ink-gray-7'"
              @click="activeStepIndex = idx"
            >
              <div class="flex items-center gap-2.5 truncate">
                <div
                  class="size-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  :class="step.completed ? 'bg-surface-green-2 text-ink-green-7 border border-outline-green-2' : (activeStepIndex === idx ? 'bg-surface-blue-3 text-ink-blue-8' : 'bg-surface-gray-2 text-ink-gray-6')"
                >
                  <span v-if="step.completed" class="lucide-check size-3.5" />
                  <span v-else>{{ idx + 1 }}</span>
                </div>
                <span class="truncate">{{ __(step.title) }}</span>
              </div>

              <span
                v-if="step.completed"
                class="text-[10px] text-ink-green-7 font-bold shrink-0"
              >
                {{ __('Completed') }}
              </span>
            </button>
          </div>
        </div>

        <!-- Right Step Details & Action Walkthrough (7 cols) -->
        <div class="md:col-span-7 flex flex-col justify-between space-y-6">
          <div class="space-y-4">
            <!-- Step Header Banner -->
            <div class="flex items-start gap-3 bg-surface-gray-2 p-4 rounded-xl border border-outline-gray-1">
              <div class="size-10 rounded-xl bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center shrink-0 text-ink-blue-7">
                <span :class="`lucide-${activeStep.icon}`" class="size-5" />
              </div>
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-ink-blue-7 block">
                  {{ __('Step {0} of {1}', [activeStepIndex + 1, business.customerOnboardingSteps.length]) }}
                </span>
                <h4 class="text-base font-bold text-ink-gray-9 mt-0.5">
                  {{ __(activeStep.title) }}
                </h4>
                <p class="text-xs text-ink-gray-5 mt-1 leading-relaxed">
                  {{ __(activeStep.description) }}
                </p>
              </div>
            </div>

            <!-- Detailed Teaching & Guide Content -->
            <div class="space-y-3 text-xs text-ink-gray-7">
              <h5 class="font-bold text-ink-gray-9 flex items-center gap-1.5">
                <span class="lucide-lightbulb size-4 text-amber-500" />
                {{ __('How this feature works in your portal:') }}
              </h5>

              <ul class="space-y-2.5 pl-1">
                <li v-for="(tip, tIdx) in stepExplanations[activeStep.id]" :key="tIdx" class="flex items-start gap-2">
                  <span class="lucide-check-circle size-3.5 text-ink-blue-6 shrink-0 mt-0.5" />
                  <span class="leading-relaxed">{{ __(tip) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Actions Footer -->
          <div class="pt-4 border-t border-outline-gray-1 flex items-center justify-between">
            <button
              type="button"
              class="text-xs font-semibold text-ink-gray-6 hover:text-ink-gray-9 transition flex items-center gap-1"
              @click="toggleStepCompletion"
            >
              <span :class="activeStep.completed ? 'lucide-square-check text-ink-green-6' : 'lucide-square'" class="size-4" />
              <span>{{ activeStep.completed ? __('Mark as Incomplete') : __('Mark as Done') }}</span>
            </button>

            <div class="flex items-center gap-2">
              <Button
                v-if="activeStepIndex < business.customerOnboardingSteps.length - 1"
                variant="subtle"
                :label="__('Next Step')"
                @click="activeStepIndex++"
              />
              <Button
                variant="solid"
                iconRight="arrow-right"
                :label="__(activeStep.actionLabel || 'Take Action')"
                @click="performStepAction"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Button } from 'frappe-ui'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'open-profile-change'])

const router = useRouter()
const business = useBusinessStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const activeStepIndex = ref(0)

const activeStep = computed(() => {
  return business.customerOnboardingSteps[activeStepIndex.value] || business.customerOnboardingSteps[0]
})

const stepExplanations = {
  complete_profile: [
    'Official corporate records (Company Registration, Tax ID / TIN, VAT) cannot be modified directly to preserve invoice integrity.',
    'Click "Request Detail Change" anytime to submit updates for fast staff verification and approval.',
    'Keeping your billing address accurate ensures real-time tax calculation and proper delivery receipts.',
  ],
  review_invoices: [
    'View all past and current invoices issued to your account with detailed line-item breakdowns.',
    'Check payment due dates, terms (Net 30, Due on Receipt), and invoice balance statuses.',
    'Download official PDF receipts with 1-click for your accounting and bookkeeping needs.',
  ],
  make_payment: [
    'Make payments securely using Bank Wire, Credit Card, or Direct Debit.',
    'Invoices are automatically updated to "Paid" status immediately upon settlement.',
    'Download signed payment confirmation receipts with transaction reference IDs.',
  ],
  explore_promotions: [
    'View special active promotional discounts, bundled software credits, and loyalty rewards.',
    'Discounts apply automatically at checkout or when paying eligible recurring invoices.',
    'Exclusive enterprise rates are updated monthly by your account executive.',
  ],
  schedule_appointment: [
    'Book consultation meetings or support reviews directly on the interactive portal calendar.',
    'Select available time slots that fit your schedule without back-and-forth emails.',
    'Calendar invites and video conference links are sent directly to your verified contact email.',
  ],
}

function toggleStepCompletion() {
  business.markOnboardingStep(activeStep.value.id, !activeStep.value.completed)
}

function performStepAction() {
  business.markOnboardingStep(activeStep.value.id, true)
  isOpen.value = false

  if (activeStep.value.id === 'complete_profile') {
    router.push('/portal/account')
    emit('open-profile-change')
  } else if (activeStep.value.route) {
    router.push(activeStep.value.route)
  }
}
</script>
