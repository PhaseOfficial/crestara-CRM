<template>
  <LayoutHeader>
    <template #left-header>
      <ViewBreadcrumbs v-model="viewControls" routeName="Tasks" />
    </template>
    <template #right-header>
      <CustomActions
        v-if="tasksListView?.customListActions"
        :actions="tasksListView.customListActions"
      />
      <Button
        variant="solid"
        :label="__('Create')"
        iconLeft="lucide-plus"
        @click="createTask"
      />
    </template>
  </LayoutHeader>

  <!-- Filter & Control Toolbar (Preserving Exact Frappe CRM UX Layout) -->
  <div class="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-outline-gray-1 bg-surface-base">
    <!-- Left: Quick Filters -->
    <div class="flex items-center gap-2 flex-1 overflow-x-auto">
      <!-- Status Filter Dropdown -->
      <Dropdown :options="statusFilterOptions">
        <template #default="{ open }">
          <Button
            variant="outline"
            size="sm"
            class="text-xs"
            :label="selectedStatusLabel"
            :iconRight="open ? 'lucide-chevron-up' : 'lucide-chevron-down'"
          >
            <template #prefix>
              <TaskStatusIcon v-if="selectedStatus !== 'All'" :status="selectedStatus" class="size-3.5" />
            </template>
          </Button>
        </template>
      </Dropdown>

      <!-- Priority Filter Dropdown -->
      <Dropdown :options="priorityFilterOptions">
        <template #default="{ open }">
          <Button
            variant="outline"
            size="sm"
            class="text-xs"
            :label="selectedPriorityLabel"
            :iconRight="open ? 'lucide-chevron-up' : 'lucide-chevron-down'"
          >
            <template #prefix>
              <TaskPriorityIcon v-if="selectedPriority !== 'All'" :priority="selectedPriority" class="size-3" />
            </template>
          </Button>
        </template>
      </Dropdown>

      <!-- Staff Assignee Filter -->
      <Dropdown :options="staffFilterOptions">
        <template #default="{ open }">
          <Button
            variant="outline"
            size="sm"
            class="text-xs"
            :label="selectedStaffLabel"
            :iconRight="open ? 'lucide-chevron-up' : 'lucide-chevron-down'"
          >
            <template #prefix>
              <UserAvatar v-if="selectedStaff" :user="selectedStaff" size="xs" class="!size-4" />
            </template>
          </Button>
        </template>
      </Dropdown>

      <!-- Search Box -->
      <div class="relative min-w-40 max-w-64">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="__('Search tasks...')"
          class="w-full h-7 pl-7 pr-2 text-xs rounded border border-outline-gray-2 bg-surface-base text-ink-gray-9 placeholder-ink-gray-4 focus:border-outline-gray-4 focus:outline-none"
        />
        <span class="absolute left-2 top-1.5 text-ink-gray-4">
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
      </div>
    </div>

    <!-- Right: Refresh & Sort Actions -->
    <div class="flex items-center gap-2 shrink-0">
      <Dropdown :options="sortOptions">
        <template #default="{ open }">
          <Button
            variant="ghost"
            size="sm"
            :tooltip="__('Sort By')"
            icon="lucide-arrow-up-down"
            class="hover:bg-surface-gray-2"
          />
        </template>
      </Dropdown>

      <Button
        variant="ghost"
        size="sm"
        :tooltip="__('Refresh')"
        icon="lucide-refresh-ccw"
        :loading="isLoading"
        class="hover:bg-surface-gray-2"
        @click="loadTasks"
      />
    </div>
  </div>

  <!-- 1. KANBAN BOARD VIEW -->
  <KanbanView
    v-if="isKanban"
    v-model="tasks"
    :options="{
      onClick: (row) => showTask(row.name),
      onNewClick: (column) => createTask(column),
    }"
    @update="handleKanbanUpdate"
  >
    <template #title="{ titleField, itemName }">
      <div class="flex items-center gap-2">
        <div v-if="titleField === 'status'">
          <TaskStatusIcon :status="getRow(itemName, titleField).label" />
        </div>
        <div v-else-if="titleField === 'priority'">
          <TaskPriorityIcon :priority="getRow(itemName, titleField).label" />
        </div>
        <div v-else-if="titleField === 'assigned_to'">
          <Avatar
            v-if="getRow(itemName, titleField).full_name"
            class="flex items-center"
            :image="getRow(itemName, titleField).user_image"
            :label="getRow(itemName, titleField).full_name"
            size="sm"
          />
        </div>
        <div
          v-if="['modified', 'creation'].includes(titleField)"
          class="truncate text-base"
        >
          <Tooltip :text="getRow(itemName, titleField).label">
            <div>{{ getRow(itemName, titleField).timeAgo }}</div>
          </Tooltip>
        </div>
        <div
          v-else-if="getRow(itemName, titleField).label"
          class="truncate text-base"
        >
          {{ getRow(itemName, titleField).label }}
        </div>
        <div v-else class="text-ink-gray-4">{{ __('No Title') }}</div>
      </div>
    </template>
    <template #fields="{ fieldName, itemName }">
      <div
        v-if="getRow(itemName, fieldName).label"
        class="truncate flex items-center gap-2"
      >
        <div v-if="fieldName === 'status'">
          <TaskStatusIcon
            class="size-3"
            :status="getRow(itemName, fieldName).label"
          />
        </div>
        <div v-else-if="fieldName === 'priority'">
          <TaskPriorityIcon :priority="getRow(itemName, fieldName).label" />
        </div>
        <div v-else-if="fieldName === 'assigned_to'">
          <Avatar
            v-if="getRow(itemName, fieldName).full_name"
            class="flex items-center"
            :image="getRow(itemName, fieldName).user_image"
            :label="getRow(itemName, fieldName).full_name"
            size="sm"
          />
        </div>
        <div
          v-if="['modified', 'creation'].includes(fieldName)"
          class="truncate text-base"
        >
          <Tooltip :text="getRow(itemName, fieldName).label">
            <div>{{ getRow(itemName, fieldName).timeAgo }}</div>
          </Tooltip>
        </div>
        <div
          v-else-if="fieldName == 'description'"
          class="truncate text-base max-h-44"
        >
          <TextEditor
            v-if="getRow(itemName, fieldName).label"
            :content="getRow(itemName, fieldName).label"
            :editable="false"
            editor-class="!prose-sm max-w-none focus:outline-none"
            class="flex-1 overflow-hidden"
          />
        </div>
        <div v-else class="truncate text-base">
          {{ getRow(itemName, fieldName).label }}
        </div>
      </div>
    </template>
    <template #actions="{ itemName }">
      <div class="flex gap-2 items-center justify-between">
        <div>
          <Button
            v-if="getRow(itemName, 'reference_docname').label"
            class="-ml-2"
            variant="ghost"
            size="sm"
            :label="
              getRow(itemName, 'reference_doctype').label == 'CRM Deal'
                ? __('Deal')
                : getRow(itemName, 'reference_doctype').label == 'CRM Lead'
                ? __('Lead')
                : __('Reference')
            "
            :iconRight="ArrowUpRightIcon"
            @click.stop="
              redirect(
                getRow(itemName, 'reference_doctype').label,
                getRow(itemName, 'reference_docname').label,
              )
            "
          />
        </div>
        <Dropdown
          class="flex items-center gap-2"
          :options="actions(itemName)"
          variant="ghost"
          @click.stop.prevent
        >
          <Button icon="lucide-more-horizontal" variant="ghost" />
        </Dropdown>
      </div>
    </template>
  </KanbanView>

  <!-- 2. LIST VIEW -->
  <TasksListView
    v-else-if="!isKanban && rows.length"
    ref="tasksListView"
    v-model="tasks.data.page_length_count"
    v-model:list="tasks"
    :rows="rows"
    :columns="columns"
    :options="{
      showTooltip: false,
      resizeColumn: true,
      rowCount: tasks.data.row_count,
      totalCount: tasks.data.total_count,
    }"
    @loadMore="handleLoadMore"
    @columnWidthUpdated="handleColumnWidthUpdated"
    @updatePageCount="handleUpdatePageCount"
    @showTask="showTask"
    @applyLikeFilter="handleApplyLikeFilter"
    @likeDoc="handleLikeDoc"
  />

  <!-- 3. EMPTY STATE (List View only) -->
  <EmptyState
    v-else-if="!isKanban && !rows.length && !isLoading"
    name="Tasks"
    :icon="Email2Icon"
  />

  <!-- Native Task Modal (Preserving Exact DoctypeModal UI & UX) -->
  <TaskModal
    v-model="showTaskModal"
    :task="selectedTask"
    :default-status="defaultTaskStatus"
    @saved="handleTaskSaved"
    @deleted="handleTaskDeleted"
  />
