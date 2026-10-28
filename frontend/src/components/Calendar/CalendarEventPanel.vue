<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="show" class="flex flex-col w-[352px] text-base h-full">
    <!-- Event Header -->
    <div
      class="flex items-center justify-between p-4.5 text-ink-gray-7 text-lg-medium"
    >
      <div
        class="flex items-center gap-x-2"
        :class="mode == 'edit' && 'cursor-pointer hover:text-ink-gray-8'"
        @click="mode == 'edit' && details()"
      >
        <LucideChevronLeft v-if="mode == 'edit'" class="size-4" />
        {{ __(title) }}
      </div>
      <div class="flex items-center gap-x-1">
        <ShortcutTooltip
          v-if="mode == 'details' && !readonly && _event.status !== 'Cancelled'"
          :label="__('Cancel Meeting')"
        >
          <Button
            icon="lucide-calendar-x"
            variant="ghost"
            class="text-ink-red-7 hover:bg-surface-red-2"
            @click="confirmCancelMeeting"
          />
        </ShortcutTooltip>
        <ShortcutTooltip
          v-if="mode == 'details' && !readonly"
          :label="__('Edit Event')"
          combo="Enter"
        >
          <Button :icon="EditIcon" variant="ghost" @click="editDetails" />
        </ShortcutTooltip>
        <ShortcutTooltip
          v-if="(mode === 'edit' || mode === 'details') && !readonly"
          :label="__('Delete Event')"
          combo="Delete"
          :alt-combos="['Backspace']"
        >
          <Button icon="lucide-trash-2" variant="ghost" @click="deleteEvent" />
        </ShortcutTooltip>
        <ShortcutTooltip
          v-if="mode === 'edit' || mode === 'details'"
          :label="__('Duplicate Event')"
          combo="Mod+D"
        >
          <Button icon="lucide-copy" variant="ghost" @click="duplicateEvent" />
        </ShortcutTooltip>
        <ShortcutTooltip :label="__('Close Panel')" combo="Esc">
          <Button icon="lucide-x" variant="ghost" @click="close" />
        </ShortcutTooltip>
      </div>
    </div>

    <!-- Event Details -->
    <div v-if="mode == 'details'" class="flex flex-col flex-1 overflow-y-auto">
      <div
        class="flex items-start gap-2 px-4.5 py-3 pb-0"
        @dblclick="editDetails"
      >
        <div
          class="mx-0.5 my-[5px] size-2.5 rounded-full cursor-pointer"
          :style="{
            backgroundColor: _event.color || '#30A66D',
          }"
        />
        <div class="flex flex-col gap-[3px]">
          <div
            class="text-2xl-semibold"
            :class="
              _event.status === 'Cancelled' || attending == 'No'
                ? 'line-through text-ink-gray-7'
                : 'text-ink-gray-8 '
            "
          >
            {{ _event.title || __('(No Title)') }}
          </div>
          <div
            v-if="_event.status === 'Cancelled'"
            class="inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-red-2 text-ink-red-7 border border-outline-red-2"
          >
            <span class="lucide-calendar-x size-3" />
            <span>{{ __('Meeting Cancelled') }}</span>
          </div>
          <div class="text-ink-gray-6 text-p-base">{{ formattedDateTime }}</div>
        </div>
      </div>
      <div class="mx-4.5 my-2.5 border-t border-outline-gray-1" />
      <div v-if="_event.location" class="px-4.5 py-2">
        <div class="flex gap-3 text-ink-gray-7">
          <MapIcon class="size-4" />
          <div>{{ __(_event.location) }}</div>
        </div>
      </div>
      <div v-if="_event.eventType" class="px-4.5 py-2">
        <div class="flex gap-3 text-ink-gray-7">
          <ShieldIcon class="size-4" />
          <div>{{ __(_event.eventType) }}</div>
        </div>
      </div>
      <div v-if="notifications?.length" class="px-4.5 py-2">
        <div class="flex gap-3 text-ink-gray-7">
          <BellIcon class="size-4" />
          <div class="flex flex-col gap-1.5">
            <div v-for="notification in notifications" :key="notification.name">
              {{
                __(`{0} {1} before{2}`, [
                  notification.before,
                  notification.before == 1
                    ? notification.interval.slice(0, -1)
                    : notification.interval,
                  notification.type == 'Email' ? ', as email' : '',
                ])
              }}
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="_event.referenceDocname"
        class="mx-4.5 my-2.5 border-t border-outline-gray-1"
      />
      <div
        v-if="_event.referenceDocname"
        class="flex items-center px-4.5 py-1 text-ink-gray-7"
      >
        <DocumentIcon class="size-4 mr-2 shrink-0 text-ink-gray-7" />
        <div class="text-sm font-medium text-ink-gray-8 flex-1 truncate">
          {{ linkedDocLabel }}
        </div>
        <Button
          variant="ghost"
          :tooltip="__('Open Linked Invoice')"
          @click="redirect"
        >
          <template #icon>
            <ArrowUpRightIcon class="size-4 text-ink-gray-7" />
          </template>
        </Button>
      </div>
      <div
        v-if="peoples.length"
        class="mx-4.5 my-2.5 border-t border-outline-gray-1"
      />
      <div v-if="peoples.length" class="px-4.5 py-2">
        <div class="flex gap-3 text-ink-gray-6 mb-3">
          <PeopleIcon class="size-4" />
          <div class="flex flex-col">
            <div class="text-ink-gray-7">
              {{ __('{0} attendees', [peoples.length + 1]) }}
            </div>
            <div class="text-p-base">{{ attendees }}</div>
          </div>
        </div>
        <div class="flex flex-col gap-2 -ml-1">
          <Button
            :key="_event.owner"
            variant="ghost"
            theme="gray"
            class="rounded-full w-fit !h-8.5 !pr-3"
            :tooltip="__('Owner: {0}', [_event.owner?.label])"
          >
            <template #default>
              <div class="flex flex-col justify-start items-start text-sm">
                <div>{{ _event.owner?.label }}</div>
                <div class="text-ink-gray-5">{{ __('Organizer') }}</div>
              </div>
            </template>
            <template #prefix>
              <div class="relative">
                <UserAvatar :user="_event.owner?.value" class="-ml-1 !size-5" />
                <div
                  v-if="_event.attending"
                  class="flex items-center justify-center absolute -bottom-[2px] -right-[2px] ring-1 ring-outline-base size-2.5 rounded-full"
                  :class="{
                    'bg-green-600': _event.attending === 'Yes',
                    'bg-gray-500': _event.attending === 'Maybe',
                    'bg-red-500': _event.attending === 'No',
                  }"
                >
                  <div
                    v-if="_event.attending == 'Maybe'"
                    class="text-ink-base font-extrabold text-[8px] pt-px"
                  >
                    ?
                  </div>
                  <FeatherIcon
                    v-else
                    :name="
                      _event.attending === 'Yes'
                        ? 'check'
                        : _event.attending === 'No'
                          ? 'x'
                          : ''
                    "
                    class="size-[7px] stroke-[4px] text-ink-base"
                  />
                </div>
              </div>
            </template>
          </Button>
          <Button
            v-for="att in displayedPeoples"
            :key="att.email"
            :label="att.email"
            variant="ghost"
            theme="gray"
            class="rounded-full w-fit !text-sm"
            :tooltip="getTooltip(att)"
          >
            <template #prefix>
              <div class="relative">
                <UserAvatar :user="att.email" class="-ml-1 !size-5" />
                <div
                  v-if="att.attending"
                  class="flex items-center justify-center absolute -bottom-[2px] -right-[2px] ring-1 ring-outline-base size-2.5 rounded-full"
                  :class="{
                    'bg-green-600': att.attending === 'Yes',
                    'bg-gray-500': att.attending === 'Maybe',
                    'bg-red-500': att.attending === 'No',
                  }"
                >
                  <div
                    v-if="att.attending == 'Maybe'"
                    class="text-ink-base font-extrabold text-[8px] pt-px"
                  >
                    ?
                  </div>
                  <FeatherIcon
                    v-else
                    :name="
                      att.attending === 'Yes'
                        ? 'check'
                        : att.attending === 'No'
                          ? 'x'
                          : ''
                    "
                    class="size-[7px] stroke-[4px] text-ink-base"
                  />
                </div>
              </div>
            </template>
          </Button>
          <Button
            v-if="!showAllParticipants && peoples.length > 2"
            variant="ghost"
            :label="__('See All Participants')"
            iconLeft="more-horizontal"
            class="!justify-start w-fit"
            @click="showAllParticipants = true"
          />
          <Button
            v-else-if="showAllParticipants"
            variant="ghost"
            :label="__('Show Less')"
            iconLeft="chevron-up"
            class="!justify-start w-fit"
            @click="showAllParticipants = false"
          />
        </div>
      </div>
      <div
        v-if="_event.description && _event.description !== '<p></p>'"
        class="mx-4.5 my-2.5 border-t border-outline-gray-1"
      />
      <div v-if="_event.description && _event.description !== '<p></p>'">
        <div class="flex gap-2 items-center text-ink-gray-7 px-4.5 py-1">
          <DescriptionIcon class="size-4" />
          {{ __('Description') }}
        </div>
        <div
          class="px-4.5 py-2 text-ink-gray-7 text-p-base"
          v-html="sanitizeHTML(_event.description)"
        />
      </div>
    </div>

    <!-- Event new, duplicate & edit -->
    <div v-else class="flex flex-col flex-1 overflow-y-auto">
      <div class="flex gap-2 items-center px-4.5 py-3">
        <Dropdown class="ml-1" :options="colors">
          <div
            class="flex items-center justify-center size-8 shrink-0 border border-outline-gray-2 bg-surface-base hover:border-outline-gray-3 hover:shadow-sm rounded cursor-pointer"
          >
            <div
              class="size-2.5 rounded-full cursor-pointer"
              :style="{
                backgroundColor: _event.color || '#30A66D',
              }"
            />
          </div>
        </Dropdown>
        <TextInput
          ref="eventTitle"
          v-model="_event.title"
          class="w-full"
          variant="outline"
          size="md"
          :debounce="500"
          :placeholder="__('Event Title')"
          @change="sync"
          @keyup.enter="saveEvent"
        />
      </div>
      <div class="flex justify-between py-2.5 px-4.5 text-ink-gray-6">
        <div class="flex items-center">
          <Switch v-model="_event.isFullDay" @update:model-value="sync" />
          <div class="ml-2">
            {{ __('All Day') }}
          </div>
        </div>
        <!-- <div class="flex items-center gap-1.5 text-ink-gray-5">
          <LucideEarth class="size-4" />
          {{ __('GMT+5:30') }}
        </div> -->
      </div>
      <div class="mx-4.5 my-2.5 border-t border-outline-gray-1" />
      <div
        class="flex items-center justify-between gap-3 px-4.5 py-[7px] text-ink-gray-7"
      >
        <CalendarIcon class="size-4" />
        <div class="flex w-full items-center gap-x-1.5">
          <DatePicker
            class="w-full"
            variant="outline"
            :value="_event.fromDate"
            :format="'MMM D, YYYY'"
            :placeholder="__('May 1, 2025')"
            :clearable="false"
            @update:modelValue="(date) => updateDate(date, true)"
          >
            <template #suffix="{ togglePopover }">
              <span
                class="lucide-chevron-down h-4 w-4 cursor-pointer"
                aria-hidden="true"
                @click="togglePopover"
              />
            </template>
          </DatePicker>
        </div>
      </div>
      <div
        v-if="!_event.isFullDay"
        class="flex items-center justify-between gap-3 px-4.5 py-[7px] text-ink-gray-7"
      >
        <span class="lucide-clock size-4" aria-hidden="true" />
        <div class="flex w-full items-center gap-x-1.5">
          <TimePicker
            v-if="!_event.isFullDay"
            class="w-full"
            variant="outline"
            :modelValue="_event.fromTime"
            :placeholder="__('Start Time')"
            @update:modelValue="(time) => updateTime(time, true)"
          />
          <TimePicker
            class="w-full"
            variant="outline"
            :modelValue="_event.toTime"
            :options="toOptions"
            :placeholder="__('End Time')"
            placement="bottom-end"
            @update:modelValue="(time) => updateTime(time)"
          />
        </div>
      </div>
      <div class="flex justify-between gap-3 px-4.5 py-[7px] text-ink-gray-7">
        <BellIcon class="size-4 mt-1.5" />
        <EventNotifications
          v-model="notifications"
          class="w-full"
          :isAllDay="_event.isFullDay"
        />
      </div>
      <div class="flex justify-between gap-3 px-4.5 py-[7px] text-ink-gray-7">
        <LeadsIcon class="h-4 mt-1.5" />
        <Attendee
          v-model="peoples"
          class="w-full"
          size="sm"
          :validate="validateEmail"
          :error-message="
            (value) => __('{0} is an invalid email address', [value])
          "
        />
      </div>
      <div class="flex gap-3 justify-between items-center mx-4.5 my-2.5">
        <MapIcon class="size-4 text-ink-gray-7" />
        <TextInput
          v-model="_event.location"
          class="w-full"
          :placeholder="__('Add Location')"
          variant="outline"
          size="sm"
        />
      </div>
      <div class="flex justify-between gap-3 mx-4.5 my-2.5 text-ink-gray-7">
        <DescriptionIcon class="size-4 mt-1.5" />
        <div class="flex w-full items-center gap-x-2 border rounded py-1">
          <TextEditor
            editor-class="!prose-sm !leading-[1.13rem] overflow-auto px-2.5 rounded placeholder-ink-gray-4 focus:bg-surface-base focus:ring-0 text-ink-gray-8 transition-colors"
            :bubbleMenu="true"
            :content="_event.description"
            :placeholder="__('Add Description')"
            @change="
              (val) => {
                _event.description = val
                sync()
              }
            "
          />
        </div>
      </div>

      <div class="my-2.5 border-t border-outline-gray-1" />
      <CollapsibleSection
        headerClass="mx-4.5 my-2.5"
        :opened="Boolean(_event.referenceDocname)"
        :label="__('Linked Invoice')"
      >
        <div
          class="flex items-center justify-between gap-3 px-4.5 py-[7px] text-ink-gray-7"
        >
          <div class="w-full">
            <InvoiceSelect
              v-model="_event.referenceDocname"
              :placeholder="__('Search & link an invoice...')"
              @change="
                (inv) => {
                  _event.referenceDoctype = inv ? 'Invoice' : ''
                  sync()
                }
              "
            />
          </div>
        </div>
      </CollapsibleSection>
      <div class="my-2.5 border-t border-outline-gray-1" />
      <CollapsibleSection
        headerClass="mx-4.5 my-2.5"
        :opened="false"
        :label="__('More Options')"
      >
        <div
          class="flex items-center justify-between gap-3 px-4.5 py-[7px] text-ink-gray-7"
        >
          <ShieldIcon class="size-4" />
          <div class="flex items-center gap-x-1.5 w-full">
            <FormControl
              v-model="_event.eventType"
              class="w-full"
              type="select"
              :options="[
                {
                  label: __('Private'),
                  value: 'Private',
                },
                {
                  label: __('Public'),
                  value: 'Public',
                },
              ]"
              variant="outline"
              :placeholder="__('Private or Public')"
              @update:modelValue="() => sync()"
            />
          </div>
        </div>
      </CollapsibleSection>
      <div class="my-2.5 border-t border-outline-gray-1" />
    </div>

    <div v-if="mode != 'details'" class="px-4.5 py-3">
      <div
        v-if="peoples.length"
        class="flex items-center justify-between mb-3 text-sm text-ink-gray-7 bg-surface-gray-2 p-2.5 rounded-lg border border-outline-gray-1"
      >
        <div class="flex items-center gap-2">
          <span class="lucide-mail size-4 text-blue-600" />
          <div class="flex flex-col">
            <span class="font-medium text-ink-gray-9">{{ __('Email Attendees') }}</span>
            <span class="text-xs text-ink-gray-6">{{ __('Google, Outlook & Apple .ICS links') }}</span>
          </div>
        </div>
        <Switch v-model="sendEmailInvites" />
      </div>

      <ErrorMessage class="my-2" :message="error" />
      <div class="w-full flex flex-col gap-2">
        <Button
          v-if="mode === 'edit' && _event.id && _event.status !== 'Cancelled'"
          variant="outline"
          theme="red"
          class="w-full"
          iconLeft="calendar-x"
          :label="__('Cancel Meeting')"
          :loading="isCancelling"
          @click="confirmCancelMeeting"
        />
        <Button
          variant="solid"
          class="w-full"
          :disabled="!dirty"
          :loading="isSaving"
          @click="saveEvent"
        >
          {{
            mode === 'edit'
              ? __('Save')
              : mode === 'duplicate'
                ? __('Duplicate Event')
                : __('Create Event')
          }}
        </Button>
      </div>
    </div>
    <div
      v-else-if="mode === 'details' && !readonly"
      class="flex flex-col gap-2.5 px-4.5 py-3 border-t border-outline-gray-1 bg-surface-gray-1/30"
    >
      <div v-if="_event.event_participants?.length" class="flex flex-col gap-1.5 pb-1">
        <div class="text-sm text-ink-gray-6 font-medium">
          {{ __('Going?') }}
        </div>
        <TabButtons
          v-model="attending"
          class="w-full [&_button]:w-full [&_div]:w-full [&_button>span]:w-full"
          :options="[
            {
              label: __('Yes'),
              value: 'Yes',
            },
            {
              label: __('No'),
              value: 'No',
            },
            {
              label: __('Maybe'),
              value: 'Maybe',
            },
          ]"
        />
      </div>

      <!-- Cancel Meeting / Restore Button -->
      <Button
        v-if="_event.status !== 'Cancelled'"
        variant="subtle"
        theme="red"
        class="w-full"
        iconLeft="calendar-x"
        :label="__('Cancel Meeting')"
        :loading="isCancelling"
        @click="confirmCancelMeeting"
      />
      <Button
        v-else
        variant="subtle"
        theme="gray"
        class="w-full"
        iconLeft="rotate-ccw"
        :label="__('Restore Meeting')"
        :loading="isCancelling"
        @click="restoreMeeting"
      />
    </div>
  </div>
