<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8">
    <!-- Header -->
    <div class="flex justify-between px-2 text-ink-gray-8">
      <div class="flex flex-col gap-1">
        <h2 class="flex gap-2 text-2xl-semibold leading-none h-5">
          {{ __('Calendar Settings') }}
        </h2>
        <p class="text-p-base text-ink-gray-6">
          {{
            __(
              'Configure your calendar settings, including the default view and event notifications',
            )
          }}
        </p>
      </div>
      <div class="flex item-center space-x-2 w-3/12 justify-end">
        <Button
          v-if="isDirty"
          :label="__('Update')"
          variant="solid"
          :loading="isSaving"
          @click="updateSettings"
        />
      </div>
    </div>

    <!-- Fields -->
    <div class="flex flex-1 flex-col overflow-y-auto">
      <div class="flex items-center justify-between gap-8 py-3 px-2">
        <div class="flex flex-col">
          <div class="text-p-base-medium text-ink-gray-7 truncate">
            {{ __('Default View') }}
          </div>
          <div class="text-p-sm text-ink-gray-5">
            {{
              __(
                'Select the default view for your calendar. This will be the initial view when you open the calendar',
              )
            }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <FormControl
            v-model="localSettings.default_calendar_view"
            type="select"
            class="w-28"
            :options="[
              { label: __('Daily'), value: 'Daily' },
              { label: __('Weekly'), value: 'Weekly' },
              { label: __('Monthly'), value: 'Monthly' },
            ]"
            :placeholder="__('Select View')"
          />
        </div>
      </div>
      <div class="h-px border-t mx-2 border-outline-elevation-2" />
      <div class="flex flex-col gap-3 px-2 py-3">
        <div>
          <div class="text-p-base-medium text-ink-gray-7 truncate">
            {{ __('Event Notifications') }}
          </div>
          <div
            class="text-p-sm text-ink-gray-5"
            v-html="
              __(
                'Reminders will be sent <b>before the event starts</b>, based on the configured time',
              )
            "
          />
        </div>
        <div
          v-if="notifications?.length"
          class="rounded-lg flex flex-col gap-2 w-fit"
        >
          <div v-for="(notification, idx) in notifications" :key="idx">
            <div class="flex items-center gap-2">
              <FormControl
                v-model="notification.type"
                class="w-36 shrink-0"
                type="select"
                :options="[
                  {
                    label: __('Notification'),
                    value: 'Notification',
                  },
                  {
                    label: __('Email'),
                    value: 'Email',
                  },
                ]"
                :placeholder="__('Notification')"
              />
              <FormControl
                v-model.number="notification.before"
                class="w-20 shrink-0"
                type="number"
                :min="min(notification)"
                :max="max(notification)"
                :step="notification.interval == 'minutes' ? 5 : 1"
                :placeholder="__('10')"
                @blur="handleIntervalChange(notification)"
              />
              <FormControl
                v-model="notification.interval"
                class="w-32 shrink-0"
                type="select"
                :options="[
                  {
                    label:
                      notification.before == 1 ? __('minute') : __('minutes'),
                    value: 'minutes',
                  },
                  {
                    label: notification.before == 1 ? __('hour') : __('hours'),
                    value: 'hours',
                  },
                  {
                    label: notification.before == 1 ? __('day') : __('days'),
                    value: 'days',
                  },
                  {
                    label: notification.before == 1 ? __('week') : __('weeks'),
                    value: 'weeks',
                  },
                ]"
                :placeholder="__('minutes')"
                @update:modelValue="() => handleIntervalChange(notification)"
              />
              <Button
                icon="lucide-x"
                variant="ghost"
                @click="notifications.splice(idx, 1)"
              />
            </div>
          </div>
        </div>
        <Button
          class="w-fit"
          :label="__('Add Notification')"
          iconLeft="plus"
          @click="
            notifications.push({
              type: 'Notification',
              before: 10,
              interval: 'minutes',
            })
          "
        />
      </div>
      <div class="h-px border-t mx-2 border-outline-elevation-2" />
      <div class="flex flex-col gap-3 py-3 px-2">
        <div>
          <div class="text-p-base-medium text-ink-gray-7 truncate">
            {{ __('All Day Event Notifications') }}
          </div>
          <div
            class="text-p-sm text-ink-gray-5"
            v-html="
              __(
                'For all-day events, <b>set a time</b> to send reminders before the event starts',
              )
            "
          />
        </div>
        <div
          v-if="allDayNotifications?.length"
          class="rounded-lg flex flex-col gap-2 w-fit"
        >
          <div
            v-for="(notification, idx) in allDayNotifications"
            :key="idx"
          >
            <div class="flex items-center gap-2">
              <FormControl
                v-model="notification.type"
                class="w-36 shrink-0"
                type="select"
                :options="[
                  {
                    label: __('Notification'),
                    value: 'Notification',
                  },
                  {
                    label: __('Email'),
                    value: 'Email',
                  },
                ]"
                :placeholder="__('Notification')"
              />
              <FormControl
                v-model.number="notification.before"
                class="w-20 shrink-0"
                type="number"
                :min="min(notification)"
                :max="max(notification)"
                :placeholder="__('10')"
                @blur="handleIntervalChange(notification)"
              />
              <FormControl
                v-model="notification.interval"
                class="w-32 shrink-0"
                type="select"
                :options="[
                  {
                    label: notification.before == 1 ? __('day') : __('days'),
                    value: 'days',
                  },
                  {
                    label: notification.before == 1 ? __('week') : __('weeks'),
                    value: 'weeks',
                  },
                ]"
                :placeholder="__('minutes')"
                @update:modelValue="() => handleIntervalChange(notification)"
              />
              <div class="text-p-sm text-ink-gray-5">
                {{ __('before at') }}
              </div>
              <TimePicker
                v-model="notification.time"
                class="w-32 shrink-0"
                :placeholder="__('08:00 pm')"
              />
              <Button
                icon="lucide-x"
                variant="ghost"
                @click="allDayNotifications.splice(idx, 1)"
              />
            </div>
          </div>
        </div>
        <Button
          class="w-fit"
          :label="__('Add Notification')"
          iconLeft="plus"
          @click="
            allDayNotifications.push({
              type: 'Notification',
              before: 1,
              interval: 'days',
              time: '08:00',
            })
          "
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { showSettings } from '@/composables/settings'
import { min, max, handleIntervalChange } from '@/components/Calendar/utils'
import { FormControl, TimePicker, toast } from 'frappe-ui'
import { ref, computed, watch } from 'vue'
import { useBusinessStore } from '@/stores/business'

