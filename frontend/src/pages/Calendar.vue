<template>
  <LayoutHeader>
    <template #left-header>
      <ViewBreadcrumbs routeName="Calendar" />
    </template>
    <template #right-header>
      <ShortcutTooltip :label="__('Create Event')" combo="Mod+E">
        <Button
          variant="solid"
          :disabled="isCreateDisabled"
          @click="newEvent"
        >
          <template #prefix>
            <span class="lucide-plus h-4" aria-hidden="true" />
          </template>
          <span class="hidden sm:inline">{{ __('Create') }}</span>
        </Button>
      </ShortcutTooltip>
    </template>
  </LayoutHeader>
  <div class="flex flex-col md:flex-row flex-1 h-[calc(100vh-7.5rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden w-full relative">
    <Calendar
      ref="calendar"
      class="flex-1 overflow-hidden"
      :config="{
        defaultMode: defaultMode,
        isEditMode: true,
        eventIcons: {},
        allowCustomClickEvents: true,
        enableShortcuts: false,
        noBorder: true,
      }"
      :events="allCalendarEvents"
      :onClick="showDetails"
      :onDblClick="editDetails"
      :onCellClick="newEvent"
      @create="(event) => createEvent(event)"
      @update="(event) => updateEvent(event, true)"
      @delete="(eventID) => deleteEvent(eventID)"
      @rangeChange="handleRangeChange"
    >
      <template
        #header="{
          currentMonthYear,
          activeView,
          selectedMonthDate,
          decrement,
          increment,
          updateActiveView,
          onMonthYearChange,
          setCalendarDate,
        }"
      >
        <div class="px-3 sm:px-5 py-2.5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-outline-gray-1 bg-surface-base">
          <!-- Top Row on Mobile / Left Side on Desktop: Month/Year & Date Navigation -->
          <div class="flex items-center justify-between sm:justify-start gap-2">
            <DatePicker
              :modelValue="selectedMonthDate"
              :clearable="false"
              @update:modelValue="(val) => onMonthYearChange(val)"
            >
              <template #trigger="{ togglePopover }">
                <Button
                  variant="ghost"
                  class="text-base sm:text-lg-medium text-ink-gray-9 font-bold sm:font-semibold shrink-0"
                  :label="currentMonthYear"
                  iconRight="lucide-chevron-down"
                  @click="togglePopover"
                />
              </template>
            </DatePicker>

            <!-- Navigation Controls (< Today >) -->
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                icon="lucide-chevron-left"
                class="size-7 sm:size-8 text-ink-gray-7"
                :tooltip="__('Previous')"
                @click="decrement"
              />
              <Button
                :label="__('Today')"
                variant="outline"
                size="sm"
                class="text-xs font-semibold px-2 sm:px-2.5 h-7 sm:h-8"
                @click="setCalendarDate()"
              />
              <Button
                variant="ghost"
                icon="lucide-chevron-right"
                class="size-7 sm:size-8 text-ink-gray-7"
                :tooltip="__('Next')"
                @click="increment"
              />
            </div>
          </div>

          <!-- Bottom Row on Mobile / Right Side on Desktop: View Selector & Staff Filter -->
          <div class="flex items-center justify-between sm:justify-end gap-2">
            <!-- View Segmented Tabs -->
            <div class="inline-flex rounded-lg p-0.5 bg-surface-gray-2 dark:bg-surface-gray-3 border border-outline-gray-2 text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
              <button
                v-for="v in [
                  { label: __('Day'), value: 'Day' },
                  { label: __('Week'), value: 'Week' },
                  { label: __('Month'), value: 'Month' },
                ]"
                :key="v.value"
                type="button"
                class="flex-1 sm:flex-initial px-3 py-1 rounded-md transition-all font-semibold text-center"
                :class="
                  activeView === v.value
                    ? 'bg-surface-base text-ink-gray-9 shadow-xs dark:bg-surface-gray-1'
                    : 'text-ink-gray-6 hover:text-ink-gray-9'
                "
                @click="updateActiveView(v.value)"
              >
                {{ v.label }}
              </button>
            </div>

            <!-- Staff User Selector Dropdown (Hidden on mobile for clean calendar view) -->
            <Dropdown
              :options="staffOptions"
              class="hidden sm:inline-flex"
              :button="{
                label: selectedStaffLabel,
                class: 'form-control text-sm font-medium !w-44 justify-start [&>span]:mr-auto',
                variant: 'outline',
                iconRight: 'lucide-chevron-down',
              }"
            >
              <template #button-prefix>
                <UserAvatar
                  v-if="currentUser"
                  class="mr-2 !h-4 !w-4"
                  :user="currentUser"
                />
                <span
                  v-else
                  class="lucide-users mr-2 size-4 text-ink-gray-5"
                />
              </template>
            </Dropdown>
          </div>
        </div>
      </template>
    </Calendar>

    <!-- Event Panel Container -->
    <div
      class="overflow-hidden flex-none transition-all duration-300 ease-in-out flex flex-col"
      :class="
        showEventPanel
          ? 'fixed inset-0 z-50 w-full h-full md:relative md:inset-auto md:w-[352px] md:h-full border-l bg-surface-base shadow-2xl md:shadow-none'
          : 'w-0 border-l-0 pointer-events-none'
      "
    >
      <CalendarEventPanel
        v-if="showEventPanel"
        ref="eventPanel"
        v-model="showEventPanel"
        v-model:event="event"
        :mode="mode"
        @new="newEvent"
        @save="saveEvent"
        @edit="editDetails"
        @delete="deleteEvent"
        @duplicate="duplicateEvent"
        @details="showDetails"
        @close="close"
        @sync="syncEvent"
      />
    </div>
  </div>
