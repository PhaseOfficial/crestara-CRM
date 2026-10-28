/**
 * Crestara CRM - Authentication & Credential Storage Helpers
 * Manages "Remember Me" preferences and saved login credentials.
 */

export const REMEMBER_ME_KEY = 'crestara_remember_me'
export const SAVED_EMAIL_KEY = 'crestara_saved_email'

/**
 * Retrieves the saved login state from persistent storage.
 * @param {Storage} [storage] - Optional storage implementation (defaults to window.localStorage)
 * @returns {{ remember: boolean, email: string }}
 */
export function getSavedLoginState(
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (!storage) {
    return { remember: false, email: '' }
  }

  try {
    const remember = storage.getItem(REMEMBER_ME_KEY) === 'true'
    const email = remember ? storage.getItem(SAVED_EMAIL_KEY) || '' : ''
    return { remember, email }
  } catch (err) {
    console.warn('[authHelpers] Failed to read saved login state:', err)
    return { remember: false, email: '' }
  }
}

/**
 * Persists or clears the login credentials and "Remember Me" state.
 * @param {string} email - The email/username to remember
 * @param {boolean} remember - Whether to remember the credentials
 * @param {Storage} [storage] - Optional storage implementation (defaults to window.localStorage)
 */
export function saveLoginState(
  email,
  remember,
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (!storage) return

  try {
    if (remember) {
      storage.setItem(REMEMBER_ME_KEY, 'true')
      storage.setItem(SAVED_EMAIL_KEY, (email || '').trim())
    } else {
      storage.removeItem(REMEMBER_ME_KEY)
      storage.removeItem(SAVED_EMAIL_KEY)
    }
  } catch (err) {
    console.warn('[authHelpers] Failed to save login state:', err)
  }
}

/**
 * Clears any remembered credentials from persistent storage.
 * @param {Storage} [storage] - Optional storage implementation (defaults to window.localStorage)
 */
export function clearSavedLoginState(
  storage = typeof window !== 'undefined' ? window.localStorage : null,
) {
  if (!storage) return

  try {
    storage.removeItem(REMEMBER_ME_KEY)
    storage.removeItem(SAVED_EMAIL_KEY)
  } catch (err) {
    console.warn('[authHelpers] Failed to clear saved login state:', err)
  }
}
