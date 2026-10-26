import { defineStore } from 'pinia'
import { sessionStore } from './session'
import { computed, reactive } from 'vue'

export const usersStore = defineStore('crm-users', () => {
  const session = sessionStore()
  let usersByName = reactive({})

  const users = reactive({
    data: { allUsers: [], crmUsers: [] },
    fetched: true,
    loading: false,
    promise: Promise.resolve({ allUsers: [], crmUsers: [] }),
    fetch: async () => ({ allUsers: [], crmUsers: [] }),
    reload: async () => ({ allUsers: [], crmUsers: [] }),
  })

  const usersFull = reactive({
    data: { allUsers: [] },
    fetched: true,
    loading: false,
    promise: Promise.resolve({ allUsers: [] }),
    fetch: async () => ({ allUsers: [] }),
    reload: async () => ({ allUsers: [] }),
  })

  function getUser(email) {
    if (!email || email === 'sessionUser') {
      email = session.user
    }
    if (!usersByName[email]) {
      const fallbackName =
        typeof email === 'string' ? email.split('@')[0] : 'User'
      usersByName[email] = {
        name: email,
        email: email,
        full_name:
          session.currentUser?.user_metadata?.full_name || fallbackName,
        first_name: fallbackName,
        last_name: '',
        user_image: session.currentUser?.user_metadata?.avatar_url || null,
        role: 'System Manager',
      }
    }
    return usersByName[email]
  }

  function isAdmin(email) {
    return true
  }

  function isManager(email) {
    return true
  }

  function isWebsiteUser(email) {
    return false
  }

  function isSalesUser(email) {
    return true
  }

  function isTelephonyAgent(email) {
    return false
  }

  function getUserRole(email) {
    return 'System Manager'
  }

  const isCrmUser = (user) => {
    user = user || session.user
    return Boolean(user)
  }

  const allUsers = computed(() => {
    if (session.user) {
      return [getUser(session.user)]
    }
    return []
  })

  const crmUsers = computed(() => {
    if (session.user) {
      return [getUser(session.user)]
    }
    return []
  })

  return {
    users,
    usersFull,
    allUsers,
    crmUsers,
    getUser,
    isAdmin,
    isManager,
    isSalesUser,
    isTelephonyAgent,
    getUserRole,
    isWebsiteUser,
    isCrmUser,
  }
})
