import { ref } from 'vue'

/**
 * Crestara CRM Onboarding Composable Shim
 * Bypasses remote Frappe Cloud Python calls (/api/method/frappe.onboarding.get_onboarding_status)
 * and provides safe no-op completions without triggering 404s or unhandled TypeErrors.
 */
export function useOnboarding(_appName = 'frappecrm') {
  const isOnboardingStepsCompleted = ref(true)
  const onboardingSteps = ref([])

  function updateOnboardingStep(_step) {}

  function resetAll() {}
  function skipAll() {}
  function reset(_step) {}
  function skip(_step) {}

  return {
    isOnboardingStepsCompleted,
    onboardingSteps,
    stepsCompleted: ref(0),
    totalSteps: ref(0),
    completedPercentage: ref(100),
    updateOnboardingStep,
    resetAll,
    skipAll,
    reset,
    skip,
  }
}