</template>

<script setup>
import CalendarIcon from '@/components/Icons/CalendarIcon.vue'
import BellIcon from '@/components/Icons/BellIcon.vue'
import MapIcon from '@/components/Icons/MapIcon.vue'
import ShieldIcon from '@/components/Icons/ShieldIcon.vue'
import PeopleIcon from '@/components/Icons/PeopleIcon.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import DocumentIcon from '@/components/Icons/DocumentIcon.vue'
import Link from '@/components/Controls/Link.vue'
import EditIcon from '@/components/Icons/EditIcon.vue'
import DescriptionIcon from '@/components/Icons/DescriptionIcon.vue'
import Attendee from '@/components/Calendar/Attendee.vue'
import InvoiceSelect from '@/components/Controls/InvoiceSelect.vue'
import EventNotifications from '@/components/Calendar/EventNotifications.vue'
import ShortcutTooltip from '@/components/ShortcutTooltip.vue'
import { sendCalendarCancellationEmails } from '@/utils/mailer'
import { globalStore } from '@/stores/global'
import { sessionStore } from '@/stores/session'
import { validateEmail, deepClone, sanitizeHTML } from '@/utils'
import {
  normalizeParticipants,
  buildEndTimeOptions,
  computeAutoToTime,
  validateTimeRange,
  parseEventDoc,
} from '@/composables/event'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import {
  TextInput,
  Switch,
  DatePicker,
  TimePicker,
  TextEditor,
  ErrorMessage,
  Dropdown,
  dayjs,
  CalendarColorMap as colorMap,
  CalendarActiveEvent as activeEvent,
  TabButtons,
  toast,
} from 'frappe-ui'
import { ref, computed, watch, h, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  mode: { type: String, default: 'details' },
})

