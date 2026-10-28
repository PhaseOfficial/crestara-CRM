import './index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createDialog } from './utils/dialogs'
import { initSocket } from './socket'
import router from './router'
import translationPlugin from './translation'
import App from './App.vue'

import {
  FrappeUI,
  Button,
  Input,
  TextInput,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  setConfig,
  frappeRequest,
  FeatherIcon,
} from 'frappe-ui'

// injects the lucide SVG sprite into the DOM so the IconPicker and lucide Icons
// (used for view icons) can render from it
import { spritePlugin } from 'frappe-ui/icons'

// Fallback boot data for standalone mode
window.boot = window.boot || {
  timezone: {
    system: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    user: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  },
  state_options: {},
}
window.frappe_boot = window.frappe_boot || window.boot
window.site_name = window.site_name || 'crm'
window.csrf_token = window.csrf_token || ''
window.sysdefaults = window.sysdefaults || {
  date_format: 'yyyy-mm-dd',
  time_format: 'HH:mm:ss',
  currency: 'USD',
  currency_precision: 2,
  float_precision: 3,
  number_format: '#,###.##',
  rounding_method: "Banker's Rounding (legacy)",
}

let globalComponents = {
  Button,
  TextInput,
  Input,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  FeatherIcon,
}

// Standalone onboarding initial state & safe fallback interceptors
const defaultOnboardingSteps = [
  { name: 'setup_your_password', completed: false },
  { name: 'invite_your_team', completed: false },
  { name: 'create_first_task', completed: false },
]

try {
  const currentStatus = JSON.parse(localStorage.getItem('onboardingStatus') || '{}')
  const defaultUser = 'Administrator'
  if (!currentStatus[defaultUser] || !currentStatus[defaultUser].frappecrm_onboarding_status) {
    currentStatus[defaultUser] = {
      frappecrm_onboarding_status: defaultOnboardingSteps,
    }
    localStorage.setItem('onboardingStatus', JSON.stringify(currentStatus))
  }
} catch (e) {}

// Intercept window.fetch for standalone onboarding endpoints
const originalFetch = window.fetch
window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : input?.url || ''
  if (url.includes('frappe.onboarding.get_onboarding_status')) {
    const user = window.frappe?.session?.user || 'Administrator'
    const stored = JSON.parse(localStorage.getItem('onboardingStatus') || '{}')
    const userStatus = stored[user] || {
      frappecrm_onboarding_status: defaultOnboardingSteps,
    }
    return new Response(JSON.stringify({ message: userStatus }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (url.includes('frappe.onboarding.update_user_onboarding_status')) {
    if (init?.body) {
      try {
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
        if (body.steps && body.appName) {
          const user = window.frappe?.session?.user || 'Administrator'
          const stored = JSON.parse(localStorage.getItem('onboardingStatus') || '{}')
          stored[user] = stored[user] || {}
          stored[user][body.appName + '_onboarding_status'] =
            typeof body.steps === 'string' ? JSON.parse(body.steps) : body.steps
          localStorage.setItem('onboardingStatus', JSON.stringify(stored))
        }
      } catch (e) {}
    }
    return new Response(JSON.stringify({ message: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return originalFetch.apply(this, arguments)
}

const safeResourceFetcher = (options) => {
  const url = typeof options === 'string' ? options : options?.url || ''
  if (url.includes('frappe.onboarding.get_onboarding_status')) {
    const user = window.frappe?.session?.user || 'Administrator'
    const stored = JSON.parse(localStorage.getItem('onboardingStatus') || '{}')
    const userStatus = stored[user] || {
      frappecrm_onboarding_status: defaultOnboardingSteps,
    }
    return Promise.resolve(userStatus)
  }
  if (url.includes('frappe.onboarding.update_user_onboarding_status')) {
    return Promise.resolve('ok')
  }
  return frappeRequest(options)
}

// create a pinia instance
let pinia = createPinia()

let app = createApp(App)

setConfig('resourceFetcher', safeResourceFetcher)
app.use(FrappeUI, { socketio: false })
app.use(spritePlugin)
app.use(pinia)
app.use(router)
app.use(translationPlugin)
for (let key in globalComponents) {
  app.component(key, globalComponents[key])
}

const socket = initSocket()
app.config.globalProperties.$socket = socket
app.config.globalProperties.$dialog = createDialog
window.$dialog = createDialog

app.mount('#app')
