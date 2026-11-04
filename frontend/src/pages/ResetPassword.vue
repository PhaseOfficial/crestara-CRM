<template>
  <div class="h-full w-full overflow-y-auto flex min-h-full items-center justify-center bg-surface-gray-2 px-4 py-12 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-6 rounded-2xl bg-surface-base p-8 shadow-sm border border-outline-base my-auto">
      <!-- Header with Logo -->
      <div class="text-center">
        <div class="flex justify-center mb-4">
          <img
            src="/crestara_logo.png"
            alt="Crestara CRM"
            class="h-12 w-auto object-contain max-w-[200px]"
          />
        </div>
        <h2 class="text-2xl font-bold tracking-tight text-ink-gray-9">
          {{ isRecoveryMode ? __('Set new password') : __('Reset your password') }}
        </h2>
        <p class="mt-2 text-sm text-ink-gray-5">
          {{
            isRecoveryMode
              ? __('Choose a strong new password for your account')
              : __('Enter your account email to receive a password recovery link')
          }}
        </p>
      </div>

      <!-- Feedback Messages -->
      <ErrorMessage v-if="errorMessage" :message="errorMessage" />
      <Alert
        v-if="infoMessage"
        theme="green"
        :title="infoMessage"
      />

      <!-- Success State Banner -->
      <div
        v-if="passwordUpdated"
        class="rounded-xl border border-outline-green-2 bg-surface-green-2 p-4 text-center space-y-3"
      >
        <div class="inline-flex size-10 rounded-full bg-surface-green-3 items-center justify-center text-ink-green-8">
          <FeatherIcon name="check" class="size-5" />
        </div>
        <h3 class="text-sm font-bold text-ink-green-9">
          {{ __('Password successfully updated!') }}
        </h3>
        <p class="text-xs text-ink-green-8 leading-relaxed">
          {{ __('Your password has been changed. You will be redirected to sign in shortly.') }}
        </p>
        <Button
          class="w-full justify-center"
          variant="solid"
          theme="green"
          @click="router.push('/login')"
        >
          {{ __('Go to Sign In') }}
        </Button>
      </div>

      <!-- MODE 1: SET NEW PASSWORD FORM (When arriving from recovery link) -->
      <form
        v-else-if="isRecoveryMode"
        class="space-y-4"
        method="POST"
        action="javascript:void(0);"
        @submit.prevent="handleUpdatePassword"
      >
        <div>
          <label for="new-password" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('New Password') }}
          </label>
          <TextInput
            id="new-password"
            name="new-password"
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
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
                :title="showNewPassword ? __('Hide password') : __('Show password')"
                @click="showNewPassword = !showNewPassword"
              >
                <FeatherIcon :name="showNewPassword ? 'eye-off' : 'eye'" class="size-4" />
              </button>
            </template>
          </TextInput>
          <p class="text-[11px] text-ink-gray-5 mt-1">
            {{ __('Must be at least 6 characters long') }}
          </p>
        </div>

        <div>
          <label for="confirm-password" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('Confirm New Password') }}
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
            :class="newPassword === confirmPassword ? 'text-ink-green-6' : 'text-ink-red-6'"
          >
            <FeatherIcon :name="newPassword === confirmPassword ? 'check' : 'alert-circle'" class="size-3.5" />
            {{ newPassword === confirmPassword ? __('Passwords match') : __('Passwords do not match') }}
          </p>
        </div>

        <Button
          class="w-full justify-center !mt-6"
          variant="solid"
          type="submit"
          :loading="loading"
          :disabled="!newPassword || newPassword !== confirmPassword || newPassword.length < 6"
        >
          {{ __('Update Password') }}
        </Button>

        <div class="text-center pt-2">
          <button
            type="button"
            class="text-xs font-medium text-ink-gray-6 hover:text-ink-gray-9 transition"
            @click="isRecoveryMode = false"
          >
            {{ __('Need a new reset link instead?') }}
          </button>
        </div>
      </form>

      <!-- MODE 2: REQUEST RESET LINK FORM (Email entry) -->
      <form
        v-else
        class="space-y-4"
        method="POST"
        action="javascript:void(0);"
        @submit.prevent="handleSendResetLink"
      >
        <div>
          <label for="email" class="block text-sm font-medium text-ink-gray-7 mb-1">
            {{ __('Email address') }}
          </label>
          <TextInput
            id="email"
            name="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="name@company.com"
            required
            :disabled="loading"
          />
        </div>

        <Button
          class="w-full justify-center !mt-6"
          variant="solid"
          type="submit"
          :loading="loading"
          :disabled="!email"
        >
          {{ __('Send Reset Link') }}
        </Button>

        <div class="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            class="text-xs font-medium text-ink-blue-6 hover:underline"
            @click="isRecoveryMode = true"
          >
            {{ __('I already have a reset link / code') }}
          </button>
          <router-link
            to="/login"
            class="text-sm font-medium text-ink-gray-6 hover:text-ink-gray-9 hover:underline mt-1"
          >
            {{ __('Back to Sign in') }}
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { sessionStore } from '@/stores/session'
import { supabase } from '@/utils/supabase'
import {
  Button,
  TextInput,
  ErrorMessage,
  Alert,
  FeatherIcon,
} from 'frappe-ui'

const router = useRouter()
const route = useRoute()
const session = sessionStore()

const isRecoveryMode = ref(false)
const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const passwordUpdated = ref(false)

onMounted(() => {
  // Check for recovery token or query parameters
  const hash = window.location.hash || ''
  const query = route.query || {}

  if (
    hash.includes('type=recovery') ||
    hash.includes('access_token=') ||
    query.type === 'recovery' ||
    query.code
  ) {
    isRecoveryMode.value = true
  }

  // Listen for Supabase password recovery auth event
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      isRecoveryMode.value = true
      errorMessage.value = ''
      infoMessage.value = 'Please enter your new password below.'
    }
  })
})

async function handleSendResetLink() {
  errorMessage.value = ''
  infoMessage.value = ''
  loading.value = true

  try {
    const { error } = await session.resetPasswordForEmail({
      email: email.value.trim(),
    })
    if (error) throw error

    infoMessage.value = 'Password reset link sent! Please check your email inbox and click the link to reset your password.'
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to send password reset email. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleUpdatePassword() {
  errorMessage.value = ''
  infoMessage.value = ''

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match. Please ensure both passwords match.'
    return
  }

  loading.value = true

  try {
    const { error } = await session.updateUserPassword(newPassword.value)
    if (error) throw error

    passwordUpdated.value = true
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err) {
    errorMessage.value = err?.message || 'Could not update password. Your reset link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>