const emit = defineEmits([
  'save',
  'edit',
  'delete',
  'details',
  'close',
  'sync',
  'duplicate',
])

const router = useRouter()
const { $dialog } = globalStore()
const { user } = sessionStore()
const business = useBusinessStore()

const linkedDocLabel = computed(() => {
  if (!_event.value?.referenceDocname) return ''
  if (_event.value.referenceDoctype === 'Invoice') {
    const inv = (business.invoices || []).find(
      (i) => i.id === _event.value.referenceDocname || i.invoice_number === _event.value.referenceDocname,
    )
    if (inv) {
      return `${inv.invoice_number} • ${inv.client_name || 'Client'} (${inv.status || 'Active'})`
    }
    return `Invoice #${_event.value.referenceDocname}`
  }
  return _event.value.referenceDocname
})

const sendEmailInvites = ref(true)
const isSaving = ref(false)
const isCancelling = ref(false)

function confirmCancelMeeting() {
  const hasParticipants = Boolean(_event.value.event_participants?.length)

  $dialog({
    title: __('Cancel Meeting?'),
    message: hasParticipants
      ? __('Are you sure you want to cancel this meeting? Cancellation notifications with .ics calendar cancellation will be sent to all attendees.')
      : __('Are you sure you want to mark this meeting as Cancelled?'),
    actions: [
      {
        label: __('Keep Meeting'),
        variant: 'subtle',
      },
      {
        label: __('Yes, Cancel Meeting'),
        variant: 'solid',
        theme: 'red',
        onClick: async (closeDialog) => {
          closeDialog()
          await executeCancelMeeting()
        },
      },
    ],
  })
}

