<template>
  <div class="flex flex-col flex-1 h-full w-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-base sm:text-xl font-bold text-ink-gray-9">{{ __('Business Settings') }}</h1>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4 border border-outline-purple-2">
            {{ __('Administrator Only') }}
          </span>
        </div>
      </template>
      <template #right-header>
        <div class="flex items-center gap-2">
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <span
              v-if="savedSuccess"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 text-xs font-semibold shadow-xs"
            >
              <span class="lucide-check size-3.5" />
              {{ __('Settings saved!') }}
            </span>
          </transition>
          <Button
            variant="solid"
            iconLeft="check"
            :label="isMobileView ? '' : __('Save Settings')"
            :tooltip="__('Save Settings')"
            :loading="saving"
            @click="save"
          />
        </div>
      </template>
    </LayoutHeader>

    <!-- Canvas with Safe Mobile Bottom Nav Clearance -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6 max-w-5xl w-full mx-auto">
      <!-- Company Information Card -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-building-2 size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Company & Contact Information') }}
          </h2>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
            {{ __('These details will appear on all outgoing customer invoices and receipts.') }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormControl
            v-model="form.business_name"
            :label="__('Company Legal Name')"
            type="text"
            required
          />
          <FormControl
            v-model="form.business_email"
            :label="__('Billing Email Address')"
            type="email"
            required
          />
          <FormControl
            v-model="form.business_phone"
            :label="__('Billing Phone')"
            type="text"
            required
          />
          <FormControl
            v-model="form.tax_id"
            :label="__('Tax ID / VAT Number')"
            type="text"
            placeholder="e.g. US-94-8829103"
          />
        </div>

        <FormControl
          v-model="form.business_address"
          :label="__('Official Street Address')"
          type="textarea"
          rows="3"
        />
      </div>

      <!-- Invoicing & Currency Rules -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-receipt size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Invoice Numbering & Financial Defaults') }}
          </h2>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
            {{ __('Configure sequential document prefixes, default commercial terms, and statutory tax rates.') }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormControl
            v-model="form.invoice_prefix"
            :label="__('Invoice Prefix')"
            type="text"
            placeholder="INV-2026-"
            required
          />
          <FormControl
            v-model.number="form.next_invoice_number"
            :label="__('Next Sequence Number')"
            type="number"
            min="1"
            required
          />
          <FormControl
            v-model="form.currency"
            :label="__('Currency')"
            type="select"
            :options="['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ZAR']"
            required
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormControl
            v-model.number="form.default_payment_terms"
            :label="__('Default Terms (Days)')"
            type="number"
            min="0"
          />
          <FormControl
            v-model.number="form.tax_rate"
            :label="__('Default Tax Rate (%)')"
            type="number"
            step="0.1"
            min="0"
          />
          <FormControl
            v-model.number="form.late_fee_percentage"
            :label="__('Late Fee (% per month)')"
            type="number"
            step="0.5"
            min="0"
          />
        </div>

        <FormControl
          v-model="form.notes_template"
          :label="__('Default Footer / Remittance Notes')"
          type="textarea"
          rows="2"
        />
      </div>

      <!-- Staff Management & Role Permissions -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
              <span class="lucide-users size-4 text-ink-gray-5 dark:text-ink-gray-4" />
              {{ __('Staff Accounts & Role Assignments') }}
            </h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Manage internal CRM staff members and system administrator permissions.') }}
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Role Filter Tabs (Design System Elevated Pattern) -->
            <div class="flex items-center bg-surface-gray-2 dark:bg-surface-gray-1 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="selectedRoleFilter === 'Staff' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
                @click="selectedRoleFilter = 'Staff'"
              >
                {{ __('Staff') }} ({{ staffCount }})
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="selectedRoleFilter === 'All' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
                @click="selectedRoleFilter = 'All'"
              >
                {{ __('All Team') }} ({{ totalInternalCount }})
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="selectedRoleFilter === 'Administrator' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
                @click="selectedRoleFilter = 'Administrator'"
              >
                {{ __('Admins') }} ({{ adminCount }})
              </button>
            </div>
            <Button size="sm" variant="outline" :label="__('Invite Staff')" iconLeft="user-plus" @click="showInvite = true" />
          </div>
        </div>

        <!-- Desktop Staff Table (>= 768px) -->
        <div class="hidden md:block border border-outline-gray-1 rounded-lg overflow-hidden overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-4">{{ __('Staff Member') }}</th>
                <th class="py-3 px-4">{{ __('Email') }}</th>
                <th class="py-3 px-4">{{ __('Assigned Role') }}</th>
                <th class="py-3 px-4 text-right">{{ __('Access Area') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr v-for="user in filteredStaffUsers" :key="user.id" class="hover:bg-surface-gray-1 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2.5">
                    <Avatar size="sm" :label="user.full_name" :image="user.avatar" />
                    <span class="font-semibold text-ink-gray-9">{{ user.full_name }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6">{{ user.email }}</td>
                <td class="py-3 px-4">
                  <select
                    v-model="user.role"
                    class="bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-md px-2.5 py-1 text-xs font-semibold text-ink-gray-9 focus:outline-none focus:ring-1 focus:ring-outline-gray-3"
                    @change="onRoleChanged(user)"
                  >
                    <option value="Staff">{{ __('Staff') }}</option>
                    <option value="Administrator">{{ __('Administrator') }}</option>
                  </select>
                </td>
                <td class="py-3 px-4 text-right text-xs">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                    :class="
                      user.role === 'Administrator'
                        ? 'bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4 border-outline-purple-2'
                        : 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-4 border-outline-blue-2'
                    "
                  >
                    {{ user.role === 'Administrator' ? __('Full System Access (Admin)') : __('CRM Staff Access (/dashboard)') }}
                  </span>
                </td>
              </tr>
              <tr v-if="!filteredStaffUsers.length">
                <td colspan="4" class="py-10 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
                  {{ __('No staff members found matching this filter.') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden border border-outline-gray-1 rounded-lg divide-y divide-outline-gray-1 overflow-hidden">
          <div
            v-for="user in filteredStaffUsers"
            :key="user.id"
            class="p-4 bg-surface-base hover:bg-surface-gray-1 transition-colors space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <Avatar size="md" :label="user.full_name" :image="user.avatar" />
                <div class="min-w-0">
                  <div class="font-semibold text-ink-gray-9 text-sm truncate">{{ user.full_name }}</div>
                  <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 truncate">{{ user.email }}</div>
                </div>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
                :class="
                  user.role === 'Administrator'
                    ? 'bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4 border-outline-purple-2'
                    : 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-4 border-outline-blue-2'
                "
              >
                {{ user.role }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-gray-1/60 text-xs">
              <span class="text-ink-gray-6 dark:text-ink-gray-5 font-medium">{{ __('Role Assignment:') }}</span>
              <select
                v-model="user.role"
                class="bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-md px-2.5 py-1 text-xs font-semibold text-ink-gray-9 focus:outline-none"
                @change="onRoleChanged(user)"
              >
                <option value="Staff">{{ __('Staff') }}</option>
                <option value="Administrator">{{ __('Administrator') }}</option>
              </select>
            </div>
          </div>

          <div v-if="!filteredStaffUsers.length" class="p-8 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
            {{ __('No staff members found matching this filter.') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Invite / Add Staff Modal (Archetype B Alignment) -->
    <Dialog v-model:open="showInvite" :size="'md'">
      <template #body>
        <div class="p-6 bg-surface-base text-ink-gray-9 space-y-4">
          <div class="flex items-center justify-between border-b border-outline-gray-1 pb-3">
            <h2 class="text-lg font-bold text-ink-gray-9 flex items-center gap-2">
              <span class="lucide-user-plus size-5 text-ink-gray-7 dark:text-ink-gray-5" />
              {{ __('Invite Staff Member') }}
            </h2>
            <span
              v-if="existingClientAccount"
              class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2 dark:border-amber-800/60"
            >
              {{ __('Client Account Found') }}
            </span>
          </div>

          <!-- Existing Client Upgrade Detection Banner -->
          <div
            v-if="existingClientAccount"
            class="p-3.5 bg-surface-amber-2 dark:bg-amber-950/50 border border-outline-amber-2 dark:border-amber-800/60 rounded-xl text-xs space-y-2 animate-fadeIn"
          >
            <div class="flex items-center gap-2 font-bold text-ink-amber-8 dark:text-amber-300">
              <span class="lucide-arrow-up-circle size-4 text-amber-600 dark:text-amber-400" />
              {{ __('Existing Client Account Detected') }}
            </div>
            <p class="text-ink-gray-8 dark:text-ink-gray-7 leading-relaxed">
              <strong>{{ existingClientAccount.full_name || existingClientAccount.company }}</strong> ({{ existingClientAccount.email }})
              is registered as a client organization. Adding them here will upgrade their account to an internal <strong>{{ __(newMember.role) }}</strong>, granting them full CRM access.
            </p>
            <div class="flex items-center gap-2 text-[11px] text-ink-amber-8 dark:text-amber-300 font-medium pt-0.5">
              <span class="lucide-check-circle size-3.5 text-amber-600 dark:text-amber-400" />
              {{ __('Their client portal record will be converted automatically.') }}
            </div>
          </div>

          <!-- Optional Quick-Select from Registered Clients -->
          <div v-if="clientAccountsList.length && !existingClientAccount" class="space-y-1">
            <label class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6">
              {{ __('Or select an existing client to upgrade:') }}
            </label>
            <select
              class="w-full bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-lg px-3 py-2 text-xs text-ink-gray-9 focus:outline-none focus:ring-1 focus:ring-outline-gray-3"
              @change="selectClientToUpgrade($event.target.value)"
            >
              <option value="">{{ __('— Choose a registered client —') }}</option>
              <option
                v-for="cl in clientAccountsList"
                :key="cl.id"
                :value="cl.email"
              >
                {{ cl.full_name }} ({{ cl.company ? cl.company + ' • ' : '' }}{{ cl.email }})
              </option>
            </select>
          </div>

          <div class="space-y-4">
            <FormControl
              v-model="newMember.email"
              :label="__('Email Address')"
              type="email"
              placeholder="jane@crestara.com"
              required
            />
            <FormControl
              v-model="newMember.full_name"
              :label="__('Full Name')"
              type="text"
              placeholder="Jane Doe"
              required
            />
            <FormControl
              v-model="newMember.role"
              :label="__('Assigned Role')"
              type="select"
              :options="['Staff', 'Administrator']"
              required
            />
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button variant="subtle" :label="__('Cancel')" @click="closeInviteModal" />
            <Button
              variant="solid"
              :iconLeft="existingClientAccount ? 'arrow-up-right' : 'user-plus'"
              :label="existingClientAccount ? __('Upgrade to {0}', [__(newMember.role)]) : __('Add Member')"
              :disabled="!newMember.email || !newMember.full_name"
              :class="existingClientAccount ? '!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700 !text-white dark:!bg-amber-500 dark:hover:!bg-amber-400 dark:!text-gray-950 font-bold shadow-sm' : ''"
              @click="addTeamMember"
            />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { isMobileView } from '@/composables/settings'
import { FormControl, Button, Avatar, Dialog } from 'frappe-ui'

const business = useBusinessStore()
const saving = ref(false)
const savedSuccess = ref(false)
const showInvite = ref(false)

// State for Invite / Upgrade Member Modal
const newMember = reactive({
  full_name: '',
  email: '',
  role: 'Staff',
})

// Business Settings Form with fallback defaults
const form = reactive({
  business_name: '',
  business_email: '',
  business_phone: '',
  business_address: '',
  tax_id: '',
  currency: 'USD',
  invoice_prefix: 'INV-2026-',
  next_invoice_number: 1045,
  default_payment_terms: 30,
  tax_rate: 8.5,
  late_fee_percentage: 2.0,
  notes_template: '',
  ...(business.settings || {}),
})

watch(
  () => business.settings,
  (val) => {
    if (val && typeof val === 'object') {
      Object.assign(form, val)
    }
  },
  { immediate: true, deep: true }
)

// Role filter for staff table: 'Staff' | 'All' | 'Administrator'
const selectedRoleFilter = ref('Staff')

const staffCount = computed(() => (business.users || []).filter((u) => u?.role === 'Staff').length)
const adminCount = computed(() => (business.users || []).filter((u) => u?.role === 'Administrator').length)
const totalInternalCount = computed(() => (business.users || []).filter((u) => u?.role === 'Staff' || u?.role === 'Administrator').length)

const filteredStaffUsers = computed(() => {
  const users = business.users || []
  if (selectedRoleFilter.value === 'Staff') {
    return users.filter((u) => u?.role === 'Staff')
  }
  if (selectedRoleFilter.value === 'Administrator') {
    return users.filter((u) => u?.role === 'Administrator')
  }
  return users.filter((u) => u?.role === 'Staff' || u?.role === 'Administrator')
})

const clientAccountsList = computed(() => {
  const list = []
  const users = business.users || []
  const customers = business.customers || []

  // Registered users with Customer role
  users
    .filter((u) => u?.role === 'Customer')
    .forEach((u) => {
      if (u?.email && !list.some((item) => item.email.toLowerCase() === u.email.toLowerCase())) {
        list.push({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email.split('@')[0],
          company: u.company || u.client_name || '',
        })
      }
    })

  // Registered customers
  customers.forEach((c) => {
    const email = c?.primary_email || c?.billing_email
    if (email && !list.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      const name = c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.company_name
      list.push({
        id: c.id,
        email: email,
        full_name: name || email.split('@')[0],
        company: c.company_name || '',
      })
    }
  })
  return list
})

const existingClientAccount = computed(() => {
  const email = newMember.email?.trim().toLowerCase()
  if (!email) return null
  return clientAccountsList.value.find((c) => c.email && c.email.toLowerCase() === email) || null
})

// Auto-populate full_name when an existing client account is recognized
watch(existingClientAccount, (client) => {
  if (client && !newMember.full_name) {
    newMember.full_name = client.full_name
  }
})

function selectClientToUpgrade(email) {
  if (!email) return
  const found = clientAccountsList.value.find((c) => c.email && c.email.toLowerCase() === email.toLowerCase())
  if (found) {
    newMember.email = found.email
    newMember.full_name = found.full_name
    newMember.role = 'Staff'
  }
}

onMounted(() => {
  business.fetchUsersFromSupabase()
})

function onRoleChanged(user) {
  business.updateUserRole(user.id, user.role)
}

async function addTeamMember() {
  if (!newMember.email || !newMember.full_name) return

  const emailClean = newMember.email.trim().toLowerCase()
  const matchedClient = existingClientAccount.value

  if (matchedClient) {
    // UPGRADE EXISTING CLIENT TO STAFF / ADMIN
    await business.updateUserRole(matchedClient.id, newMember.role)

    // Update role in business.users
    const idx = business.users.findIndex(
      (u) => u.id === matchedClient.id || u.email?.toLowerCase() === emailClean
    )
    if (idx !== -1) {
      business.users[idx].role = newMember.role
      business.users[idx].full_name = newMember.full_name.trim()
    } else {
      business.users.push({
        id: matchedClient.id,
        email: matchedClient.email,
        full_name: newMember.full_name.trim(),
        role: newMember.role,
        avatar: null,
      })
    }

    // Prune from local business.customers so they transition out of client lists
    business.customers = business.customers.filter((c) => c.id !== matchedClient.id)

    localStorage.setItem('crestara_users', JSON.stringify(business.users))
    localStorage.setItem('crestara_customers', JSON.stringify(business.customers))

    // Switch view to their role so admin immediately sees them in the staff list
    selectedRoleFilter.value = newMember.role
    savedSuccess.value = true
    setTimeout(() => {
      savedSuccess.value = false
    }, 3000)
  } else {
    // Standard new staff invite
    business.users.push({
      id: `usr-${Date.now()}`,
      email: newMember.email.trim(),
      full_name: newMember.full_name.trim(),
      role: newMember.role,
      avatar: null,
    })
    localStorage.setItem('crestara_users', JSON.stringify(business.users))
    selectedRoleFilter.value = newMember.role
  }

  closeInviteModal()
}

function closeInviteModal() {
  newMember.full_name = ''
  newMember.email = ''
  newMember.role = 'Staff'
  showInvite.value = false
}

function save() {
  saving.value = true
  setTimeout(() => {
    business.updateBusinessSettings(form)
    saving.value = false
    savedSuccess.value = true
    setTimeout(() => {
      savedSuccess.value = false
    }, 3000)
  }, 400)
}
</script>
