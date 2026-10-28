<template>
  <Dialog v-model:open="show" :size="'xl'" bare>
    <template #default>
      <div class="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
        <!-- Header -->
        <div class="mb-5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-3xl-semibold leading-6 text-ink-gray-9">
              {{ editMode ? __('Edit Task') : __('Create Task') }}
            </h3>
          </div>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              class="w-7 text-ink-gray-5 hover:text-ink-gray-9"
              icon="lucide-x"
              @click="show = false"
            />
          </div>
        </div>

        <!-- Form Fields -->
        <div class="flex flex-col gap-4">
          <!-- 1. Task Title -->
          <FormControl
            v-model="form.title"
            type="text"
            :label="__('Title')"
            :placeholder="__('e.g. Follow up on proposal remittance')"
            required
            class="text-base"
          />

          <!-- 2. Status & Priority (2-col grid) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormControl
              v-model="form.status"
              type="select"
              :label="__('Status')"
              :options="statusOptions"
            />

            <FormControl
              v-model="form.priority"
              type="select"
              :label="__('Priority')"
              :options="priorityOptions"
            />
          </div>

          <!-- 3. Assigned To & Due Date (2-col grid) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormControl
              v-model="form.assigned_to"
              type="select"
              :label="__('Assigned To')"
              :options="assignedToOptions"
            />

            <div>
              <label class="block text-xs font-medium text-ink-gray-5 mb-1">
                {{ __('Due Date') }}
              </label>
              <DateTimePicker
                :value="form.due_date"
                class="w-full"
                :placeholder="__('Select due date & time...')"
                @change="(v: string) => (form.due_date = v)"
                @update:modelValue="(v: string) => (form.due_date = v)"
              />
            </div>
          </div>

          <!-- 4. Reference Linking (Deal / Lead / Customer / Invoice) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormControl
              v-model="form.reference_doctype"
              type="select"
              :label="__('Reference Type')"
              :options="referenceDoctypeOptions"
            />

            <FormControl
              v-model="form.reference_docname"
              type="text"
              :label="__('Reference Name / Entity')"
              :placeholder="__('e.g. Acme Corp or INV-2026-0001')"
            />
          </div>

          <!-- 5. Description / Notes -->
          <div>
            <label class="block text-xs font-medium text-ink-gray-5 mb-1">
              {{ __('Description & Notes') }}
            </label>
            <textarea
              v-model="form.description"
              rows="4"
              class="w-full rounded-lg border border-outline-gray-2 bg-surface-base p-3 text-sm text-ink-gray-9 placeholder-ink-gray-4 focus:border-outline-gray-4 focus:outline-none transition"
              :placeholder="__('Add detailed context, notes, or checklist for this task...')"
            />
          </div>

          <ErrorMessage v-if="errorMessage" :message="__(errorMessage)" class="mt-2" />
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-4 pb-7 pt-4 sm:px-6 bg-surface-base border-t border-outline-gray-1">
        <div class="flex items-center justify-between">
          <div>
            <Button
              v-if="editMode"
              variant="outline"
              theme="red"
              :label="__('Delete')"
              iconLeft="lucide-trash-2"
              @click="confirmDelete"
            />
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              :label="__('Cancel')"
              @click="show = false"
            />
            <Button
              variant="solid"
              :label="editMode ? __('Update') : __('Create')"
              :loading="isSaving"
              @click="handleSave"
            />
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useBusinessStore } from '@/stores/business'
import { globalStore } from '@/stores/global'
import { Dialog, FormControl, Button, ErrorMessage, DateTimePicker } from 'frappe-ui'
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps<{
  task?: Record<string, any> | null
  defaultStatus?: string
  defaultColumn?: string
}>()

const show = defineModel({
  type: Boolean,
  default: false,
})

const emit = defineEmits(['saved', 'deleted'])

const business = useBusinessStore()
const { $dialog } = globalStore()

const isSaving = ref(false)
const errorMessage = ref('')

const editMode = computed(() => Boolean(props.task && (props.task.id || props.task.name)))

const form = reactive({
  id: '',
  title: '',
  status: 'Backlog',
  priority: 'Low',
  assigned_to: '',
  due_date: '',
  reference_doctype: '',
  reference_docname: '',
  description: '',
})

const statusOptions = [
  { label: __('Backlog'), value: 'Backlog' },
  { label: __('Todo'), value: 'Todo' },
  { label: __('In Progress'), value: 'In Progress' },
  { label: __('Done'), value: 'Done' },
  { label: __('Canceled'), value: 'Canceled' },
]

const priorityOptions = [
  { label: __('Low'), value: 'Low' },
  { label: __('Medium'), value: 'Medium' },
  { label: __('High'), value: 'High' },
  { label: __('Urgent'), value: 'Urgent' },
]

const referenceDoctypeOptions = [
  { label: __('None'), value: '' },
  { label: __('Deal'), value: 'CRM Deal' },
  { label: __('Lead'), value: 'CRM Lead' },
  { label: __('Customer'), value: 'Customer' },
  { label: __('Invoice'), value: 'Invoice' },
]

const assignedToOptions = computed(() => {
  const users = business.users || []
  const options = [{ label: __('Unassigned'), value: '' }]
  users.forEach((u: any) => {
    options.push({
      label: u.full_name || u.email,
      value: u.email || u.id,
    })
  })
  return options
})

// Sync form with incoming props
watch(
  () => [props.task, show.value],
  () => {
    errorMessage.value = ''
    if (props.task && (props.task.id || props.task.name)) {
      form.id = props.task.id || props.task.name || ''
      form.title = props.task.title || ''
      form.status = props.task.status === 'Completed' ? 'Done' : props.task.status || 'Backlog'
      form.priority = props.task.priority || 'Low'
      form.assigned_to = props.task.assigned_to || ''
      form.due_date = props.task.due_date || ''
      form.reference_doctype = props.task.reference_doctype || ''
      form.reference_docname = props.task.reference_docname || ''
      form.description = props.task.description || ''
    } else {
      const initialStatus = props.defaultStatus || props.defaultColumn || 'Backlog'
      form.id = ''
      form.title = ''
      form.status = initialStatus === 'Completed' ? 'Done' : initialStatus
      form.priority = 'Low'
      form.assigned_to = business.currentUser?.email || ''
      form.due_date = ''
      form.reference_doctype = ''
      form.reference_docname = ''
      form.description = ''
    }
  },
  { immediate: true },
)

async function handleSave() {
  if (!form.title.trim()) {
    errorMessage.value = __('Task title is required.')
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    const payload = {
      title: form.title.trim(),
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to,
      due_date: form.due_date || null,
      reference_doctype: form.reference_doctype,
      reference_docname: form.reference_docname,
      description: form.description,
    }

    let savedTask
    if (editMode.value && form.id) {
      savedTask = await business.updateTask(form.id, payload)
    } else {
      savedTask = await business.createTask(payload)
    }

    emit('saved', savedTask)
    show.value = false
  } catch (err: any) {
    console.error('[TaskModal] Save error:', err)
    errorMessage.value = err.message || __('Failed to save task')
  } finally {
    isSaving.value = false
  }
}

function confirmDelete() {
  $dialog({
    title: __('Delete Task'),
    message: __('Are you sure you want to permanently delete "{0}"?', [form.title]),
    actions: [
      {
        label: __('Delete'),
        theme: 'red',
        variant: 'solid',
        async onClick(close: () => void) {
          if (form.id) {
            await business.deleteTask(form.id)
            emit('deleted', form.id)
            show.value = false
          }
          close()
        },
      },
    ],
  })
}
</script>
