<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-ink-gray-9">{{ __('Available Promotions & Discounts') }}</h1>
      <p class="text-sm text-ink-gray-5 mt-1">
        {{ __('Exclusive offers and promo codes applicable to your next invoice or service upgrade.') }}
      </p>
    </div>

    <!-- Promotions Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="promo in business.promotions"
        :key="promo.id"
        class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm flex flex-col justify-between hover:border-outline-gray-3 transition-colors"
      >
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-purple-2 text-ink-purple-7 border border-outline-purple-2">
              {{ promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `$${promo.discount_value} CREDIT` }}
            </span>
            <span class="text-xs text-ink-gray-4">
              {{ __('Valid until') }} {{ promo.valid_until }}
            </span>
          </div>

          <h2 class="text-lg font-bold text-ink-gray-9">{{ promo.title }}</h2>
          <p class="text-sm text-ink-gray-6">{{ promo.description }}</p>

          <div class="bg-surface-gray-1 rounded-lg p-3 text-xs text-ink-gray-5 space-y-1">
            <p><strong class="text-ink-gray-7">{{ __('Terms:') }}</strong> {{ promo.terms }}</p>
          </div>
        </div>

        <div class="pt-6 mt-4 border-t border-outline-gray-1 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs text-ink-gray-4">{{ __('Promo Code:') }}</span>
            <span class="font-mono text-sm font-bold bg-surface-gray-2 px-2.5 py-1 rounded text-ink-gray-9 select-all">
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
