import { getCurrentInstance, onMounted, onBeforeUnmount } from 'vue'
import {
  showCommandPalette,
  toggleCommandPalette,
  openCommandPalette,
  openNewTaskModal,
  showGlobalTaskModal,
} from '@/composables/modals'
import { isDialogOpen } from '@/utils/dialogs'

/**
 * Checks whether an event target is an active text input or editable region.
 * Prevents hotkeys from firing while users are typing.
 */
export function isTypingElement(el) {
  if (!el) return false
  const tag = el.tagName
  return Boolean(
    el.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (el.closest && (el.closest('[contenteditable="true"]') || el.closest('.ProseMirror')))
  )
}

/**
 * Registers application-wide keyboard shortcuts:
 * - Ctrl+K / Cmd+K: Command Bar & Global Search
 * - / : Global Search (when not focused in text inputs)
 * - T : Create New Task (when not focused in text inputs)
 */
export function useGlobalShortcuts() {
  function handleKeydown(e) {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey
    const key = e.key ? e.key.toLowerCase() : ''

    // 1. Command Bar: Ctrl+K or Cmd+K (Universal, works everywhere)
    if (isCmdOrCtrl && key === 'k') {
      e.preventDefault()
      e.stopPropagation()
      toggleCommandPalette()
      return
    }

    // Single-key shortcuts should never fire while user is typing in inputs or rich text
    if (isTypingElement(e.target)) return

    // Do not trigger background hotkeys if any modal or palette is open
    if (isDialogOpen() || showCommandPalette.value || showGlobalTaskModal.value) return

    // 2. Global Search: '/'
    if (e.key === '/' && !isCmdOrCtrl && !e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      openCommandPalette()
      return
    }

    // 3. New Task: 't' or 'T'
    if (key === 't' && !isCmdOrCtrl && !e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      openNewTaskModal()
      return
    }
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      window.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown)
    })
  }

  return {
    handleKeydown,
  }
}