</template>

<script setup lang="ts">
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import CustomActions from '@/components/CustomActions.vue'
import ArrowUpRightIcon from '@/components/Icons/ArrowUpRightIcon.vue'
import TaskStatusIcon from '@/components/Icons/TaskStatusIcon.vue'
import TaskPriorityIcon from '@/components/Icons/TaskPriorityIcon.vue'
import Email2Icon from '@/components/Icons/Email2Icon.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import TasksListView from '@/components/ListViews/TasksListView.vue'
import EmptyState from '@/components/ListViews/EmptyState.vue'
import KanbanView from '@/components/Kanban/KanbanView.vue'
import TaskModal from '@/components/Tasks/TaskModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { usersStore } from '@/stores/users'
import { useBusinessStore } from '@/stores/business'
import {
  buildKanbanViewData,
  buildListViewData,
  DEFAULT_LIST_COLUMNS,
  DEFAULT_TASK_ROWS,
  CrmTask,
} from '@/utils/taskEndpoints'
import { formatDate } from '@/utils'
import { timestampCell } from '@/composables/useTimelinePreferences'
import { Tooltip, Avatar, TextEditor, Dropdown, Button } from 'frappe-ui'
import { computed, ref, reactive, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const business = useBusinessStore()
const { getUser } = usersStore()

const tasksListView = ref<any>(null)
const isLoading = ref(false)

// Modals
const showTaskModal = ref(false)
const selectedTask = ref<any>(null)
const defaultTaskStatus = ref('Backlog')

// Filter states
const selectedStatus = ref('All')
const selectedPriority = ref('All')
const selectedStaff = ref('')
const searchQuery = ref('')
const sortBy = ref('created_at desc')

// Current View Type (defaults to Kanban or List based on route)
const isKanban = computed(() => {
  const vt = route.params.viewType
  return vt !== 'list'
})

// Navigation & ViewBreadcrumbs integration
const viewControls = computed(() => ({
  currentView: {
    name: isKanban.value ? 'kanban' : 'list',
    label: isKanban.value ? __('Kanban') : __('List'),
    icon: isKanban.value ? 'kanban' : 'list',
  },
  viewsDropdownOptions: [
    {
      label: __('Kanban'),
      icon: 'lucide-kanban',
      onClick: () => router.push({ name: 'Tasks', params: { viewType: 'kanban' } }),
    },
    {
      label: __('List'),
      icon: 'lucide-list',
      onClick: () => router.push({ name: 'Tasks', params: { viewType: 'list' } }),
    },
  ],
}))

// Filter Options
const selectedStatusLabel = computed(() => {
  return selectedStatus.value === 'All' ? __('Status: All') : __('Status: {0}', [selectedStatus.value])
})

const statusFilterOptions = [
  { label: __('All Statuses'), onClick: () => { selectedStatus.value = 'All'; loadTasks() } },
  { label: __('Backlog'), onClick: () => { selectedStatus.value = 'Backlog'; loadTasks() } },
  { label: __('Todo'), onClick: () => { selectedStatus.value = 'Todo'; loadTasks() } },
  { label: __('In Progress'), onClick: () => { selectedStatus.value = 'In Progress'; loadTasks() } },
  { label: __('Done'), onClick: () => { selectedStatus.value = 'Done'; loadTasks() } },
  { label: __('Canceled'), onClick: () => { selectedStatus.value = 'Canceled'; loadTasks() } },
]

const selectedPriorityLabel = computed(() => {
  return selectedPriority.value === 'All' ? __('Priority: All') : __('Priority: {0}', [selectedPriority.value])
})

const priorityFilterOptions = [
  { label: __('All Priorities'), onClick: () => { selectedPriority.value = 'All'; loadTasks() } },
  { label: __('Urgent'), onClick: () => { selectedPriority.value = 'Urgent'; loadTasks() } },
  { label: __('High'), onClick: () => { selectedPriority.value = 'High'; loadTasks() } },
  { label: __('Medium'), onClick: () => { selectedPriority.value = 'Medium'; loadTasks() } },
  { label: __('Low'), onClick: () => { selectedPriority.value = 'Low'; loadTasks() } },
]

const selectedStaffLabel = computed(() => {
  if (!selectedStaff.value) return __('Assignee: All')
  const u = (business.users || []).find((usr: any) => usr.email === selectedStaff.value || usr.id === selectedStaff.value)
  return u ? u.full_name || u.email : selectedStaff.value
})

const staffFilterOptions = computed(() => [
  { label: __('All Assignees'), onClick: () => { selectedStaff.value = ''; loadTasks() } },
  ...(business.users || []).map((u: any) => ({
    label: u.full_name || u.email,
    onClick: () => { selectedStaff.value = u.email || u.id; loadTasks() },
  })),
])

const sortOptions = [
  { label: __('Newest First'), onClick: () => { sortBy.value = 'created_at desc'; loadTasks() } },
  { label: __('Oldest First'), onClick: () => { sortBy.value = 'created_at asc'; loadTasks() } },
  { label: __('Priority'), onClick: () => { sortBy.value = 'priority desc'; loadTasks() } },
  { label: __('Title (A-Z)'), onClick: () => { sortBy.value = 'title asc'; loadTasks() } },
]

// Tasks state shaped for KanbanView & TasksListView
const tasks = ref<any>({
  data: {
    view_type: 'kanban',
    data: [],
    columns: DEFAULT_LIST_COLUMNS,
    rows: DEFAULT_TASK_ROWS,
    row_count: 0,
    total_count: 0,
    page_length_count: 20,
  },
  reload: loadTasks,
})

async function loadTasks() {
  isLoading.value = true
  try {
    const list = await business.fetchTasksFromSupabase({
      status: selectedStatus.value,
      priority: selectedPriority.value,
      assigned_to: selectedStaff.value || null,
      search: searchQuery.value || null,
      order_by: sortBy.value,
    })

    if (isKanban.value) {
      tasks.value.data = buildKanbanViewData(list)
    } else {
      tasks.value.data = buildListViewData(list)
    }
  } catch (err) {
    console.error('[Tasks] Load error:', err)
  } finally {
    isLoading.value = false
  }
}

// Watch filters
watch(searchQuery, () => {
  loadTasks()
})

watch(() => route.params.viewType, () => {
  loadTasks()
})

onMounted(() => {
  loadTasks()
})

// Task Rows & Columns Computation
function getRow(name: string, field: string) {
  function getValue(value: any) {
    if (value && typeof value === 'object') {
      return value
    }
    return { label: value }
  }
  const found = rows.value?.find((row: any) => row.name == name)
  return getValue(found ? found[field] : '')
}

const rows = computed(() => {
  if (!tasks.value?.data?.data) return []

  if (tasks.value.data.view_type === 'kanban') {
    return getKanbanRows(tasks.value.data.data, tasks.value.data.fields)
  }

  return parseRows(tasks.value?.data.data, tasks.value?.data.columns)
})

const columns = computed(() => {
  let _columns = tasks.value?.data?.columns || []
  if (_columns.length) {
    _columns = _columns.map((col: any, index: number) => {
      if (index === _columns.length - 1) {
        return { ...col, align: 'right' }
      }
      return col
    })
  }
  return _columns
})

function getKanbanRows(data: any[], columns: any[]) {
  let _rows: any[] = []
  data.forEach((column: any) => {
    column.data?.forEach((row: any) => {
      _rows.push(row)
    })
  })
  return parseRows(_rows, columns)
}

function parseRows(rawRows: any[], cols = []) {
  const view_type = tasks.value.data?.view_type || 'list'
  const key = view_type === 'kanban' ? 'fieldname' : 'key'
  const type = view_type === 'kanban' ? 'fieldtype' : 'type'

  return rawRows.map((task: any) => {
    let _rowObj: Record<string, any> = {}
    const rowKeys = tasks.value?.data?.rows || DEFAULT_TASK_ROWS

    rowKeys.forEach((rowKey: string) => {
      _rowObj[rowKey] = task[rowKey]

      let fieldType = (cols || []).find((c: any) => (c[key] || c.value) == rowKey)?.[type]

      if (
        fieldType &&
        ['Date', 'Datetime'].includes(fieldType) &&
        !['modified', 'creation', 'due_date'].includes(rowKey)
      ) {
        try {
          _rowObj[rowKey] = formatDate(task[rowKey], '', true, fieldType == 'Datetime')
        } catch {
          _rowObj[rowKey] = task[rowKey] || ''
        }
      }

      if (['modified', 'creation'].includes(rowKey)) {
        try {
          _rowObj[rowKey] = timestampCell(task[rowKey])
        } catch {
          _rowObj[rowKey] = {
            label: String(task[rowKey] || ''),
            timeAgo: String(task[rowKey] || ''),
          }
        }
      } else if (rowKey == 'assigned_to') {
        const u = getUser(task.assigned_to)
        _rowObj[rowKey] = {
          label: task.assigned_to && (u?.full_name || task.assigned_to),
          ...(task.assigned_to && u),
        }
      }
    })
    _rowObj.name = task.id || task.name
    return _rowObj
  })
}

// Kanban Interactions
async function handleKanbanUpdate(data: any) {
  if (data?.item && data?.to) {
    await business.updateTaskColumn(data.item, data.to)
    await loadTasks()
  }
}

// Modal Handlers
function showTask(name: string) {
  const found = (business.tasks || []).find((t: any) => t.id === name || t.name === name)
  selectedTask.value = found || { id: name }
  showTaskModal.value = true
}

function createTask(column?: any) {
  selectedTask.value = null
  if (column?.column?.name) {
    defaultTaskStatus.value = column.column.name
  } else {
    defaultTaskStatus.value = 'Backlog'
  }
  showTaskModal.value = true
}

function handleTaskSaved(savedTask?: any) {
  if (savedTask) {
    if (!Array.isArray(business.tasks)) {
      business.tasks = []
    }
    const idx = business.tasks.findIndex(
      (t: any) => t.id === savedTask.id || t.name === savedTask.name,
    )
    if (idx !== -1) {
      business.tasks[idx] = savedTask
    } else {
      business.tasks.unshift(savedTask)
    }

    if (isKanban.value) {
      tasks.value.data = buildKanbanViewData(business.tasks)
    } else {
      tasks.value.data = buildListViewData(business.tasks)
    }
  }
  loadTasks()
}

function handleTaskDeleted(deletedId?: string) {
  if (deletedId) {
    if (Array.isArray(business.tasks)) {
      business.tasks = business.tasks.filter(
        (t: any) => t.id !== deletedId && t.name !== deletedId,
      )
    }
    if (isKanban.value) {
      tasks.value.data = buildKanbanViewData(business.tasks || [])
    } else {
      tasks.value.data = buildListViewData(business.tasks || [])
    }
  }
  loadTasks()
}

// ListView Handlers
function handleLoadMore() {
  tasks.value.data.page_length_count += 20
}

function handleColumnWidthUpdated() {
  // column width preference
}

function handleUpdatePageCount(count: number) {
  tasks.value.data.page_length_count = count
}

function handleApplyLikeFilter() {
  // Toggle liked filter
}

function handleLikeDoc(data: any) {
  // Toggle like
}

function actions(itemName: string) {
  return [
    {
      label: __('Edit'),
      icon: 'lucide-edit-2',
      onClick: () => showTask(itemName),
    },
    {
      label: __('Delete'),
      icon: 'lucide-trash-2',
      onClick: async () => {
        await business.deleteTask(itemName)
        await loadTasks()
      },
    },
  ]
}

function redirect(doctype: string, docname: string) {
  if (!docname) return
  let name = doctype == 'CRM Deal' ? 'Deal' : doctype == 'CRM Lead' ? 'Lead' : 'Client'
  let params: any = { leadId: docname }
  if (name == 'Deal') params = { dealId: docname }
  else if (name == 'Client') params = { clientId: docname }
  router.push({ name, params })
}
</script>
