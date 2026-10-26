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

// create a pinia instance
let pinia = createPinia()

let app = createApp(App)

setConfig('resourceFetcher', frappeRequest)
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
