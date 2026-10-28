import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSavedLoginState,
  saveLoginState,
  clearSavedLoginState,
  REMEMBER_ME_KEY,
  SAVED_EMAIL_KEY,
} from '@/utils/authHelpers'

describe('authHelpers - Remember Me & Credential Storage', () => {
  let mockStorage = {}
  const fakeStorage = {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, val) => {
      mockStorage[key] = String(val)
    },
    removeItem: (key) => {
      delete mockStorage[key]
    },
    clear: () => {
      mockStorage = {}
    },
  }

  beforeEach(() => {
    mockStorage = {}
  })

  it('returns default state when storage is empty', () => {
    const state = getSavedLoginState(fakeStorage)
    expect(state).toEqual({ remember: false, email: '' })
  })

  it('returns default state when storage is null/unavailable', () => {
    const state = getSavedLoginState(null)
    expect(state).toEqual({ remember: false, email: '' })
  })

  it('persists credentials when remember is true', () => {
    saveLoginState('test@crestara.com', true, fakeStorage)
    expect(fakeStorage.getItem(REMEMBER_ME_KEY)).toBe('true')
    expect(fakeStorage.getItem(SAVED_EMAIL_KEY)).toBe('test@crestara.com')

    const state = getSavedLoginState(fakeStorage)
    expect(state).toEqual({ remember: true, email: 'test@crestara.com' })
  })

  it('trims whitespace from saved email', () => {
    saveLoginState('  admin@crestara.com   ', true, fakeStorage)
    expect(fakeStorage.getItem(SAVED_EMAIL_KEY)).toBe('admin@crestara.com')
  })

  it('clears credentials when remember is false', () => {
    saveLoginState('test@crestara.com', true, fakeStorage)
    expect(fakeStorage.getItem(REMEMBER_ME_KEY)).toBe('true')

    saveLoginState('test@crestara.com', false, fakeStorage)
    expect(fakeStorage.getItem(REMEMBER_ME_KEY)).toBeNull()
    expect(fakeStorage.getItem(SAVED_EMAIL_KEY)).toBeNull()

    const state = getSavedLoginState(fakeStorage)
    expect(state).toEqual({ remember: false, email: '' })
  })

  it('explicitly clears saved credentials with clearSavedLoginState', () => {
    saveLoginState('user@example.com', true, fakeStorage)
    expect(getSavedLoginState(fakeStorage).remember).toBe(true)

    clearSavedLoginState(fakeStorage)
    expect(getSavedLoginState(fakeStorage)).toEqual({ remember: false, email: '' })
  })

  it('handles storage throwing errors without crashing', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('Quota exceeded')
      },
      setItem: () => {
        throw new Error('Quota exceeded')
      },
      removeItem: () => {
        throw new Error('Quota exceeded')
      },
    }

    expect(() => saveLoginState('user@example.com', true, brokenStorage)).not.toThrow()
    expect(() => getSavedLoginState(brokenStorage)).not.toThrow()
    expect(getSavedLoginState(brokenStorage)).toEqual({ remember: false, email: '' })
    expect(() => clearSavedLoginState(brokenStorage)).not.toThrow()
  })
})
