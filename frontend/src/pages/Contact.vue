<template>
  <LayoutHeader v-if="contact.doc">
    <template #left-header>
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
    </template>
    <template #right-header>
      <CustomActions
        v-if="contact._actions?.length"
        :actions="contact._actions"
      />
    </template>
  </LayoutHeader>
  <div v-if="contact.doc" ref="parentRef" class="flex h-full">
    <Resizer
      v-if="contact.doc"
      :parent="$refs.parentRef"
      class="flex h-full flex-col overflow-hidden border-r"
    >
      <div class="border-b">
        <FileUploader
          :validateFile="validateIsImageFile"
          @success="changeContactImage"
        >
          <template #default="{ openFileSelector, error }">
            <div class="flex flex-col items-start justify-start gap-4 p-5">
              <div class="flex gap-4 items-center">
                <div class="group relative h-15.5 w-15.5">
                  <Avatar
                    size="3xl"
                    class="h-15.5 w-15.5"
                    :label="contact.doc.full_name"
                    :image="contact.doc.image"
                  />
                  <component
                    :is="contact.doc.image ? Dropdown : 'div'"
                    v-bind="
                      contact.doc.image
                        ? {
                            options: [
                              {
                                icon: 'upload',
                                label: contact.doc.image
                                  ? __('Change Image')
                                  : __('Upload Image'),
                                onClick: openFileSelector,
                              },
                              {
                                icon: 'trash-2',
                                label: __('Remove Image'),
                                onClick: () => changeContactImage(''),
                              },
                            ],
                          }
                        : { onClick: openFileSelector }
                    "
                    class="!absolute bottom-0 left-0 right-0"
                  >
                    <div
                      class="z-1 absolute bottom-0 left-0 right-0 flex h-14 cursor-pointer items-center justify-center rounded-b-full bg-black bg-opacity-40 pt-5 opacity-0 duration-300 ease-in-out group-hover:opacity-100"
                      style="
                        -webkit-clip-path: inset(22px 0 0 0);
                        clip-path: inset(22px 0 0 0);
                      "
                    >
                      <CameraIcon class="h-6 w-6 cursor-pointer text-white" />
                    </div>
                  </component>
                </div>
                <div class="flex flex-col gap-2 truncate text-ink-gray-9">
                  <div class="truncate text-3xl-medium">
                    <span v-if="contact.doc.salutation">
                      {{ contact.doc.salutation + ' ' }}
                    </span>
                    <span>{{ contact.doc.full_name }}</span>
                  </div>
                  <div
                    v-if="contact.doc.company_name"
                    class="flex items-center gap-1.5 text-base text-ink-gray-8"
                  >
                    {{ contact.doc.company_name }}
                  </div>
                  <ErrorMessage :message="__(error)" />
                </div>
              </div>
              <div class="flex gap-1.5">
                <Button
                  v-if="callEnabled && contact.doc.mobile_no"
                  :label="__('Make Call')"
                  size="sm"
                  :iconLeft="PhoneIcon"
                  @click="callEnabled && makeCall(contact.doc.mobile_no)"
                />
                <Button
                  v-if="canDelete"
                  :label="__('Delete')"
                  theme="red"
                  size="sm"
                  iconLeft="trash-2"
                  @click="deleteContact()"
                />
              </div>
            </div>
          </template>
        </FileUploader>
      </div>
      <div
        v-if="sections.data"
        class="flex flex-1 flex-col justify-between overflow-hidden"
      >
        <SidePanelLayout
          :sections="parsedSections"
          doctype="Contact"
          :docname="contact.doc.name"
          @reload="sections.reload"
        />
      </div>
    </Resizer>

    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Pending Change Request Banner -->
      <div
        v-if="pendingContactRequest"
        class="mx-5 my-2 p-3 bg-surface-amber-2 border border-outline-amber-2 rounded-lg flex items-center justify-between text-xs text-ink-amber-7 shrink-0"
      >
        <div class="flex items-center gap-2">
          <span class="lucide-alert-circle size-4 text-ink-amber-7 shrink-0" />
          <span>
            <strong>{{ __('Pending Change Request:') }}</strong>
            {{ pendingContactRequest.reason }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            variant="solid"
            theme="green"
            :label="__('Approve Change')"
            @click="business.approveChangeRequest(pendingContactRequest.id, user)"
          />
          <Button
            size="sm"
            variant="subtle"
            :label="__('Review in Settings')"
            @click="router.push('/business-settings')"
          />
        </div>
      </div>

      <Tabs
        v-model="tabIndex"
        as="div"
        :tabs="tabs"
        class="flex flex-1 overflow-hidden flex-col [&_[role='tab']]:px-0 [&_[role='tab']]:shrink-0 [&_[role='tablist']]:px-5 [&_[role='tablist']::-webkit-scrollbar]:h-0 [&_[role='tablist']]:min-h-[45px] [&_[role='tablist']]:gap-7.5 [&_[role='tabpanel']:not([hidden])]:flex [&_[role='tabpanel']:not([hidden])]:grow"
      >
      <template #tab-item="{ tab, selected }">
        <button
          class="group flex items-center gap-2 border-b border-transparent py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:text-ink-gray-9"
          :class="{ 'text-ink-gray-9': selected }"
        >
          <component :is="tab.icon" v-if="tab.icon" class="h-5" />
          {{ __(tab.label) }}
          <Badge
            class="group-hover:bg-surface-gray-10"
            :class="[selected ? 'bg-surface-gray-10' : 'bg-gray-600']"
            variant="solid"
            theme="gray"
            size="sm"
          >
            {{ tab.count }}
          </Badge>
        </button>
      </template>
      <template #tab-panel="{ tab }">
        <DealsListView
          v-if="tab.label === 'Deals' && rows.length"
          class="mt-4"
          :rows="rows"
          :columns="columns"
          :options="{ selectable: false, showTooltip: false }"
        />
        <EmptyState v-if="tab.label === 'Deals' && !rows.length" :icon="tab.icon" name="Deals" />

        <!-- Invoicing & Billing Tab Panel -->
        <div v-if="tab.label === 'Invoicing & Billing'" class="flex flex-col flex-1 p-5 overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-ink-gray-9">{{ __('Customer Invoices') }}</h3>
              <p class="text-xs text-ink-gray-5">{{ __('Track billing history, outstanding balances and issue new invoices.') }}</p>
            </div>
            <Button
              variant="solid"
              :label="__('Create Invoice')"
              iconLeft="plus"
              @click="router.push(`/invoices/new?customer=${encodeURIComponent(contact.doc?.full_name || '')}&email=${encodeURIComponent(contact.doc?.email_id || '')}`)"
            />
          </div>

          <div v-if="contactInvoices.length" class="overflow-x-auto rounded-lg border border-outline-base bg-surface-base">
            <table class="w-full text-left text-sm text-ink-gray-8">
              <thead class="bg-surface-gray-2 text-xs uppercase tracking-wider text-ink-gray-5 border-b border-outline-base">
                <tr>
                  <th class="px-4 py-3">{{ __('Invoice #') }}</th>
                  <th class="px-4 py-3">{{ __('Issue Date') }}</th>
                  <th class="px-4 py-3">{{ __('Due Date') }}</th>
                  <th class="px-4 py-3">{{ __('Amount') }}</th>
                  <th class="px-4 py-3">{{ __('Balance') }}</th>
                  <th class="px-4 py-3">{{ __('Status') }}</th>
                  <th class="px-4 py-3 text-right">{{ __('Actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-base">
                <tr
                  v-for="inv in contactInvoices"
                  :key="inv.id"
                  class="hover:bg-surface-gray-1 cursor-pointer transition"
                  @click="router.push(`/invoices/${inv.id}`)"
                >
                  <td class="px-4 py-3 font-semibold text-ink-gray-9">{{ inv.invoice_number || inv.invoiceNumber }}</td>
                  <td class="px-4 py-3 text-ink-gray-6">{{ inv.issue_date || inv.issueDate }}</td>
                  <td class="px-4 py-3 text-ink-gray-6">{{ inv.due_date || inv.dueDate }}</td>
                  <td class="px-4 py-3 font-medium text-ink-gray-9">{{ business.formatCurrency(inv.total_amount ?? inv.total) }}</td>
                  <td class="px-4 py-3 font-medium" :class="(inv.balance_due ?? inv.balanceDue) > 0 ? 'text-ink-amber-6' : 'text-ink-green-6'">
                    {{ business.formatCurrency(inv.balance_due ?? inv.balanceDue) }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      :class="{
                        'bg-surface-green-2 text-ink-green-7': inv.status === 'Paid',
                        'bg-surface-blue-2 text-ink-blue-7': inv.status === 'Sent',
                        'bg-surface-red-2 text-ink-red-7': inv.status === 'Overdue',
                        'bg-surface-gray-3 text-ink-gray-7': inv.status === 'Draft',
                      }"
                    >
                      {{ inv.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      :label="__('View')"
                      @click.stop="router.push(`/invoices/${inv.id}`)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else
            class="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-outline-base rounded-xl bg-surface-gray-1"
          >
            <LucideReceiptText class="size-10 text-ink-gray-4 mb-2" />
            <h4 class="text-sm font-semibold text-ink-gray-8">{{ __('No invoices found for this contact') }}</h4>
            <p class="text-xs text-ink-gray-5 mt-1 max-w-sm">
              {{ __('Create an invoice directly linked to this contact to record sales and track payment schedules.') }}
            </p>
            <Button
              class="mt-4"
              variant="outline"
              :label="__('Generate First Invoice')"
              iconLeft="plus"
              @click="router.push(`/invoices/new?customer=${encodeURIComponent(contact.doc?.full_name || '')}&email=${encodeURIComponent(contact.doc?.email_id || '')}`)"
            />
          </div>
        </div>

        <!-- Change Requests Tab Panel -->
        <div v-if="tab.label === 'Change Requests'" class="flex flex-col flex-1 p-5 overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-semibold text-ink-gray-9">{{ __('Customer Account Change Requests') }}</h3>
              <p class="text-xs text-ink-gray-5">{{ __('Official detail and address modification requests submitted by this customer.') }}</p>
            </div>
          </div>

          <div v-if="contactChangeRequests.length" class="overflow-x-auto rounded-lg border border-outline-base bg-surface-base">
            <table class="w-full text-left text-sm text-ink-gray-8">
              <thead class="bg-surface-gray-2 text-xs uppercase tracking-wider text-ink-gray-5 border-b border-outline-base">
                <tr>
                  <th class="px-4 py-3">{{ __('Date') }}</th>
                  <th class="px-4 py-3">{{ __('Proposed Updates') }}</th>
                  <th class="px-4 py-3">{{ __('Reason') }}</th>
                  <th class="px-4 py-3">{{ __('Status') }}</th>
                  <th class="px-4 py-3 text-right">{{ __('Action') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-base">
                <tr v-for="req in contactChangeRequests" :key="req.id">
                  <td class="px-4 py-3 text-xs text-ink-gray-6">{{ req.requested_date }}</td>
                  <td class="px-4 py-3 text-xs">
                    <div v-if="req.requested_details.company !== req.current_details.company">
                      <strong>Company:</strong> {{ req.requested_details.company }}
                    </div>
                    <div v-if="req.requested_details.full_name !== req.current_details.full_name">
                      <strong>Contact:</strong> {{ req.requested_details.full_name }}
                    </div>
                    <div v-if="req.requested_details.address !== req.current_details.address">
                      <strong>Address:</strong> {{ req.requested_details.address }}
                    </div>
                    <div v-if="req.requested_details.phone !== req.current_details.phone">
                      <strong>Phone:</strong> {{ req.requested_details.phone }}
                    </div>
                  </td>
                  <td class="px-4 py-3 text-xs text-ink-gray-7">{{ req.reason }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="px-2 py-0.5 rounded text-xs font-semibold"
                      :class="{
                        'bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2': req.status === 'Pending',
                        'bg-surface-green-2 text-ink-green-7 border border-outline-green-2': req.status === 'Approved',
                        'bg-surface-red-2 text-ink-red-7 border border-outline-red-2': req.status === 'Rejected',
                      }"
                    >
                      {{ req.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div v-if="req.status === 'Pending'" class="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="solid"
                        theme="green"
                        :label="__('Approve')"
                        @click="business.approveChangeRequest(req.id, user)"
                      />
                    </div>
                    <span v-else class="text-xs text-ink-gray-4">{{ req.review_notes || 'Resolved' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-8 text-center text-xs text-ink-gray-4 border border-dashed rounded-lg">
            {{ __('No change requests submitted by this customer.') }}
          </div>
        </div>
      </template>
    </Tabs>
    </div>
  </div>
  <ErrorPage
    v-else-if="errorTitle"
    :errorTitle="errorTitle"
    :errorMessage="errorMessage"
  />
  <DeleteLinkedDocModal
    v-if="showDeleteLinkedDocModal"
    v-model="showDeleteLinkedDocModal"
    :doctype="'Contact'"
    :docname="contact.doc.name"
    name="Contacts"
  />
</template>

<script setup>
import ErrorPage from '@/components/ErrorPage.vue'
import Resizer from '@/components/Resizer.vue'
import Icon from '@/components/Icon.vue'
import SidePanelLayout from '@/components/SidePanelLayout.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import CameraIcon from '@/components/Icons/CameraIcon.vue'
import DealsIcon from '@/components/Icons/DealsIcon.vue'
import LucideReceiptText from '~icons/lucide/receipt-text'
import LucideFileText from '~icons/lucide/file-text'
import DealsListView from '@/components/ListViews/DealsListView.vue'
import CustomActions from '@/components/CustomActions.vue'
import { validateIsImageFile, setupCustomizations } from '@/utils'
import { useContactFields } from '@/composables/useContactFields'
import { timestampCell } from '@/composables/useTimelinePreferences'
import { getView } from '@/utils/view'
import { useDocument } from '@/data/document'
import { useBusinessStore } from '@/stores/business'
import { getSettings } from '@/stores/settings'
import { getMeta } from '@/stores/meta'
import { globalStore } from '@/stores/global.js'
import { usersStore } from '@/stores/users.js'
import { organizationsStore } from '@/stores/organizations.js'
import { statusesStore } from '@/stores/statuses'
import { callEnabled } from '@/composables/telephony'
import {
  Breadcrumbs,
  Avatar,
  FileUploader,
  Tabs,
  call,
  createResource,
  usePageMeta,
  Dropdown,
  toast,
} from 'frappe-ui'
import { useDoctypeModal } from '@/composables/doctypeModal'
import { useTelemetry } from 'frappe-ui/frappe'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/ListViews/EmptyState.vue'

const { brand } = getSettings()
const { makeCall, $dialog, $socket } = globalStore()

const { getUser } = usersStore()
const { getOrganization } = organizationsStore()
const { getDealStatus } = statusesStore()
const { doctypeMeta } = getMeta('Contact')
const { capture } = useTelemetry()

const props = defineProps({
  contactId: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()

const errorTitle = ref('')
const errorMessage = ref('')

const {
  document: contact,
  permissions,
  scripts,
  triggerOnRender,
} = useDocument('Contact', props.contactId)

const canDelete = computed(() => permissions.data?.permissions?.delete || false)

const transformField = useContactFields(contact)

onMounted(async () => {
  if (contact.doc) await triggerOnRender()
})

const breadcrumbs = computed(() => {
  let items = [{ label: __('Contacts'), route: { name: 'Contacts' } }]

  if (route.query.view || route.query.viewType) {
    let view = getView(route.query.view, route.query.viewType, 'Contact')
    if (view) {
      items.push({
        label: __(view.label),
        icon: view.icon,
        route: {
          name: 'Contacts',
          params: { viewType: route.query.viewType },
          query: { view: route.query.view },
        },
      })
    }
  }

  items.push({
    label: title.value,
    route: {
      name: 'Contact',
      params: { contactId: props.contactId },
      query: route.query,
    },
  })
  return items
})

const title = computed(() => {
  let t = doctypeMeta.value?.title_field || 'name'
  return contact.doc?.[t] || props.contactId
})

usePageMeta(() => {
  return {
    title: title.value,
    icon: brand.favicon,
  }
})
const showDeleteLinkedDocModal = ref(false)

async function deleteContact() {
  showDeleteLinkedDocModal.value = true
}

function changeContactImage(file) {
  contact.doc.image = file?.file_url || ''
  contact.save.submit(null, {
    onSuccess: () => {
      toast.success(__('Contact image updated'))
    },
  })
}

const business = useBusinessStore()

const contactInvoices = computed(() => {
  const name = contact.doc?.full_name || title.value || props.contactId
  const email = contact.doc?.email_id || ''
  return (business.invoices || []).filter((inv) => {
    const cName = inv.client_name || inv.customerName || ''
    const cEmail = inv.client_email || inv.customerEmail || ''
    const org = inv.organization_name || inv.organization || ''
    return (
      (name && cName.toLowerCase().includes(name.toLowerCase())) ||
      (email && cEmail.toLowerCase() === email.toLowerCase()) ||
      (contact.doc?.company_name && org.toLowerCase().includes(contact.doc.company_name.toLowerCase()))
    )
  })
})

const contactChangeRequests = computed(() => {
  const email = contact.doc?.email_id || ''
  const name = contact.doc?.full_name || ''
  return (business.changeRequests || []).filter(
    (r) =>
      (email && r.client_email?.toLowerCase() === email.toLowerCase()) ||
      (name && r.client_name?.toLowerCase().includes(name.toLowerCase())) ||
      (contact.doc?.company_name && r.organization?.toLowerCase().includes(contact.doc.company_name.toLowerCase()))
  )
})

const pendingContactRequest = computed(() => {
  return contactChangeRequests.value.find((r) => r.status === 'Pending')
})

const tabIndex = ref(0)
const tabs = [
  {
    label: 'Deals',
    icon: DealsIcon,
    count: computed(() => deals.data?.length || 0),
  },
  {
    label: 'Invoicing & Billing',
    icon: LucideReceiptText,
    count: computed(() => contactInvoices.value.length),
  },
  {
    label: 'Change Requests',
    icon: LucideFileText,
    count: computed(() => contactChangeRequests.value.length),
  },
]

const deals = createResource({
  url: 'crm.api.contact.get_linked_deals',
  cache: ['deals', props.contactId],
  params: { contact: props.contactId },
  auto: true,
})

const rows = computed(() => {
  if (!deals.data || deals.data == []) return []

  return deals.data.map((row) => getDealRowObject(row))
})

const sections = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections',
  cache: ['sidePanelSections', 'Contact'],
  params: { doctype: 'Contact' },
  auto: true,
})

const parsedSections = computed(() => {
  if (!sections.data) return []
  return sections.data.map((section) => ({
    ...section,
    columns: section.columns.map((column) => ({
      ...column,
      fields: column.fields.map((field) => {
        field.label = fieldLabelMap[field.fieldname] || field.label
        field.placeholder =
          fieldPlaceholderMap[field.fieldname] || field.placeholder
        return transformField(field, { showAddressModal })
      }),
    })),
  }))
})

const fieldLabelMap = {
  mobile_no: __('Mobile Number'),
  company_name: __('Organization'),
}

const fieldPlaceholderMap = {
  mobile_no: __('Add Mobile Number...'),
  company_name: __('Add Organization...'),
}

const { getFormattedCurrency } = getMeta('CRM Deal')

const columns = computed(() => dealColumns)

function getDealRowObject(deal) {
  return {
    name: deal.name,
    organization: {
      label: deal.organization,
      logo: getOrganization(deal.organization)?.organization_logo,
    },
    deal_value: getFormattedCurrency('deal_value', deal),
    status: {
      label: deal.status,
      color: getDealStatus(deal.status)?.color,
    },
    email: deal.email,
    mobile_no: deal.mobile_no,
    deal_owner: {
      label: deal.deal_owner && getUser(deal.deal_owner).full_name,
      ...(deal.deal_owner && getUser(deal.deal_owner)),
    },
    modified: timestampCell(deal.modified),
  }
}

const dealColumns = [
  {
    label: __('Organization'),
    key: 'organization',
    width: '11rem',
  },
  {
    label: __('Amount'),
    key: 'deal_value',
    align: 'right',
    width: '9rem',
  },
  {
    label: __('Status'),
    key: 'status',
    width: '10rem',
  },
  {
    label: __('Email'),
    key: 'email',
    width: '12rem',
  },
  {
    label: __('Mobile Number'),
    key: 'mobile_no',
    width: '11rem',
  },
  {
    label: __('Deal Owner'),
    key: 'deal_owner',
    width: '10rem',
  },
  {
    label: __('Last Modified'),
    key: 'modified',
    width: '8rem',
  },
]

const { showModal } = useDoctypeModal()

function showAddressModal(_address) {
  showModal({
    name: _address || null,
    doctype: 'Address',
    callbacks: {
      afterInsert: (d) => {
        capture('address_created')
        contact.doc.address = d.name
        contact.save.submit()
      },
    },
  })
}

// Setup custom actions from Form Scripts
watch(
  () => contact.doc,
  async (_doc) => {
    if (scripts.data?.length) {
      let s = await setupCustomizations(scripts.data, {
        doc: _doc,
        $dialog,
        $socket,
        router,
        toast,
        updateField: contact.setValue.submit,
        createToast: toast.create,
        deleteDoc: deleteContact,
        call,
      })
      contact._actions = s.actions || []
    }
  },
  { once: true },
)
</script>
