<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <h1 class="text-2xl font-bold text-ink-gray-9">{{ __('My Account & Billing Information') }}</h1>
      <p class="text-sm text-ink-gray-5 mt-1">
        {{ __('Official organization records, verified contact profile, and change request status.') }}
      </p>
    </div>

    <!-- Official Information Policy Notice Banner -->
    <div class="bg-surface-blue-2 rounded-xl p-4 flex items-start gap-3">
      <span class="lucide-shield-check size-5 text-ink-blue-7 mt-0.5 shrink-0" />
      <div class="text-xs text-ink-blue-7 space-y-1">
        <p class="font-bold text-sm">
          {{ __('Verified Account Records') }}
        </p>
        <p class="leading-relaxed opacity-90">
          {{ __('For tax and compliance integrity, official organization details cannot be changed directly. To request updates to your company name, contact representative, or billing address, please click "Request Detail Change" below. Our administrative team will review and approve the request.') }}
        </p>
      </div>
    </div>

    <!-- Pending Change Request Alert (If customer has one under review) -->
    <div
      v-if="pendingCustomerRequest"
      class="bg-surface-amber-2 rounded-xl p-4 flex items-center justify-between text-ink-amber-7"
    >
      <div class="flex items-center gap-3">
        <span class="lucide-clock size-5 text-ink-amber-7 shrink-0" />
        <div>
          <h4 class="text-xs font-bold">{{ __('Pending Change Request Under Review') }}</h4>
          <p class="text-xs opacity-90 mt-0.5">
            {{ __('Requested on {0}: "{1}"', [pendingCustomerRequest.requested_date, pendingCustomerRequest.reason]) }}
          </p>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-amber-3 text-ink-amber-7">
        {{ __('Under Review') }}
      </span>
    </div>

    <!-- Official Account Details Card -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-gray-1 pb-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-building size-5 text-ink-gray-7" />
            {{ __('Company & Contact Information') }}
          </h2>
          <span class="text-xs text-ink-gray-4">{{ __('Official organization details, verified tax registration, and billing address') }}</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-gray-2 border border-outline-gray-1 text-xs">
            <span class="text-ink-gray-5">{{ __('Profile Verification:') }}</span>
            <span class="font-bold text-ink-blue-7">{{ business.profileCompletion.percentage }}%</span>
          </div>

          <Button
            variant="solid"
            iconLeft="file-edit"
            :label="__('Request Detail Change')"
            @click="openChangeModal"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <!-- Left: Legal Entity & Compliance -->
        <div class="space-y-4">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Company / Organization Name') }}</span>
            <span class="text-base font-bold text-ink-gray-9 mt-0.5 block">
              {{ customer.company_name || customer.legal_name || customer.organization || 'Client Account' }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Company Reg. Number (CRN)') }}</span>
              <span class="font-mono text-ink-gray-8 mt-0.5 block text-xs">
                {{ customer.company_registration_number || __('Not specified') }}
              </span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Tax ID / TIN') }}</span>
              <span class="font-mono text-ink-gray-8 mt-0.5 block text-xs">
                {{ customer.tin || customer.tax_id || __('Not specified') }}
              </span>
            </div>
          </div>

          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Primary Contact Representative') }}</span>
            <span class="font-medium text-ink-gray-9 mt-0.5 block">
              {{ customer.salutation ? customer.salutation + ' ' : '' }}{{ customer.first_name ? (customer.first_name + ' ' + (customer.last_name || '')) : (customer.full_name || customer.primary_email) }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Gender') }}</span>
              <span class="text-ink-gray-8 mt-0.5 block text-xs">
                {{ customer.gender || __('Not specified') }}
              </span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('National ID / Passport') }}</span>
              <span class="font-mono text-ink-gray-8 mt-0.5 block text-xs">
                {{ customer.national_id_number || __('Not specified') }}
              </span>
            </div>
          </div>

          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Registered Billing Email') }}</span>
            <span class="font-mono text-ink-gray-8 mt-0.5 block">{{ customer.billing_email || customer.primary_email || clientProfile.email }}</span>
          </div>
        </div>

        <!-- Right: Address & Commercial Defaults -->
        <div class="space-y-4">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Phone & Mobile Contact') }}</span>
            <span class="font-medium text-ink-gray-8 mt-0.5 block">{{ customer.phone || customer.mobile_no || 'Not specified' }}</span>
          </div>

          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Official Billing Address') }}</span>
            <p class="font-medium text-ink-gray-9 mt-0.5 whitespace-pre-line">
              {{ customer.billing_address_line1 || customer.address || 'Address on file with invoice records' }}
            </p>
            <p v-if="customer.billing_city || customer.billing_state_province || customer.city" class="text-xs text-ink-gray-6 mt-0.5">
              {{ customer.billing_city || customer.city }}, {{ customer.billing_state_province || customer.state }} {{ customer.billing_postal_code || customer.zip }}
            </p>
            <p v-if="customer.billing_country" class="text-xs text-ink-gray-5">
              {{ customer.billing_country }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Payment Terms') }}</span>
              <span class="text-xs font-semibold text-ink-gray-9 mt-0.5 block">{{ customer.default_payment_terms || 'Net 30' }}</span>
            </div>
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Account Currency') }}</span>
              <span class="text-xs font-semibold text-ink-gray-9 mt-0.5 block">{{ customer.default_currency || 'USD' }}</span>
            </div>
          </div>

          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-4 block">{{ __('Verification & Status') }}</span>
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-green-7 bg-surface-green-2 px-2.5 py-1 rounded-md border border-outline-green-2 mt-1">
              <span class="lucide-check-circle size-3.5" />
              {{ __('Verified & Active') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Requests History Table -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
      <div class="p-5 border-b border-outline-gray-1 flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-ink-gray-9">{{ __('Change Request History') }}</h3>
          <p class="text-xs text-ink-gray-5 mt-0.5">{{ __('Log of all profile change requests submitted for administrative approval') }}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-6 uppercase tracking-wider">
            <tr>
              <th class="py-3 px-6">{{ __('Date') }}</th>
              <th class="py-3 px-6">{{ __('Requested Updates') }}</th>
              <th class="py-3 px-6">{{ __('Reason') }}</th>
              <th class="py-3 px-6">{{ __('Status') }}</th>
              <th class="py-3 px-6">{{ __('Review Notes') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-gray-1">
            <tr
              v-for="req in customerRequests"
              :key="req.id"
              class="hover:bg-surface-gray-1 transition-colors"
            >
              <td class="py-4 px-6 text-xs text-ink-gray-6 whitespace-nowrap">{{ req.requested_date }}</td>
              <td class="py-4 px-6">
                <div class="space-y-1 text-xs">
                  <div v-if="req.requested_details.company !== req.current_details.company">
                    <span class="font-semibold text-ink-gray-5">{{ __('Company:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.company }}</span>
                  </div>
                  <div v-if="req.requested_details.company_registration_number !== req.current_details.company_registration_number">
                    <span class="font-semibold text-ink-gray-5">{{ __('Reg Number:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.company_registration_number }}</span>
                  </div>
                  <div v-if="req.requested_details.tax_id !== req.current_details.tax_id">
                    <span class="font-semibold text-ink-gray-5">{{ __('TIN / Tax ID:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.tax_id }}</span>
                  </div>
                  <div v-if="req.requested_details.full_name !== req.current_details.full_name">
                    <span class="font-semibold text-ink-gray-5">{{ __('Contact:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.full_name }}</span>
                  </div>
                  <div v-if="req.requested_details.national_id_number !== req.current_details.national_id_number">
                    <span class="font-semibold text-ink-gray-5">{{ __('National ID:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.national_id_number }}</span>
                  </div>
                  <div v-if="req.requested_details.gender !== req.current_details.gender">
                    <span class="font-semibold text-ink-gray-5">{{ __('Gender:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.gender }}</span>
                  </div>
                  <div v-if="req.requested_details.phone !== req.current_details.phone">
                    <span class="font-semibold text-ink-gray-5">{{ __('Phone:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.phone }}</span>
                  </div>
                  <div v-if="req.requested_details.address !== req.current_details.address">
                    <span class="font-semibold text-ink-gray-5">{{ __('Address:') }}</span>
                    <span class="text-ink-gray-9 ml-1 font-medium">{{ req.requested_details.address }}</span>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-xs text-ink-gray-7 max-w-xs">{{ req.reason }}</td>
              <td class="py-4 px-6 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  :class="{
                    'bg-surface-amber-2 text-ink-amber-7': req.status === 'Pending',
                    'bg-surface-green-2 text-ink-green-7': req.status === 'Approved',
                    'bg-surface-red-2 text-ink-red-7': req.status === 'Rejected',
                  }"
                >
                  {{ req.status === 'Pending' ? __('Pending Review') : __(req.status) }}
                </span>
              </td>
              <td class="py-4 px-6 text-xs text-ink-gray-5">
                <span v-if="req.reviewed_by" class="block font-medium text-ink-gray-7">
                  {{ req.reviewed_by }} ({{ req.reviewed_date }})
                </span>
                <span>{{ req.review_notes || '—' }}</span>
              </td>
            </tr>
            <tr v-if="!customerRequests.length">
              <td colspan="5" class="py-8 text-center text-xs text-ink-gray-4">
                {{ __('No change requests submitted yet.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Notification Preferences -->
    <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-6 shadow-sm space-y-4">
      <div>
        <h2 class="text-base font-bold text-ink-gray-9">{{ __('Direct Notification Preferences') }}</h2>
        <p class="text-xs text-ink-gray-5 mt-0.5">{{ __('Select which billing notices and updates are delivered to your email') }}</p>
      </div>

      <div class="space-y-3">
        <label class="flex items-center gap-3 text-sm text-ink-gray-8 cursor-pointer">
          <input v-model="notifications.email_invoices" type="checkbox" class="rounded border-outline-gray-2 text-blue-600 focus:ring-blue-500" />
          <span>{{ __('Receive electronic invoice copy when issued') }}</span>
        </label>
        <label class="flex items-center gap-3 text-sm text-ink-gray-8 cursor-pointer">
          <input v-model="notifications.email_reminders" type="checkbox" class="rounded border-outline-gray-2 text-blue-600 focus:ring-blue-500" />
          <span>{{ __('Receive upcoming payment due date notices') }}</span>
        </label>
        <label class="flex items-center gap-3 text-sm text-ink-gray-8 cursor-pointer">
          <input v-model="notifications.email_receipts" type="checkbox" class="rounded border-outline-gray-2 text-blue-600 focus:ring-blue-500" />
          <span>{{ __('Receive payment confirmation receipts') }}</span>
        </label>
      </div>
    </div>

    <!-- Request Change Modal -->
    <Dialog v-model:open="showChangeModal" :size="'lg'">
      <template #body>
        <div class="p-6 bg-surface-base text-ink-gray-9 space-y-5">
          <div class="border-b border-outline-gray-1 pb-3">
            <h2 class="text-lg font-bold text-ink-gray-9">
              {{ __('Submit Account Detail Change Request') }}
            </h2>
            <p class="text-xs text-ink-gray-5 mt-1">
              {{ __('Proposed changes will be routed to Crestara administrators for verification before applying.') }}
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="submitRequest">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormControl
                v-model="changeForm.company"
                :label="__('Company / Organization Legal Name')"
                type="text"
                required
              />
              <FormControl
                v-model="changeForm.company_registration_number"
                :label="__('Company Registration Number (CRN)')"
                placeholder="e.g. CRN-881920-CA"
                type="text"
              />
              <FormControl
                v-model="changeForm.tax_id"
                :label="__('Tax ID / TIN / VAT')"
                placeholder="e.g. US-882-99120"
                type="text"
              />
              <FormControl
                v-model="changeForm.full_name"
                :label="__('Contact Representative Name')"
                type="text"
                required
              />
              <FormControl
                v-model="changeForm.phone"
                :label="__('Phone Number')"
                type="text"
                required
              />
              <FormControl
                v-model="changeForm.national_id_number"
                :label="__('National ID / Passport Number')"
                type="text"
              />
              <FormControl
                v-model="changeForm.gender"
                :label="__('Gender')"
                type="select"
                :options="[
                  { label: 'Select Gender', value: '' },
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' },
                  { label: 'Non-Binary', value: 'Non-Binary' },
                  { label: 'Other', value: 'Other' },
                  { label: 'Prefer Not to Say', value: 'Prefer Not to Say' },
                ]"
              />
              <FormControl
                v-model="changeForm.date_of_birth"
                :label="__('Date of Birth')"
                type="date"
              />
            </div>

            <FormControl
              v-model="changeForm.address"
              :label="__('New Billing Street Address')"
              type="textarea"
              rows="2"
              required
            />

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormControl
                v-model="changeForm.city"
                :label="__('City')"
                type="text"
                required
              />
              <FormControl
                v-model="changeForm.state"
                :label="__('State / Province')"
                type="text"
                required
              />
              <FormControl
                v-model="changeForm.zip"
                :label="__('Postal Code')"
                type="text"
                required
              />
            </div>

            <FormControl
              v-model="changeForm.reason"
              :label="__('Reason for Change (Required by Administration)')"
              type="textarea"
              rows="2"
              placeholder="e.g. Relocating office headquarters, change in billing representative, updated corporate legal entity..."
              required
            />

            <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
              <Button variant="outline" :label="__('Cancel')" @click="showChangeModal = false" />
              <Button
                variant="solid"
                type="submit"
                :label="__('Submit for Approval')"
                :loading="submitting"
                :disabled="!changeForm.reason.trim()"
              />
            </div>
          </form>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import { FormControl, Button, Dialog } from 'frappe-ui'

const route = useRoute()
const business = useBusinessStore()
const showChangeModal = ref(false)
const submitting = ref(false)

const customer = computed(() => {
  return business.currentCustomerRecord || {}
})

const clientProfile = computed(() => {
  return business.currentUser || {}
})

const customerRequests = computed(() => {
  const email = clientProfile.value.email?.toLowerCase()
  return business.changeRequests.filter(
    (r) => (email && r.client_email?.toLowerCase() === email) || r.client_id === clientProfile.value.id || r.customer_id === clientProfile.value.id
  )
})

const pendingCustomerRequest = computed(() => {
  return customerRequests.value.find((r) => r.status === 'Pending')
})

const notifications = reactive({
  email_invoices: true,
  email_reminders: true,
  email_receipts: true,
})

const changeForm = reactive({
  company: '',
  company_registration_number: '',
  full_name: '',
  phone: '',
  national_id_number: '',
  gender: '',
  date_of_birth: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  tax_id: '',
  reason: '',
})

function openChangeModal() {
  const c = customer.value || {}
  const u = clientProfile.value || {}

  changeForm.company = c.company_name || u.organization || u.company || ''
  changeForm.company_registration_number = c.company_registration_number || ''
  changeForm.full_name = c.first_name ? (c.first_name + ' ' + (c.last_name || '')) : (u.full_name || '')
  changeForm.phone = c.phone || u.phone || '+1 (555) 789-0123'
  changeForm.national_id_number = c.national_id_number || ''
  changeForm.gender = c.gender || ''
  changeForm.date_of_birth = c.date_of_birth || ''
  changeForm.address = c.billing_address_line1 || u.address || '450 Mission Street, Floor 14'
  changeForm.city = c.billing_city || u.city || 'San Francisco'
  changeForm.state = c.billing_state_province || u.state || 'CA'
  changeForm.zip = c.billing_postal_code || u.zip || '94105'
  changeForm.tax_id = c.tin || c.tax_id || u.tax_id || 'US-882-99120'
  changeForm.reason = ''
  showChangeModal.value = true
}

async function submitRequest() {
  if (!changeForm.reason.trim()) return

  submitting.value = true
  await business.submitChangeRequest({
    requested_details: {
      company: changeForm.company,
      company_registration_number: changeForm.company_registration_number,
      full_name: changeForm.full_name,
      phone: changeForm.phone,
      national_id_number: changeForm.national_id_number,
      gender: changeForm.gender,
      date_of_birth: changeForm.date_of_birth,
      address: changeForm.address,
      city: changeForm.city,
      state: changeForm.state,
      zip: changeForm.zip,
      tax_id: changeForm.tax_id,
    },
    reason: changeForm.reason.trim(),
  })
  submitting.value = false
  showChangeModal.value = false
}

onMounted(() => {
  if (route.query.request_change === 'true') {
    openChangeModal()
  }
})
</script>
