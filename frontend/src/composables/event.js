import { usersStore } from '@/stores/users'
import dayjs from 'dayjs'
import { computed, ref, reactive, onMounted } from 'vue'
import {
  allTimeSlots,
  formatDuration,
  buildEndTimeOptions,
  computeAutoToTime,
  validateTimeRange,
  normalizeParticipants,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/utils/calendarEndpoints'

export const showEventModal = ref(false)
export const activeEvent = ref(null)

export {
  allTimeSlots,
  formatDuration,
  buildEndTimeOptions,
  computeAutoToTime,
  validateTimeRange,
  normalizeParticipants,
}

export function useEvent({
  doctype,
  docname,
  filters = null,
  participants = true,
  notifications = true,
} = {}) {
  const { getUser } = usersStore()
  const rawEvents = ref([])
  const isLoading = ref(false)

  async function loadEvents() {
    isLoading.value = true
    try {
      const params = {}
      if (doctype) params.referenceDoctype = doctype
      if (docname) params.referenceDocname = docname
      const fetched = await fetchCalendarEvents(params)
      rawEvents.value = fetched
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    loadEvents()
  })

  const events = computed(() => {
    return rawEvents.value.map((ev) => {
      const ownerLabel = typeof ev.owner === 'object'
        ? ev.owner?.label || ev.owner?.value
        : ev.owner ? getUser(ev.owner).full_name : 'Staff'
      const ownerImage = typeof ev.owner === 'object'
        ? ev.owner?.image
        : ev.owner ? getUser(ev.owner).user_image : ''

      const formattedParticipants = (ev.event_participants || []).map((p) => ({
        label: p.full_name || p.label || p.email,
        image: '',
        name: p.email,
        email: p.email,
        attending: p.attending || 'Awaiting',
      }))

      return {
        ...ev,
        name: ev.id,
        subject: ev.title,
        starts_on: `${ev.fromDate} ${ev.fromTime || '09:00'}`,
        ends_on: `${ev.toDate || ev.fromDate} ${ev.toTime || '10:00'}`,
        all_day: ev.isFullDay,
        creation: ev.created_at || new Date().toISOString(),
        owner: {
          label: ownerLabel,
          image: ownerImage,
          name: typeof ev.owner === 'object' ? ev.owner?.value : ev.owner,
        },
        participants: formattedParticipants,
        event_participants: ev.event_participants || [],
        notifications: ev.notifications || [],
      }
    })
  })

  // Frappe-compatible resource bridge for legacy callers
  const eventsResource = reactive({
    data: events,
    loading: isLoading,
    reload: async () => {
      await loadEvents()
    },
    insert: {
      loading: false,
      submit: async (payload, { onSuccess, onError } = {}) => {
        try {
          eventsResource.insert.loading = true
          const normalizedPayload = {
            title: payload.subject || payload.title,
            description: payload.description,
            fromDate: payload.fromDate || payload.starts_on?.split(' ')[0],
            toDate: payload.toDate || payload.ends_on?.split(' ')[0] || payload.fromDate,
            fromTime: payload.fromTime || payload.starts_on?.split(' ')[1] || '09:00',
            toTime: payload.toTime || payload.ends_on?.split(' ')[1] || '10:00',
            isFullDay: Boolean(payload.all_day),
            eventType: payload.event_type || 'Public',
            location: payload.location,
            color: payload.color,
            referenceDoctype: payload.reference_doctype || doctype,
            referenceDocname: payload.reference_docname || docname,
            event_participants: payload.event_participants || [],
            notifications: payload.notifications || [],
          }
          const created = await createCalendarEvent(normalizedPayload, {
            sendInvites: payload.sendInvites !== false,
          })
          await loadEvents()
          onSuccess?.(created)
          return created
        } catch (err) {
          onError?.(err)
          throw err
        } finally {
          eventsResource.insert.loading = false
        }
      },
    },
    setValue: {
      loading: false,
      submit: async (payload, { onSuccess, onError } = {}) => {
        try {
          eventsResource.setValue.loading = true
          const eventId = payload.name || payload.id
          const normalizedPayload = {
            title: payload.subject || payload.title,
            description: payload.description,
            fromDate: payload.fromDate || payload.starts_on?.split(' ')[0],
            toDate: payload.toDate || payload.ends_on?.split(' ')[0],
            fromTime: payload.fromTime || payload.starts_on?.split(' ')[1],
            toTime: payload.toTime || payload.ends_on?.split(' ')[1],
            isFullDay: Boolean(payload.all_day),
            eventType: payload.event_type,
            location: payload.location,
            color: payload.color,
            referenceDoctype: payload.reference_doctype || payload.referenceDoctype,
            referenceDocname: payload.reference_docname || payload.referenceDocname,
            event_participants: payload.event_participants,
            notifications: payload.notifications,
          }
          const updated = await updateCalendarEvent(eventId, normalizedPayload, {
            sendInvites: payload.sendInvites === true,
          })
          await loadEvents()
          onSuccess?.(updated)
          return updated
        } catch (err) {
          onError?.(err)
          throw err
        } finally {
          eventsResource.setValue.loading = false
        }
      },
    },
    delete: {
      loading: false,
      submit: async (id, { onSuccess, onError } = {}) => {
        try {
          eventsResource.delete.loading = true
          await deleteCalendarEvent(id, { sendCancellation: true })
          await loadEvents()
          onSuccess?.()
        } catch (err) {
          onError?.(err)
          throw err
        } finally {
          eventsResource.delete.loading = false
        }
      },
    },
  })

  const eventParticipantsResource = reactive({
    data: [],
    loading: false,
    update: () => {},
  })

  const eventNotificationsResource = reactive({
    data: [],
    loading: false,
    update: () => {},
  })

  const startEndTime = (
    startTime,
    endTime,
    isFullDay = false,
    format = 'h:mm a',
  ) => {
    const start = dayjs(startTime)
    const end = dayjs(endTime)

    if (isFullDay) return 'All Day'

    return `${start.format(format)} - ${end.format(format)}`
  }

  const startDate = (startTime, format = 'ddd, D MMM YYYY') => {
    const start = dayjs(startTime)
    return start.format(format)
  }

  return {
    eventsResource,
    eventParticipantsResource,
    eventNotificationsResource,
    events,
    startEndTime,
    startDate,
    reload: loadEvents,
  }
}

export function parseEventDoc(doc) {
  if (!doc) return {}
  const { getUser } = usersStore()

  const start = doc.starts_on ? dayjs(doc.starts_on) : dayjs()
  const end = doc.ends_on ? dayjs(doc.ends_on) : start

  return {
    id: doc.id || doc.name,
    title: doc.subject || doc.title,
    description: doc.description || '',
    status: doc.status || 'Open',
    fromDate: doc.fromDate || start.format('YYYY-MM-DD'),
    toDate: doc.toDate || end.format('YYYY-MM-DD'),
    fromTime: doc.fromTime || start.format('HH:mm'),
    toTime: doc.toTime || end.format('HH:mm'),
    isFullDay: Boolean(doc.all_day || doc.isFullDay),
    eventType: doc.event_type || doc.eventType || 'Public',
    location: doc.location || '',
    color: doc.color || '#30A66D',
    attending: doc.attending || 'Yes',
    referenceDoctype: doc.reference_doctype || doc.referenceDoctype || '',
    referenceDocname: doc.reference_docname || doc.referenceDocname || '',
    event_participants: doc.event_participants || [],
    notifications: doc.notifications || [],
    owner: doc.owner
      ? typeof doc.owner === 'object'
        ? doc.owner
        : {
            label: getUser(doc.owner).full_name,
            image: getUser(doc.owner).user_image,
            value: doc.owner,
          }
      : null,
  }
}