async function executeCancelMeeting() {
  if (!_event.value?.id) return
  isCancelling.value = true
  try {
    await business.updateEvent(_event.value.id, {
      ..._event.value,
      status: 'Cancelled',
    })

    if (_event.value.event_participants?.length) {
      try {
        await sendCalendarCancellationEmails({
          event: _event.value,
          attendees: _event.value.event_participants,
          businessSettings: business.settings,
        })
        toast.success(__('Meeting cancelled and notices sent to attendees'))
      } catch (mailErr) {
        console.warn('[Calendar] Failed to send cancellation emails:', mailErr)
        toast.warning(__('Meeting cancelled, but emails could not be sent'))
      }
    } else {
      toast.success(__('Meeting marked as Cancelled'))
    }

    _event.value.status = 'Cancelled'
    sync()
  } catch (err) {
    toast.error(err.message || __('Failed to cancel meeting'))
  } finally {
    isCancelling.value = false
  }
}

async function restoreMeeting() {
  if (!_event.value?.id) return
  isCancelling.value = true
  try {
    await business.updateEvent(_event.value.id, {
      ..._event.value,
      status: 'Open',
    })
    _event.value.status = 'Open'
    toast.success(__('Meeting restored successfully'))
    sync()
  } catch (err) {
    toast.error(err.message || __('Failed to restore meeting'))
  } finally {
    isCancelling.value = false
  }
}