</template>

<script setup>
import CalendarEventPanel from '@/components/Calendar/CalendarEventPanel.vue'
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import ShortcutTooltip from '@/components/ShortcutTooltip.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { sessionStore } from '@/stores/session'
import { usersStore } from '@/stores/users'
import { globalStore } from '@/stores/global'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import {
  Calendar,
  DatePicker,
  Dropdown,
  FormControl,
  CalendarActiveEvent as activeEvent,
  toast,
} from 'frappe-ui'
import dayjs from 'dayjs'
import { onMounted, ref, computed, provide, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'

const { user } = sessionStore()
const { $dialog } = globalStore()
const { getUser } = usersStore()
const route = useRoute()
const router = useRouter()
const business = useBusinessStore()

const modeMap = {
  Daily: 'Day',
  Weekly: 'Week',
  Monthly: 'Month',
}

const defaultMode = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return 'Day'
  }
  return modeMap[business.settings.default_calendar_view] || 'Week'
})

const calendar = ref(null)
const activeRangeKey = ref('')
const currentUser = ref(user)
const currentRange = ref(null)
const isLoading = ref(false)

// Staff Selector Options
const selectedStaffLabel = computed(() => {
  if (!currentUser.value || currentUser.value === 'all') return __('All Staff')
  const u = (business.users || []).find(
    (usr) => usr.email === currentUser.value || usr.id === currentUser.value,
  )
  return u?.full_name || getUser(currentUser.value).full_name || currentUser.value
})

const staffOptions = computed(() => [
  {
    group: 'Staff Filter',
    hideLabel: true,
    items: [
      {
        label: __('All Staff'),
        onClick: () => updateUser(null),
      },
      ...(business.users || []).map((u) => ({
        label: u.full_name || u.email,
        onClick: () => updateUser(u.email || u.id),
      })),
    ],
  },
])

async function updateUser(u) {
  currentUser.value = u
  await reloadEvents()
}

async function reloadEvents() {
  isLoading.value = true
  try {
    const params = {
      user: currentUser.value,
    }
    if (currentRange.value?.startDate && currentRange.value?.endDate) {
      params.startDate = currentRange.value.startDate
      params.endDate = currentRange.value.endDate
    }
    await business.fetchEventsFromSupabase(params)
  } finally {
    isLoading.value = false
  }
}

// Injected reactive events handle for child components
const eventsBridge = reactive({
  data: computed(() => allCalendarEvents.value),
  loading: isLoading,
})
provide('events', eventsBridge)

// Commercial Invoices due date projection
const businessEvents = computed(() => {
  return (business.invoices || []).map((inv) => {
    const num = inv.invoice_number || inv.invoiceNumber || inv.id
    const client = inv.client_name || inv.customerName || 'Client'
    const due = inv.due_date || inv.dueDate || new Date().toISOString().split('T')[0]
    const bal = inv.balance_due ?? inv.balanceDue ?? 0
    const tot = inv.total_amount ?? inv.total ?? 0
    return {
      id: `inv-${inv.id}`,
      title: `Invoice Due: ${num} (${client})`,
      description: `Outstanding balance: ${business.formatCurrency(bal)}. Total: ${business.formatCurrency(tot)}`,
      status: inv.status,
      fromDate: due,
      toDate: due,
      fromTime: '09:00',
      toTime: '10:00',
      isFullDay: true,
      eventType: 'Billing',
      color:
        inv.status === 'Paid'
          ? '#10b981'
          : inv.status === 'Overdue'
            ? '#ef4444'
            : '#f59e0b',
      isInvoice: true,
      invoiceId: inv.id,
    }
  })
})

