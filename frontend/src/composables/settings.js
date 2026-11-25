import { computed, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'

const { width } = useWindowSize()

export const mobileSidebarOpened = ref(false)

// Returns true on touch-capable tablets (e.g. iPad, Android tablets) or screen width under lg (1024px)
export const isTabletOrTouch = () => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const isTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) || 'ontouchstart' in window
  const isTabletUA =
    /iPad|Tablet|PlayBook/i.test(navigator.userAgent) ||
    (/Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent)) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  return isTouch && (isTabletUA || width.value < 1024)
}

export const isMobileView = computed(() => width.value < 1024 || isTabletOrTouch())

export const showSettings = ref(false)

export const disableSettingModalOutsideClick = ref(false)

export const activeSettingsPage = ref('')