const show = defineModel({ type: Boolean })
const event = defineModel('event', { type: Object, default: () => ({}) })

const events = inject('events', { data: [], loading: false })

const _event = ref({})

const readonly = computed(() => _event.value?.owner?.value !== user)

const peoples = computed({
  get() {
    return _event.value.event_participants || []
  },
  set(list) {
    _event.value.event_participants = normalizeParticipants(list)
    sync()
  },
})

const attendees = computed(() => {
  const counts = { Yes: 0, No: 0, Maybe: 0, Awaiting: 0 }

  if (_event.value.attending === 'Yes') counts.Yes += 1
  else if (_event.value.attending === 'No') counts.No += 1
  else if (_event.value.attending === 'Maybe') counts.Maybe += 1
  else counts.Awaiting += 1

  peoples.value.forEach((p) => {
    if (p.attending === 'Yes') counts.Yes += 1
    else if (p.attending === 'No') counts.No += 1
    else if (p.attending === 'Maybe') counts.Maybe += 1
    else counts.Awaiting += 1
  })

  let attendeesCountText = __('{0} yes', [counts.Yes])
  if (counts.No > 0) {
    attendeesCountText += `, ${__('{0} no', [counts.No])}`
  }

  if (counts.Maybe > 0) {
    attendeesCountText += `, ${__('{0} maybe', [counts.Maybe])}`
  }

  if (counts.Awaiting > 0) {
    attendeesCountText += `, ${__('{0} awaiting', [counts.Awaiting])}`
  }

  return attendeesCountText
})

