import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockIsDialogOpen = vi.fn(() => false)
vi.mock('@/utils/dialogs', () => ({
  isDialogOpen: () => mockIsDialogOpen(),
}))

import {
  isTypingElement,
  useGlobalShortcuts,
} from '@/composables/useGlobalShortcuts'
import {
  showCommandPalette,
  showGlobalTaskModal,
  globalTaskData,
  showHelpModal,
  openNewTaskModal,
  closeNewTaskModal,
  openCommandPalette,
  closeCommandPalette,
  toggleCommandPalette,
  openHelpModal,
  closeHelpModal,
  toggleHelpModal,
} from '@/composables/modals'

describe('Global Shortcuts & Modals State', () => {
  beforeEach(() => {
    showCommandPalette.value = false
    showGlobalTaskModal.value = false
    globalTaskData.value = null
    showHelpModal.value = false
  })

  describe('isTypingElement helper', () => {
    it('returns false for null or undefined targets', () => {
      expect(isTypingElement(null)).toBe(false)
      expect(isTypingElement(undefined)).toBe(false)
    })

    it('returns true for INPUT, TEXTAREA, and SELECT elements', () => {
      expect(isTypingElement({ tagName: 'INPUT' })).toBe(true)
      expect(isTypingElement({ tagName: 'TEXTAREA' })).toBe(true)
      expect(isTypingElement({ tagName: 'SELECT' })).toBe(true)
    })

    it('returns true for contenteditable elements or elements inside them', () => {
      expect(isTypingElement({ tagName: 'DIV', isContentEditable: true })).toBe(true)

      const nestedInEditable = {
        tagName: 'SPAN',
        closest: (selector) => (selector === '[contenteditable="true"]' ? {} : null),
      }
      expect(isTypingElement(nestedInEditable)).toBe(true)

      const nestedInProseMirror = {
        tagName: 'P',
        closest: (selector) => (selector === '.ProseMirror' ? {} : null),
      }
      expect(isTypingElement(nestedInProseMirror)).toBe(true)
    })

    it('returns false for buttons, links, divs, and document body', () => {
      const normalDiv = {
        tagName: 'DIV',
        isContentEditable: false,
        closest: () => null,
      }
      expect(isTypingElement(normalDiv)).toBe(false)

      const button = {
        tagName: 'BUTTON',
        isContentEditable: false,
        closest: () => null,
      }
      expect(isTypingElement(button)).toBe(false)
    })
  })

  describe('Modal helper actions', () => {
    it('opens and closes global task modal with task data payload', () => {
      expect(showGlobalTaskModal.value).toBe(false)
      expect(globalTaskData.value).toBe(null)

      openNewTaskModal({ title: 'Review Annual Remittance' })
      expect(showGlobalTaskModal.value).toBe(true)
      expect(globalTaskData.value).toEqual({ title: 'Review Annual Remittance' })

      closeNewTaskModal()
      expect(showGlobalTaskModal.value).toBe(false)
      expect(globalTaskData.value).toBe(null)
    })

    it('opens, closes, and toggles command palette', () => {
      expect(showCommandPalette.value).toBe(false)

      openCommandPalette()
      expect(showCommandPalette.value).toBe(true)

      closeCommandPalette()
      expect(showCommandPalette.value).toBe(false)

      toggleCommandPalette()
      expect(showCommandPalette.value).toBe(true)

      toggleCommandPalette()
      expect(showCommandPalette.value).toBe(false)
    })

    it('opens, closes, and toggles help modal', () => {
      expect(showHelpModal.value).toBe(false)

      openHelpModal()
      expect(showHelpModal.value).toBe(true)

      closeHelpModal()
      expect(showHelpModal.value).toBe(false)

      toggleHelpModal()
      expect(showHelpModal.value).toBe(true)
    })
  })

  describe('useGlobalShortcuts keyboard dispatcher', () => {
    function createMockEvent(key, options = {}) {
      return {
        key,
        ctrlKey: Boolean(options.ctrlKey),
        metaKey: Boolean(options.metaKey),
        altKey: Boolean(options.altKey),
        target: options.target || {
          tagName: 'DIV',
          isContentEditable: false,
          closest: () => null,
        },
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      }
    }

    it('triggers Command Palette on Ctrl+K or Cmd+K even inside inputs', () => {
      const shortcuts = useGlobalShortcuts()

      const inputEl = { tagName: 'INPUT' }
      const eCtrlK = createMockEvent('k', { ctrlKey: true, target: inputEl })
      shortcuts.handleKeydown(eCtrlK)

      expect(eCtrlK.preventDefault).toHaveBeenCalled()
      expect(showCommandPalette.value).toBe(true)

      // Toggle off with Cmd+K
      const eCmdK = createMockEvent('K', { metaKey: true, target: inputEl })
      shortcuts.handleKeydown(eCmdK)
      expect(eCmdK.preventDefault).toHaveBeenCalled()
      expect(showCommandPalette.value).toBe(false)
    })

    it('triggers Global Search on "/" when not focused on an input', () => {
      const shortcuts = useGlobalShortcuts()

      const eSlash = createMockEvent('/')
      shortcuts.handleKeydown(eSlash)

      expect(eSlash.preventDefault).toHaveBeenCalled()
      expect(showCommandPalette.value).toBe(true)
    })

    it('does NOT trigger Global Search on "/" when user is typing in an input or textarea', () => {
      const shortcuts = useGlobalShortcuts()

      const eSlashInput = createMockEvent('/', { target: { tagName: 'INPUT' } })
      shortcuts.handleKeydown(eSlashInput)

      expect(eSlashInput.preventDefault).not.toHaveBeenCalled()
      expect(showCommandPalette.value).toBe(false)

      const eSlashTextarea = createMockEvent('/', { target: { tagName: 'TEXTAREA' } })
      shortcuts.handleKeydown(eSlashTextarea)

      expect(eSlashTextarea.preventDefault).not.toHaveBeenCalled()
      expect(showCommandPalette.value).toBe(false)
    })

    it('triggers New Task on "T" when not typing', () => {
      const shortcuts = useGlobalShortcuts()

      const eTask = createMockEvent('t')
      shortcuts.handleKeydown(eTask)

      expect(eTask.preventDefault).toHaveBeenCalled()
      expect(showGlobalTaskModal.value).toBe(true)
    })

    it('does NOT trigger New Task on "T" when typing in an input or contenteditable', () => {
      const shortcuts = useGlobalShortcuts()

      const eTaskInput = createMockEvent('T', { target: { tagName: 'INPUT' } })
      shortcuts.handleKeydown(eTaskInput)

      expect(eTaskInput.preventDefault).not.toHaveBeenCalled()
      expect(showGlobalTaskModal.value).toBe(false)
    })

    it('does NOT trigger single-key hotkeys when a modal or dialog is already open', () => {
      mockIsDialogOpen.mockReturnValueOnce(true)
      const shortcuts = useGlobalShortcuts()

      const eTask = createMockEvent('t')
      shortcuts.handleKeydown(eTask)
      expect(showGlobalTaskModal.value).toBe(false)

      mockIsDialogOpen.mockReturnValueOnce(true)
      const eSlash = createMockEvent('/')
      shortcuts.handleKeydown(eSlash)
      expect(showCommandPalette.value).toBe(false)
    })
  })
})
