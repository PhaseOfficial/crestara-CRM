import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import { supabase } from '@/utils/supabase'

export const sessionStore = defineStore('crm-session', () => {
  const currentSession = ref(null)
  const currentUser = ref(null)
  const userProfile = ref(null)
  const isInitialized = ref(false)
  let profileSubscription = null

  function syncUserCookie(userObj) {
    if (typeof document === 'undefined') return
    if (userObj?.email) {
      document.cookie = `user_id=${userObj.email}; path=/; max-age=2592000`
      if (typeof window !== 'undefined') {
        window.frappe_boot = window.frappe_boot || {}
        window.frappe_boot.session = { user: userObj.email }
        window.boot = window.boot || {}
        window.boot.session = { user: userObj.email }
      }
    } else {
      document.cookie = 'user_id=; path=/; max-age=0'
      if (typeof window !== 'undefined') {
        window.frappe_boot = window.frappe_boot || {}
        window.frappe_boot.session = { user: 'Guest' }
        window.boot = window.boot || {}
        window.boot.session = { user: 'Guest' }
      }
    }
  }

  // Fetch user profile and role from Supabase profiles table
  async function fetchProfile(userId) {
    if (!userId) {
      userProfile.value = null
      return null
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        userProfile.value = data
        return data
      }
    } catch (err) {
      console.warn('[Session] Failed to fetch profile from Supabase:', err)
    }

    // Fallback if profile row is not yet created or table doesn't exist
    if (currentUser.value) {
      const meta = currentUser.value.user_metadata || {}
      userProfile.value = {
        id: currentUser.value.id,
        email: currentUser.value.email,
        full_name: meta.full_name || currentUser.value.email?.split('@')[0] || 'User',
        role: meta.role || 'Administrator',
      }
    }
    return userProfile.value
  }

  function subscribeToProfile(userId) {
    if (profileSubscription) {
      profileSubscription.unsubscribe()
      profileSubscription = null
    }
    if (!userId) return

    profileSubscription = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            userProfile.value = payload.new
          }
        },
      )
      .subscribe()
  }

  // Initialize session from Supabase
  const initPromise = supabase.auth.getSession().then(async ({ data: { session } }) => {
    currentSession.value = session
    currentUser.value = session?.user || null
    if (session?.user?.id) {
      await fetchProfile(session.user.id)
      subscribeToProfile(session.user.id)
    }
    isInitialized.value = true
    syncUserCookie(session?.user)
    return session
  })

  // Listen to Auth State changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentSession.value = session
    currentUser.value = session?.user || null
    if (session?.user?.id) {
      await fetchProfile(session.user.id)
      subscribeToProfile(session.user.id)
    } else {
      userProfile.value = null
      if (profileSubscription) {
        profileSubscription.unsubscribe()
        profileSubscription = null
      }
    }
    isInitialized.value = true
    syncUserCookie(session?.user)
  })

  const user = computed(() => {
    return currentUser.value?.email || currentUser.value?.id || null
  })

  const userRole = computed(() => {
    return (
      userProfile.value?.role ||
      currentUser.value?.user_metadata?.role ||
      'Customer'
    )
  })

  const isLoggedIn = computed(() => !!currentUser.value)

  const loginLoading = ref(false)
  const loginError = ref(null)

  // Login handler compatible with existing code (.submit({ usr, pwd }))
  const login = {
    get loading() {
      return loginLoading.value
    },
    set loading(val) {
      loginLoading.value = Boolean(val)
    },
    get error() {
      return loginError.value
    },
    set error(val) {
      loginError.value = val
    },
    async submit(credentials = {}) {
      const email = credentials.email || credentials.usr
      const password = credentials.password || credentials.pwd

      if (!email || !password) {
        throw new Error('Please enter both email and password.')
      }

      loginLoading.value = true
      loginError.value = null

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          loginError.value = error
          throw error
        }

        currentSession.value = data.session
        currentUser.value = data.user
        if (data.user?.id) {
          await fetchProfile(data.user.id)
          subscribeToProfile(data.user.id)
        }
        return data
      } catch (err) {
        loginError.value = err
        throw err
      } finally {
        loginLoading.value = false
      }
    },
    reset() {
      loginError.value = null
      loginLoading.value = false
    },
  }

  const logoutLoading = ref(false)

  // Logout handler compatible with existing code (.submit())
  const logout = {
    get loading() {
      return logoutLoading.value
    },
    set loading(val) {
      logoutLoading.value = Boolean(val)
    },
    async submit() {
      logoutLoading.value = true
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Supabase sign out error:', err)
      } finally {
        currentSession.value = null
        currentUser.value = null
        userProfile.value = null
        if (profileSubscription) {
          profileSubscription.unsubscribe()
          profileSubscription = null
        }
        logoutLoading.value = false
        syncUserCookie(null)
        router.replace({ name: 'Login' })
      }
    },
  }

  async function signUp({ email, password, data = {} }) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data },
    })
  }

  async function resetPasswordForEmail({ email }) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/crm/login` : undefined,
    })
  }

  return {
    user,
    userRole,
    userProfile,
    currentUser,
    currentSession,
    isLoggedIn,
    isInitialized,
    initPromise,
    fetchProfile,
    login,
    logout,
    signUp,
    resetPasswordForEmail,
  }
})
