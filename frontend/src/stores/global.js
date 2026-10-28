import { defineStore } from 'pinia'
import { getCurrentInstance } from 'vue'

export const globalStore = defineStore('crm-global', () => {
  const app = getCurrentInstance()
  const { $dialog, $socket } = app.appContext.config.globalProperties

  let callMethod = () => {}

  function setMakeCall(value) {
    callMethod = value
  }

  function makeCall(number) {
    if (callMethod && typeof callMethod === 'function' && callMethod.length > 0) {
      callMethod(number)
    } else if (number && typeof window !== 'undefined') {
      window.open(`tel:${number}`, '_self')
    }
  }

  return {
    $dialog,
    $socket,
    makeCall,
    setMakeCall,
  }
})
