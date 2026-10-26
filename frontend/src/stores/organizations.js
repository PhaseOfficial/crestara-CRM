import { defineStore } from 'pinia'
import { createResource } from 'frappe-ui'
import { reactive } from 'vue'

export const organizationsStore = defineStore('crm-organizations', () => {
  let organizationsByName = reactive({})

  const organizations = createResource({
    url: 'crm.api.session.get_organizations',
    cache: 'organizations',
    initialData: [],
    auto: false,
    onError() {},
    transform(organizationsList) {
      for (let organization of organizationsList || []) {
        organizationsByName[organization.name] = organization
      }
      return organizationsList
    },
  })

  function getOrganization(name) {
    return organizationsByName[name]
  }

  return {
    organizations,
    getOrganization,
  }
})
