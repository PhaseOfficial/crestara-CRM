<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-ink-gray-9 tracking-tight">{{ __('Available Promotions & Discounts') }}</h1>
      <p class="text-xs sm:text-sm text-ink-gray-7 dark:text-ink-gray-6 mt-1">
        {{ __('Exclusive offers and promo codes applicable to your next invoice or service upgrade.') }}
      </p>
    </div>

    <!-- Promotions Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="promo in business.promotions"
        :key="promo.id"
        class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm flex flex-col justify-between hover:border-outline-gray-2 transition-colors space-y-4"
      >
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2">
              {{ promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `$${promo.discount_value} CREDIT` }}
            </span>
            <span class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
              {{ __('Valid until') }} {{ promo.valid_until }}
            </span>
          </div>

          <h2 class="text-lg font-bold text-ink-gray-9">{{ promo.title }}</h2>
          <p class="text-xs sm:text-sm text-ink-gray-7 dark:text-ink-gray-6 leading-relaxed">{{ promo.description }}</p>

          <div class="bg-surface-gray-1 border border-outline-gray-1 rounded-xl p-3 text-xs text-ink-gray-7 dark:text-ink-gray-6 space-y-1">
            <p><strong class="text-ink-gray-9">{{ __('Terms:') }}</strong> {{ promo.terms }}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-outline-gray-1 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Code:') }}</span>
            <span class="inline-flex items-center font-mono text-sm font-bold bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60 text-ink-gray-9 select-all">
              {{ promo.code }}
            </span>
          </div>

          <Button
            size="sm"
            variant="solid"
            :label="copiedCode === promo.code ? __('Copied!') : __('Copy Code')"
            :iconLeft="copiedCode === promo.code ? 'check' : 'copy'"
            @click="copyCode(promo.code)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useBusinessStore } from '@/stores/business'
import { Button } from 'frappe-ui'

const business = useBusinessStore()
const copiedCode = ref(null)

function copyCode(code) {
  navigator.clipboard.writeText(code)
  copiedCode.value = code
  setTimeout(() => {
    copiedCode.value = null
  }, 2000)
}
</script>