const allCalendarEvents = computed(() => {
  const crmEvents = (business.events || []).map((ev) => {
    if (ev.status === 'Cancelled') {
      return {
        ...ev,
        title: ev.title?.startsWith('[Cancelled]') ? ev.title : `[Cancelled] ${ev.title}`,
        color: '#9ca3af',
      }
    }
    return ev
  })
  return [...crmEvents, ...businessEvents.value]
})

const eventPanel = ref(null)
const showEventPanel = ref(false)
const event = ref({})
const mode = ref('')

const isCreateDisabled = computed(() =>
  ['edit', 'new', 'duplicate'].includes(mode.value),
)

// Temp event helpers
const TEMP_EVENT_IDS = new Set(['new-event', 'duplicate-event'])
const isTempEvent = (id) => TEMP_EVENT_IDS.has(id)
function removeTempEvents() {
  if (!Array.isArray(business.events)) return
  business.events = business.events.filter((ev) => !isTempEvent(ev.id))
}

function openEvent(e, nextMode, reloadEvent = false) {
  const _e = e?.calendarEvent || e
  if (!_e?.id || isTempEvent(_e.id)) return
  if (_e?.isInvoice || _e?.id?.startsWith('inv-')) {
    const invId = _e.invoiceId || _e.id.replace('inv-', '')
    router.push(`/invoices/${invId}`)
    return
  }
  removeTempEvents()
  showEventPanel.value = true
  event.value = { id: _e.id, reloadEvent }
  activeEvent.value = _e.id
  mode.value = nextMode
}

function saveEvent(_event) {
  if (!_event?.id || isTempEvent(_event.id)) return createEvent(_event)
  updateEvent(_event)
}

async function createEvent(_event) {
  if (!_event?.title) return
  isLoading.value = true
  try {
    const payload = {
      ..._event,
      owner: currentUser.value || user,
    }
    const created = await business.createEvent(payload, {
      sendInvites: _event.sendInvites !== false,
    })
    toast.success(__('Event created successfully'))
    showDetails({ id: created.id })
    await reloadEvents()
  } catch (err) {
    toast.error(err.message || __('Failed creating event'))
    console.error('Failed creating event', err)
  } finally {
    isLoading.value = false
  }
}

async function updateEvent(_event, afterDrag = false) {
  if (!_event.id) return

  _event.fromTime = dayjs(`${_event.fromDate} ${_event.fromTime}`).format('HH:mm')
  _event.toTime = dayjs(`${_event.toDate} ${_event.toTime}`).format('HH:mm')

  if (
    ['duplicate', 'new'].includes(mode.value) &&
    !['duplicate-event', 'new-event'].includes(_event.id) &&
    afterDrag
  ) {
    event.value = { id: _event.id }
    activeEvent.value = _event.id
    mode.value = 'details'
  }

  if (mode.value === 'edit' && afterDrag) {
    eventPanel.value?.updateEvent?.({
      fromDate: _event.fromDate,
      toDate: _event.toDate,
      fromTime: _event.fromTime,
      toTime: _event.toTime,
    })
    return
  }

  if (!mode.value || mode.value === 'edit' || mode.value === 'details') {
    isLoading.value = true
    try {
      const updated = await business.updateEvent(_event.id, _event, {
        sendInvites: _event.sendInvites === true,
      })
      toast.success(__('Event updated successfully'))
      await reloadEvents()
      if (showEventPanel.value) showDetails({ id: updated.id }, true)
    } catch (err) {
      toast.error(err.message || __('Failed updating event'))
      console.error('Failed updating event', err)
    } finally {
      isLoading.value = false
    }
  } else {
    event.value = { ..._event }
  }
}

function deleteEvent(eventID) {
  if (!eventID) return

  $dialog({
    title: __('Delete'),
    message: __('Are you sure you want to delete this event?'),
    actions: [
      {
        label: __('Delete'),
        variant: 'solid',
        theme: 'red',
        onClick: async (close) => {
          try {
            await business.deleteEvent(eventID, { sendCancellation: true })
            toast.success(__('Event deleted successfully'))
            await reloadEvents()
          } catch (err) {
            toast.error(err.message || __('Failed deleting event'))
            console.error('Failed deleting event', err)
          }
          showEventPanel.value = false
          event.value = {}
          activeEvent.value = ''
          mode.value = ''
          close()
        },
      },
    ],
  })
}

function syncEvent(eventID, _event) {
  if (!eventID || !Array.isArray(business.events)) return
  const target = business.events.find((ev) => ev.id === eventID)
  if (!target) return
  Object.assign(target, _event)
}

async function handleRangeChange(range) {
  if (!range?.startDate || !range?.endDate) return
  const key = `${range.view}-${range.startDate}-${range.endDate}`
  if (key === activeRangeKey.value && !isLoading.value) return
  activeRangeKey.value = key
  currentRange.value = range
  await reloadEvents()
}