const business = useBusinessStore()

const localSettings = ref({
  default_calendar_view: business.settings.default_calendar_view || 'Weekly',
  calendar_notifications: JSON.parse(
    JSON.stringify(business.settings.calendar_notifications || []),
  ),
  calendar_allday_notifications: JSON.parse(
    JSON.stringify(business.settings.calendar_allday_notifications || []),
  ),
})

const isDirty = ref(false)
const isSaving = ref(false)

watch(
  localSettings,
  () => {
    isDirty.value = true
  },
  { deep: true },
)

const notifications = computed({
  get: () => localSettings.value.calendar_notifications,
  set: (val) => {
    localSettings.value.calendar_notifications = val
  },
})

const allDayNotifications = computed({
  get: () => localSettings.value.calendar_allday_notifications,
  set: (val) => {
    localSettings.value.calendar_allday_notifications = val
  },
})

async function updateSettings() {
  isSaving.value = true
  try {
    await business.updateBusinessSettings({
      default_calendar_view: localSettings.value.default_calendar_view,
      calendar_notifications: localSettings.value.calendar_notifications,
      calendar_allday_notifications:
        localSettings.value.calendar_allday_notifications,
    })
    isDirty.value = false
    toast.success(__('Calendar settings updated successfully'))
    showSettings.value = false
  } catch (err) {
    toast.error(__('Failed to update calendar settings'))
  } finally {
    isSaving.value = false
  }
}
</script>