const notifications = computed({
  get() {
    return _event.value.notifications
  },
  set(list) {
    _event.value.notifications = list
    sync()
  },
})

const title = computed(() => {
  if (props.mode === 'details') return __('Event Details')
  if (props.mode === 'edit') return __('Editing Event')
  if (props.mode === 'new') return __('New Event')
  return __('Duplicate Event')
})

const currentAttendee = computed(() => {
  return _event.value?.event_participants?.find((p) => p.email === user)
})

const attending = computed({
  get() {
    if (_event.value.owner?.value === user) {
      return _event.value.attending || null
    }
    const _attending = currentAttendee.value?.attending
    return ['Yes', 'No', 'Maybe'].includes(_attending) ? _attending : null
  },
  set(value) {
    if (_event.value.owner?.value === user) {
      _event.value.attending = value
      updateAttendingStatus(user, value)
    } else {
      currentAttendee.value.attending = value
      updateAttendingStatus(currentAttendee.value.email, value)
    }
  },
})

const eventTitle = ref(null)
const error = ref(null)
const showAllParticipants = ref(false)

const eventResource = ref({})

const oldEvent = ref(null)
const dirty = computed(() => {
  return JSON.stringify(oldEvent.value) !== JSON.stringify(_event.value)
})

const displayedPeoples = computed(() => {
  if (showAllParticipants.value) return peoples.value
  return peoples.value.slice(0, 2)
})