onMounted(async () => {
  activeEvent.value = ''
  mode.value = ''
  showEventPanel.value = false

  await Promise.all([
    reloadEvents(),
    business.fetchUsersFromSupabase?.(),
    business.fetchInvoicesFromSupabase?.(),
  ])

  const { eventId, date, action, referenceDoctype, referenceDocname, title, email } = route.query
  if (eventId && date) {
    await nextTick()

    if (calendar.value?.onMonthYearChange) {
      calendar.value.onMonthYearChange(dayjs(date).toDate())
    }

    showDetails({ id: eventId })
  } else if (action === 'new' || referenceDoctype) {
    await nextTick()
    const targetDate = date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
    if (date && calendar.value?.onMonthYearChange) {
      calendar.value.onMonthYearChange(dayjs(date).toDate())
    }
    newEvent({
      title: title || (referenceDoctype === 'Invoice' ? __('Meeting regarding Invoice') : ''),
      fromDate: targetDate,
      toDate: targetDate,
      fromTime: '09:00',
      toTime: '10:00',
      referenceDoctype: referenceDoctype || '',
      referenceDocname: referenceDocname || '',
      event_participants: email ? [{ email }] : [],
    })
  }
})

// Global shortcut: Cmd/Ctrl + E -> new event
useKeyboardShortcuts({
  shortcuts: [
    {
      match: (e) =>
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'e',
      guard: () => !isCreateDisabled.value,
      action: () =>
        newEvent({
          date: dayjs().format('YYYY-MM-DD'),
          time: dayjs().format('HH:mm'),
          isFullDay: false,
        }),
    },
  ],
})

function showDetails(e, reloadEvent = false) {
  openEvent(e, 'details', reloadEvent)
}

function editDetails(e) {
  openEvent(e, 'edit')
}

function buildTempEvent(e = {}, duplicate = false) {
  const id = duplicate ? 'duplicate-event' : 'new-event'

  return {
    id,
    title: e.title,
    description: e.description || '',
    date: e.fromDate,
    fromDate: e.fromDate,
    toDate: e.toDate,
    fromTime: e.fromTime,
    toTime: e.toTime,
    location: e.location || '',
    isFullDay: e.isFullDay || false,
    eventType: e.eventType || 'Private',
    color: e.color || '#30A66D',
    attending: e.attending || 'Yes',
    referenceDoctype: e.referenceDoctype || '',
    referenceDocname: e.referenceDocname || '',
    event_participants: e.event_participants || [],
    notifications: e.notifications || [],
  }
}

function newEvent(e = {}, duplicate = false) {
  removeTempEvents()

  let base = { ...e }
  if (!duplicate) {
    const [fromTime, toTime] = getFromToTime(e.time)
    const fromDate = e.fromDate || (e.date ? dayjs(e.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))
    base = {
      ...base,
      fromDate,
      toDate: e.toDate || fromDate,
      fromTime: e.fromTime || fromTime,
      toTime: e.toTime || toTime,
      isFullDay: e.isFullDay,
    }
  }

  event.value = buildTempEvent(base, duplicate)
  if (!Array.isArray(business.events)) {
    business.events = []
  }
  business.events.push(event.value)
  showEventPanel.value = true
  activeEvent.value = event.value.id
  mode.value = duplicate ? 'duplicate' : 'new'
}

function duplicateEvent(e) {
  newEvent(e, true)
}

function close() {
  showEventPanel.value = false
  event.value = {}
  activeEvent.value = ''
  mode.value = ''

  removeTempEvents()
}

// utils
function getFromToTime(time) {
  const pad = (v) => String(v).padStart(2, '0')
  let now = dayjs()
  let h = now.hour()
  let m = Math.floor(now.minute() / 15) * 15
  let fromHour = h
  let fromMinute = m
  if (time) {
    if (/am|pm/i.test(time)) {
      const raw = time.trim().replace(' ', '')
      const ampm = raw.slice(-2).toLowerCase()
      let hour = parseInt(raw.slice(0, -2))
      if (ampm === 'pm' && hour < 12) hour += 12
      if (ampm === 'am' && hour === 12) hour = 0
      fromHour = hour
      fromMinute = 0
    } else if (/^\d{1,2}:?\d{0,2}$/.test(time)) {
      const [hh, mm = '00'] = time.split(':')
      fromHour = parseInt(hh)
      fromMinute = parseInt(mm) || 0
    }
  }
  const toHour = (fromHour + 1) % 24
  return [
    `${pad(fromHour)}:${pad(fromMinute)}`,
    `${pad(toHour)}:${pad(fromMinute)}`,
  ]
}
</script>
