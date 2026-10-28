import { ref } from 'vue'

export const showQuickEntryModal = ref(false)
export const quickEntryProps = ref({})

export const showAboutModal = ref(false)

export const showChangePasswordModal = ref(false)

// Global Task Creation Modal (Shortcut: T)
export const showGlobalTaskModal = ref(false)
export const globalTaskData = ref(null)

export function openNewTaskModal(task = null) {
  globalTaskData.value = task
  showGlobalTaskModal.value = true
}

export function closeNewTaskModal() {
  showGlobalTaskModal.value = false
  globalTaskData.value = null
}

// Global Command Bar & Search Palette (Shortcut: Ctrl+K / Cmd+K / '/')
export const showCommandPalette = ref(false)

export function openCommandPalette() {
  showCommandPalette.value = true
}

export function closeCommandPalette() {
  showCommandPalette.value = false
}

export function toggleCommandPalette() {
  showCommandPalette.value = !showCommandPalette.value
}

// Global Help Modal
export const showHelpModal = ref(false)

export function openHelpModal() {
  showHelpModal.value = true
}

export function closeHelpModal() {
  showHelpModal.value = false
}

export function toggleHelpModal() {
  showHelpModal.value = !showHelpModal.value
}

