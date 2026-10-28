<template>
  <div class="flex min-h-screen items-center justify-center bg-surface-gray-2 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-6 rounded-2xl bg-surface-base p-8 shadow-sm border border-outline-base">
      <div class="text-center">
        <div class="flex justify-center mb-4">
          <img
            src="/crestara_logo.png"
            alt="Crestara CRM"
            class="h-12 w-auto object-contain max-w-[200px]"
          />
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-ink-gray-9">
          {{
            authMode === 'forgot'
              ? __('Reset your password')
              : authMode === 'signup'
                ? __('Create an account')
                : __('Sign in to Crestara CRM')
          }}
        </h2>
        <p class="mt-2 text-sm text-ink-gray-5">
          {{
            authMode === 'forgot'
              ? __('Enter your email to receive a password reset link')
              : authMode === 'signup'
                ? __('Get started with your business & CRM workspace')
                : __('Enter your credentials to access your workspace')
          }}
        </p>
      </div>

      <!-- Mode Selector Tabs (Sign In vs Sign Up) -->
      <div v-if="authMode !== 'forgot'" class="flex rounded-lg bg-surface-gray-2 p-1 text-sm font-medium">
        <button
          type="button"
          :class="[
            'w-1/2 rounded-md py-1.5 transition-all',
            authMode === 'signin'
              ? 'bg-surface-base text-ink-gray-9 shadow-sm'
              : 'text-ink-gray-5 hover:text-ink-gray-8',
          ]"
          @click="setMode('signin')"
        >
          {{ __('Sign In') }}
        </button>
        <button
          type="button"
          :class="[
            'w-1/2 rounded-md py-1.5 transition-all',
            authMode === 'signup'
              ? 'bg-surface-base text-ink-gray-9 shadow-sm'
              : 'text-ink-gray-5 hover:text-ink-gray-8',
          ]"
          @click="setMode('signup')"
        >
          {{ __('Sign Up') }}
        </button>
      </div>

      <!-- Form -->
      <form
        class="space-y-4"
        @submit.prevent="handleSubmit"
        method="POST"
        action="javascript:void(0);"
        autocomplete="on"
      >
        <ErrorMessage v-if="errorMessage" :message="errorMessage" />
        <Alert
          v-if="infoMessage"
          theme="green"
          :title="infoMessage"
        />

        <div v-if="authMode === 'signup'">
          <label for="full-name" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('Full Name') }}
          </label>
          <TextInput
            id="full-name"
            name="name"
            v-model="fullName"
            type="text"
            autocomplete="name"
            placeholder="John Doe"
            required
            :disabled="loading"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('Email address') }}
          </label>
          <TextInput
            id="email"
            :name="authMode === 'signup' ? 'email' : 'username'"
            v-model="email"
            type="email"
            :autocomplete="authMode === 'signup' ? 'email' : 'username'"
            placeholder="name@company.com"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="authMode !== 'forgot'">
          <label for="password" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('Password') }}
          </label>
          <TextInput
            id="password"
            name="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="authMode === 'signup' ? 'new-password' : 'current-password'"
            placeholder="••••••••"
            required
            minlength="6"
            :disabled="loading"
          >
            <template #suffix>
              <button
                type="button"
                class="flex items-center text-ink-gray-5 hover:text-ink-gray-8 transition pr-1 focus:outline-none"
                :title="showPassword ? __('Hide password') : __('Show password')"
                @click="showPassword = !showPassword"
              >
                <FeatherIcon :name="showPassword ? 'eye-off' : 'eye'" class="size-4" />
              </button>
            </template>
          </TextInput>
        </div>

        <!-- Remember Me and Forgot Password for Sign In -->
        <div v-if="authMode === 'signin'" class="flex items-center justify-between pt-0.5">
          <Checkbox
            v-model="rememberMe"
            id="remember-me"
            name="remember-me"
            :label="__('Remember me')"
            class="cursor-pointer select-none"
          />
          <button
            type="button"
            class="text-xs font-medium text-ink-blue-6 hover:underline focus:outline-none"
            @click="setMode('forgot')"
          >
            {{ __('Forgot password?') }}
          </button>
        </div>

        <!-- Confirm Password Field for Sign Up -->
        <div v-if="authMode === 'signup'">
          <label for="confirm-password" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('Confirm Password') }}
          </label>
          <TextInput
            id="confirm-password"
            name="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="••••••••"
            required
            minlength="6"
            :disabled="loading"
          >
            <template #suffix>
              <button
                type="button"
                class="flex items-center text-ink-gray-5 hover:text-ink-gray-8 transition pr-1 focus:outline-none"
                :title="showConfirmPassword ? __('Hide password') : __('Show password')"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <FeatherIcon :name="showConfirmPassword ? 'eye-off' : 'eye'" class="size-4" />
              </button>
            </template>
          </TextInput>
          <p
            v-if="confirmPassword"
            class="text-xs mt-1.5 flex items-center gap-1.5 font-medium"
            :class="password === confirmPassword ? 'text-ink-green-6' : 'text-ink-red-6'"
          >
            <FeatherIcon :name="password === confirmPassword ? 'check' : 'alert-circle'" class="size-3.5" />
            {{ password === confirmPassword ? __('Passwords match') : __('Passwords do not match') }}
          </p>
        </div>

        <Button
          class="w-full justify-center !mt-6"
          variant="solid"
          type="submit"
          :loading="loading"
        >
          {{
            authMode === 'forgot'
              ? __('Send Reset Link')
              : authMode === 'signup'
                ? __('Create Account')
                : __('Sign in')
          }}
        </Button>

        <div v-if="authMode === 'forgot'" class="text-center pt-2">
          <button
            type="button"
            class="text-sm font-medium text-ink-blue-6 hover:underline"
            @click="setMode('signin')"
          >
            {{ __('Back to Sign in') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sessionStore } from '@/stores/session'
import { useBusinessStore } from '@/stores/business'
import {
  Button,
  TextInput,
  Checkbox,
  ErrorMessage,
  Alert,
  FeatherIcon,
} from 'frappe-ui'
import { getSavedLoginState, saveLoginState } from '@/utils/authHelpers'

const router = useRouter()
const session = sessionStore()
const business = useBusinessStore()

const authMode = ref('signin') // 'signin' | 'signup' | 'forgot'
const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

onMounted(() => {
  const saved = getSavedLoginState()
  if (saved.remember) {
    rememberMe.value = true
    if (saved.email) {
      email.value = saved.email
    }
  }
})

function setMode(mode) {
  authMode.value = mode
  errorMessage.value = ''
  infoMessage.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
}

async function handleSubmit() {
  errorMessage.value = ''
  infoMessage.value = ''

  // Fallback sync for browser autofill engines that directly populate inputs without triggering Vue events
  if (typeof document !== 'undefined') {
    const emailEl = document.getElementById('email')
    const passwordEl = document.getElementById('password')
    if (emailEl?.value && !email.value) {
      email.value = emailEl.value
    }
    if (passwordEl?.value && !password.value) {
      password.value = passwordEl.value
    }
  }

  if (authMode.value === 'signup' && password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match. Please make sure both passwords match.'
    return
  }

  loading.value = true

  try {
    if (authMode.value === 'forgot') {
      const { error } = await session.resetPasswordForEmail({
        email: email.value.trim(),
      })
      if (error) throw error
      infoMessage.value = 'Password reset instructions have been sent to your email.'
      return
    }

    if (authMode.value === 'signup') {
      const emailVal = email.value.trim()
      const { data, error } = await session.signUp({
        email: emailVal,
        password: password.value,
        data: {
          full_name: fullName.value.trim(),
          role: 'Customer',
        },
      })

      if (error) throw error

      if (data?.session) {
        saveLoginState(emailVal, rememberMe.value)
        if (data.user?.id) {
          await session.fetchProfile(data.user.id)
        }
        business.resolveUserRole(emailVal)
        redirectByRole()
      } else {
        infoMessage.value = 'Account created! Please check your email to confirm your registration, or sign in.'
        authMode.value = 'signin'
      }
    } else {
      const emailVal = email.value.trim()
      const res = await session.login.submit({
        email: emailVal,
        password: password.value,
      })

      saveLoginState(emailVal, rememberMe.value)

      if (res?.user?.id) {
        await session.fetchProfile(res.user.id)
      }
      business.resolveUserRole(emailVal)
      redirectByRole()
    }
  } catch (err) {
    errorMessage.value =
      err?.message || 'Authentication failed. Please check your credentials.'
  } finally {
    loading.value = false
  }
}

function redirectByRole() {
  const role = session.userRole || business.currentRole
  if (role === 'Customer') {
    router.replace('/portal')
  } else {
    router.replace('/dashboard')
  }
}
</script>
