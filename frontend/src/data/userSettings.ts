import { ref, reactive, readonly, Ref } from 'vue'

export interface UserSettings {
  [key: string]: unknown
}

export interface UserSettingsCache {
  [doctype: string]: UserSettings
}

export interface UseUserSettingsReturn {
  loading: Ref<boolean>
  error: Ref<Error | null>
  get: (doctype: string) => Promise<UserSettings>
  save: (doctype: string, key: string, value: unknown) => Promise<UserSettings>
  remove: (doctype: string, key: string) => Promise<UserSettings>
  update: (doctype: string, userSettings: UserSettings) => Promise<UserSettings>
  getCached: (doctype: string, key?: string | null) => unknown
  clearCache: (doctype?: string | null) => void
  userSettingsCache: Readonly<UserSettingsCache>
}

const userSettingsCache: UserSettingsCache = reactive({})

export function useUserSettings(): UseUserSettingsReturn {
  const loading: Ref<boolean> = ref(false)
  const error: Ref<Error | null> = ref(null)

  const get = async (doctype: string): Promise<UserSettings> => {
    if (!doctype) {
      throw new Error('Doctype is required')
    }

    try {
      loading.value = true
      error.value = null

      let settings: UserSettings = {}
      try {
        const stored = localStorage.getItem(`crm_user_settings_${doctype}`)
        if (stored) {
          settings = JSON.parse(stored)
        }
      } catch {
        settings = {}
      }

      userSettingsCache[doctype] = settings
      return settings
    } finally {
      loading.value = false
    }
  }

  const save = async (
    doctype: string,
    key: string,
    value: unknown,
  ): Promise<UserSettings> => {
    if (!doctype || !key) {
      throw new Error('Doctype and key are required')
    }

    try {
      loading.value = true
      error.value = null

      const oldUserSettings: UserSettings = userSettingsCache[doctype] || {}
      const newUserSettings: UserSettings = JSON.parse(
        JSON.stringify(oldUserSettings),
      )

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        newUserSettings[key] = newUserSettings[key] || {}
        Object.assign(newUserSettings[key] as object, value)
      } else {
        newUserSettings[key] = value
      }

      const oldString = JSON.stringify(oldUserSettings)
      const newString = JSON.stringify(newUserSettings)

      if (oldString !== newString) {
        return await update(doctype, newUserSettings)
      }

      return Promise.resolve(newUserSettings)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error.value = errorObj
      console.error('Error saving user settings:', err)
      throw errorObj
    } finally {
      loading.value = false
    }
  }

  const remove = async (
    doctype: string,
    key: string,
  ): Promise<UserSettings> => {
    if (!doctype || !key) {
      throw new Error('Doctype and key are required')
    }

    try {
      loading.value = true
      error.value = null

      const userSettings: UserSettings = userSettingsCache[doctype] || {}
      const updatedSettings: UserSettings = { ...userSettings }
      delete updatedSettings[key]

      return await update(doctype, updatedSettings)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error.value = errorObj
      console.error('Error removing user setting:', err)
      throw errorObj
    } finally {
      loading.value = false
    }
  }

  const update = async (
    doctype: string,
    userSettings: UserSettings,
  ): Promise<UserSettings> => {
    if (!doctype) {
      throw new Error('Doctype is required')
    }

    try {
      loading.value = true
      error.value = null

      try {
        localStorage.setItem(
          `crm_user_settings_${doctype}`,
          JSON.stringify(userSettings),
        )
      } catch (e) {
        console.warn('Could not persist user settings to localStorage:', e)
      }

      userSettingsCache[doctype] = userSettings
      return userSettings
    } finally {
      loading.value = false
    }
  }

  const getCached = (doctype: string, key: string | null = null): unknown => {
    const settings: UserSettings = userSettingsCache[doctype] || {}
    if (key) {
      return settings[key] || {}
    }
    return settings
  }

  const clearCache = (doctype: string | null = null): void => {
    if (doctype) {
      delete userSettingsCache[doctype]
    } else {
      Object.keys(userSettingsCache).forEach((key) => {
        delete userSettingsCache[key]
      })
    }
  }

  return {
    loading,
    error,
    get,
    save,
    remove,
    update,
    getCached,
    clearCache,
    userSettingsCache: readonly(userSettingsCache),
  }
}

export async function getUserSettings(
  doctype: string,
  key: string | null = null,
): Promise<unknown> {
  let settings: UserSettings = userSettingsCache[doctype]

  if (!settings) {
    const { get } = useUserSettings()
    settings = await get(doctype)
  }

  if (key) {
    return settings[key] || {}
  }
  return settings
}