watch(
  [() => props.mode, () => event.value],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ([mode, event], [oldMode, oldEvent]) => {
    error.value = null
    focusOnTitle()
    fetchEvent(oldMode)
  },
  { immediate: true },
)

function fetchEvent(oldMode) {
  if (
    event.value.id &&
    event.value.id !== 'new-event' &&
    event.value.id !== 'duplicate-event'
  ) {
    const found =
      (business.events || []).find((e) => e.id === event.value.id) ||
      (Array.isArray(events?.data)
        ? events.data.find((e) => e.id === event.value.id)
        : null)

    if (found) {
      _event.value = deepClone(found)
      if (!_event.value.referenceDoctype && found.reference_doctype) {
        _event.value.referenceDoctype = found.reference_doctype
      }
      if (!_event.value.referenceDocname && found.reference_docname) {
        _event.value.referenceDocname = found.reference_docname
      }
      oldEvent.value = deepClone(_event.value)
    } else if (event.value.title) {
      _event.value = deepClone(event.value)
      if (!_event.value.referenceDoctype && event.value.reference_doctype) {
        _event.value.referenceDoctype = event.value.reference_doctype
      }
      if (!_event.value.referenceDocname && event.value.reference_docname) {
        _event.value.referenceDocname = event.value.reference_docname
      }
      oldEvent.value = deepClone(event.value)
    }
    handleReadonlyEvent()
  } else {
    _event.value = event.value
    if (!_event.value.referenceDoctype && event.value.reference_doctype) {
      _event.value.referenceDoctype = event.value.reference_doctype
    }
    if (!_event.value.referenceDocname && event.value.reference_docname) {
      _event.value.referenceDocname = event.value.reference_docname
    }

    if (oldMode !== props.mode) {
      oldEvent.value = deepClone(event.value)
    } else if (!oldEvent.value) {
      // Ensure oldEvent is set if it hasn't been initialized
      oldEvent.value = deepClone(event.value)
    }

    if (event.value.id === 'duplicate-event' && oldMode !== 'duplicate') {
      _event.value.title = _event.value.title + ' (Copy)'
    }
    handleReadonlyEvent()
  }
  showAllParticipants.value = false
}

function handleReadonlyEvent() {
  if (props.mode === 'edit' && readonly.value) {
    emit('details', _event.value)
  }
}

function focusOnTitle() {
  setTimeout(() => {
    if (['edit', 'new', 'duplicate'].includes(props.mode)) {
      eventTitle.value?.el?.focus()
    }
  }, 100)
}

function sync() {
  emit('sync', _event.value.id, _event.value)
}

function updateDate(d) {
  _event.value.fromDate = d
  _event.value.toDate = d

  sync()
}

function updateTime(t, fromTime = false) {
  error.value = null
  const prevTo = _event.value.toTime
  if (fromTime) {
    _event.value.fromTime = t
    if (!_event.value.toTime || _event.value.toTime <= t) {
      _event.value.toTime = computeAutoToTime(t)
    }
  } else {
    _event.value.toTime = t
  }
  const { valid, error: err } = validateTimeRange({
    fromDate: _event.value.fromDate,
    fromTime: _event.value.fromTime,
    toTime: _event.value.toTime,
    isFullDay: _event.value.isFullDay,
  })
  if (!valid) {
    error.value = err
    _event.value.toTime = prevTo
  } else {
    sync()
  }
}

function saveEvent() {
  if (!dirty.value) return

  error.value = null
  if (!_event.value.title) {
    error.value = __('Title is required')
    eventTitle.value.el.focus()
    return
  }

  const { valid, error: err } = validateTimeRange({
    fromDate: _event.value.fromDate,
    fromTime: _event.value.fromTime,
    toTime: _event.value.toTime,
    isFullDay: _event.value.isFullDay,
  })
  if (!valid) {
    error.value = err
    return
  }

  oldEvent.value = deepClone(_event.value)
  sync()
  emit('save', {
    ..._event.value,
    sendInvites: sendEmailInvites.value,
  })
}

