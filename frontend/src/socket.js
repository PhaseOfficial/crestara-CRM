import { io } from 'socket.io-client'
import { getCachedListResource, getCachedResource } from 'frappe-ui'

function createMockSocket() {
  return {
    on: () => {},
    off: () => {},
    emit: () => {},
    connected: false,
  }
}

export function initSocket() {
  let socketio_port = window.socketio_port
  if (!socketio_port) {
    return createMockSocket()
  }

  try {
    let host = window.location.hostname
    let siteName = window.site_name || 'crm'
    let port = window.location.port ? `:${socketio_port}` : ''
    let protocol = port ? 'http' : 'https'
    let url = `${protocol}://${host}${port}/${siteName}`

    let socket = io(url, {
      withCredentials: true,
      reconnectionAttempts: 3,
      autoConnect: false,
    })

    socket.on('refetch_resource', (data) => {
      if (data.cache_key) {
        let resource =
          getCachedResource(data.cache_key) ||
          getCachedListResource(data.cache_key)
        if (resource) {
          resource.reload()
        }
      }
    })

    return socket
  } catch {
    return createMockSocket()
  }
}
