import { reactive, ref } from 'vue'

const settings = ref({
  brand_name: 'Crestara CRM',
  brand_logo: '/crestara_crest.png',
  favicon: '/favicon.png',
})

const brand = reactive({
  name: 'Crestara CRM',
  logo: '/crestara_crest.png',
  favicon: '/favicon.png',
})

const _settings = {
  data: settings.value,
  fetched: true,
  loading: false,
  fetch: async () => settings.value,
  reload: async () => settings.value,
}

export function getSettings() {
  function setupBrand() {
    brand.name = settings.value?.brand_name || 'Crestara CRM'
    brand.logo = settings.value?.brand_logo || '/crestara_crest.png'
    brand.favicon = settings.value?.favicon || '/favicon.png'
  }

  return {
    _settings,
    settings,
    brand,
    setupBrand,
  }
}