function editDetails() {
  if (readonly.value) return
  emit('edit', _event.value)
}

function duplicateEvent() {
  if (dirty.value) {
    showDiscardChangesModal(() => reset())
  } else {
    emit('duplicate', _event.value)
  }
}

function deleteEvent() {
  if (readonly.value) return
  emit('delete', _event.value.id)
}

async function updateAttendingStatus(attendee, status) {
  try {
    await business.updateEventAttendingStatus(_event.value.id, attendee, status)
    toast.success(__('Attending status updated'))
    oldEvent.value = deepClone(_event.value)
    sync()
  } catch (err) {
    error.value = err.message || __('Failed to update attending status')
    toast.error(error.value)
  }
}

function details() {
  if (dirty.value) {
    showDiscardChangesModal(() => reset())
  } else {
    emit('details', _event.value)
  }
}

function close() {
  const _close = () => {
    show.value = false
    activeEvent.value = ''
    emit('close', _event.value)
  }

  if (dirty.value) {
    showDiscardChangesModal(() => {
      reset()
      if (['new-event', 'duplicate-event'].includes(_event.value.id)) _close()
    })
  } else {
    _close()
  }
}

function reset() {
  _event.value = deepClone(oldEvent.value)
  sync()
}

function showDiscardChangesModal(action) {
  $dialog({
    title: __('Discard Unsaved Changes?'),
    message: __(
      'Are you sure you want to discard unsaved changes to this event?',
    ),
    actions: [
      {
        label: __('Cancel'),
        onClick: (close) => {
          close()
        },
      },
      {
        label: __('Discard'),
        variant: 'solid',
        onClick: (close) => {
          action()
          close()
        },
      },
    ],
  })
}

const formattedDateTime = computed(() => {
  if (!_event.value.fromDate) return ''

  const date = dayjs(_event.value.fromDate)

  if (_event.value.isFullDay) {
    return `${__('All Day')} - ${date.format('ddd, D MMM YYYY')}`
  }

  let start = dayjs(_event.value.fromDate + ' ' + _event.value.fromTime)
  let end = dayjs(_event.value.toDate + ' ' + _event.value.toTime)

  start = start.format('h:mm a')
  end = end.format('h:mm a')

  if (start.includes(':00')) {
    start = start.replace(':00', '')
  }

  if (end.includes(':00')) {
    end = end.replace(':00', '')
  }

  if (
    (start.includes(' am') && end.includes(' am')) ||
    (start.includes(' pm') && end.includes(' pm'))
  ) {
    start = start.replace(' am', '').replace(' pm', '')
  }

  return `${start} - ${end} ${date.format('ddd, D MMM YYYY')}`
})

const colors = Object.keys(colorMap).map((color) => ({
  label: color.charAt(0).toUpperCase() + color.slice(1),
  value: colorMap[color].color,
  icon: h('div', {
    class: '!size-2.5 rounded-full',
    style: { backgroundColor: colorMap[color].color },
  }),
  onClick: () => {
    _event.value.color = colorMap[color].color
    sync()
  },
}))

function redirect() {
  if (_event.value.referenceDocname) {
    router.push(`/invoices/${_event.value.referenceDocname}`)
  }
}

function getTooltip(m) {
  if (!m) return ''
  const parts = []
  if (m.reference_doctype) parts.push(m.reference_doctype)
  if (m.reference_docname) parts.push(m.reference_docname)
  return parts.length ? parts.join(': ') : ''
}

const toOptions = computed(() => buildEndTimeOptions(_event.value.fromTime))

function updateEvent(_e) {
  Object.assign(_event.value, _e)
}

defineExpose({ updateEvent })

// Keyboard shortcuts
useKeyboardShortcuts({
  active: () => show.value,
  shortcuts: [
    { keys: 'Escape', action: () => close() },
    {
      keys: 'Enter',
      guard: () =>
        ['details', 'edit'].includes(props.mode) && props.mode === 'details',
      action: () => editDetails(),
    },
    {
      keys: ['Delete', 'Backspace'],
      guard: () => ['details', 'edit'].includes(props.mode),
      action: () => deleteEvent(),
    },
    {
      match: (e) =>
        ['details', 'edit'].includes(props.mode) &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'd',
      action: () => duplicateEvent(),
    },
  ],
})
</script>
