import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import { parseColor, isTranslatable } from '@/utils'
import { defineStore } from 'pinia'
import { createListResource } from 'frappe-ui'
import { reactive, h } from 'vue'

const defaultLeadStatuses = [
  { name: 'New', color: 'gray', position: 1, type: 'Open' },
  { name: 'Contacted', color: 'blue', position: 2, type: 'Open' },
  { name: 'Qualified', color: 'green', position: 3, type: 'Open' },
  { name: 'Lost', color: 'red', position: 4, type: 'Closed' },
]

const defaultDealStatuses = [
  { name: 'Qualification', color: 'gray', position: 1, type: 'Open' },
  { name: 'Demo', color: 'blue', position: 2, type: 'Open' },
  { name: 'Proposal', color: 'purple', position: 3, type: 'Open' },
  { name: 'Won', color: 'green', position: 4, type: 'Won' },
  { name: 'Lost', color: 'red', position: 5, type: 'Lost' },
]

const defaultCommStatuses = [{ name: 'Open' }, { name: 'Replied' }, { name: 'Closed' }]

export const statusesStore = defineStore('crm-statuses', () => {
  let leadStatusesByName = reactive({})
  let dealStatusesByName = reactive({})
  let communicationStatusesByName = reactive({})

  for (let s of defaultLeadStatuses) {
    leadStatusesByName[s.name] = { ...s, color: parseColor(s.color) }
  }
  for (let s of defaultDealStatuses) {
    dealStatusesByName[s.name] = { ...s, color: parseColor(s.color) }
  }
  for (let s of defaultCommStatuses) {
    communicationStatusesByName[s.name] = s
  }

  const leadStatuses = createListResource({
    doctype: 'CRM Lead Status',
    fields: ['name', 'color', 'position', 'type'],
    orderBy: 'position asc',
    cache: 'lead-statuses',
    initialData: defaultLeadStatuses,
    auto: false,
    transform(statuses) {
      for (let status of statuses || []) {
        status.color = parseColor(status.color)
        leadStatusesByName[status.name] = status
      }
      return statuses
    },
  })

  const dealStatuses = createListResource({
    doctype: 'CRM Deal Status',
    fields: ['name', 'color', 'position', 'type'],
    orderBy: 'position asc',
    cache: 'deal-statuses',
    initialData: defaultDealStatuses,
    auto: false,
    transform(statuses) {
      for (let status of statuses || []) {
        status.color = parseColor(status.color)
        dealStatusesByName[status.name] = status
      }
      return statuses
    },
  })

  const communicationStatuses = createListResource({
    doctype: 'CRM Communication Status',
    fields: ['name'],
    cache: 'communication-statuses',
    initialData: defaultCommStatuses,
    auto: false,
    transform(statuses) {
      for (let status of statuses || []) {
        communicationStatusesByName[status.name] = status
      }
      return statuses
    },
  })

  function getLeadStatus(name) {
    if (!name) {
      name = leadStatuses.data?.[0]?.name || 'New'
    }
    return leadStatusesByName[name] || { name, color: 'gray' }
  }

  function getDealStatus(name) {
    if (!name) {
      name = dealStatuses.data?.[0]?.name || 'Qualification'
    }
    return dealStatusesByName[name] || { name, color: 'gray' }
  }

  function getCommunicationStatus(name) {
    if (!name) {
      name = communicationStatuses.data?.[0]?.name || 'Open'
    }
    return communicationStatusesByName[name] || { name }
  }

  function statusOptions(doctype, statuses = [], triggerStatusChange = null) {
    let statusesByName =
      doctype == 'deal' ? dealStatusesByName : leadStatusesByName

    if (statuses?.length) {
      statusesByName = statuses.reduce((acc, status) => {
        acc[status] = statusesByName[status]
        return acc
      }, {})
    }

    let translatable = isTranslatable(
      doctype == 'deal' ? 'CRM Deal Status' : 'CRM Lead Status',
    )

    let options = []
    for (const status in statusesByName) {
      options.push({
        label: translatable
          ? __(statusesByName[status]?.name)
          : statusesByName[status]?.name,
        value: statusesByName[status]?.name,
        icon: () => h(IndicatorIcon, { class: statusesByName[status]?.color }),
        onClick: async () => {
          await triggerStatusChange?.(statusesByName[status]?.name)
        },
      })
    }
    return options
  }

  return {
    leadStatuses,
    dealStatuses,
    communicationStatuses,
    getLeadStatus,
    getDealStatus,
    getCommunicationStatus,
    statusOptions,
  }
})
