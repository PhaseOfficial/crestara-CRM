/**
 * Crestara CRM - Tasks Endpoints & Data Adapter Service
 * Decouples the Tasks module from Frappe Python backend into native
 * Supabase PostgreSQL with local storage caching for offline resilience.
 *
 * Provides bidirectional compatibility with Frappe UI's <KanbanView> and <TasksListView>.
 */

import { supabase } from '@/utils/supabase'

export interface CrmTask {
  id: string
  name: string // Alias for id to preserve existing Frappe component expectations
  title: string
  description?: string
  status: 'Backlog' | 'Todo' | 'In Progress' | 'Done' | 'Completed' | 'Canceled' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  due_date?: string | null
  reference_doctype?: string
  reference_docname?: string
  reference_id?: string | null
  assigned_to?: string
  owner?: string
  created_by?: string | null
  completed_at?: string | null
  created_at?: string
  updated_at?: string
  modified?: string // Alias for updated_at / created_at
  creation?: string // Alias for created_at
  _liked_by?: string
  [key: string]: any
}

export interface TaskFilterParams {
  status?: string | null
  priority?: string | null
  assigned_to?: string | null
  search?: string | null
  due_date?: string | null
  order_by?: string | null
  limit?: number
  offset?: number
}

export const TASKS_STORAGE_KEY = 'crestara_tasks'
export const DELETED_TASKS_KEY = 'crestara_deleted_tasks'

export const DEFAULT_KANBAN_COLUMNS = [
  { name: 'Backlog', label: 'Backlog', color: 'gray' },
  { name: 'Todo', label: 'Todo', color: 'blue' },
  { name: 'In Progress', label: 'In Progress', color: 'yellow' },
  { name: 'Done', label: 'Done', color: 'green' },
  { name: 'Canceled', label: 'Canceled', color: 'red' },
]

export const DEFAULT_LIST_COLUMNS = [
  { label: 'Title', key: 'title', type: 'Data', width: '260px' },
  { label: 'Status', key: 'status', type: 'Select', width: '130px' },
  { label: 'Priority', key: 'priority', type: 'Select', width: '120px' },
  { label: 'Assigned To', key: 'assigned_to', type: 'Link', width: '160px' },
  { label: 'Due Date', key: 'due_date', type: 'Datetime', width: '170px' },
  { label: 'Reference', key: 'reference_docname', type: 'Dynamic Link', width: '140px' },
  { label: 'Modified', key: 'modified', type: 'Datetime', width: '130px', align: 'right' },
]

export const DEFAULT_TASK_ROWS = [
  'title',
  'status',
  'priority',
  'assigned_to',
  'due_date',
  'reference_doctype',
  'reference_docname',
  'modified',
  'creation',
  'description',
]

// ============================================================================
// UUID & IDENTIFIER UTILITIES
// ============================================================================

export function isUuid(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim())
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================================
// LOCAL STORAGE CACHE HELPERS
// ============================================================================

export function getDeletedTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_TASKS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function recordDeletedTaskId(id: string): void {
  try {
    const set = getDeletedTaskIds()
    set.add(id)
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(Array.from(set)))
  } catch (e) {
    console.warn('[Tasks] Failed to record deleted task ID:', e)
  }
}

export function loadStoredTasks(): CrmTask[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const deletedIds = getDeletedTaskIds()
    return parsed
      .filter((item) => item && !deletedIds.has(String(item.id || item.name)))
      .map(normalizeTask)
  } catch {
    return []
  }
}

export function saveStoredTasks(tasks: CrmTask[]): void {
  try {
    const deletedIds = getDeletedTaskIds()
    const validTasks = tasks.filter((t) => t && !deletedIds.has(t.id))
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(validTasks))
  } catch (e) {
    console.warn('[Tasks] Failed to save local tasks cache:', e)
  }
}

// ============================================================================
// DATA NORMALIZATION
// ============================================================================

export function normalizeTask(row: any): CrmTask {
  const id = String(row.id || row.name || generateUuid())
  const now = new Date().toISOString()
  const created_at = row.created_at || row.creation || now
  const updated_at = row.updated_at || row.modified || created_at

  // Standardize status aliases
  let status = row.status || 'Backlog'
  if (status === 'Completed') status = 'Done'
  if (status === 'Cancelled') status = 'Canceled'

  let priority = row.priority || 'Low'
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(priority)) {
    priority = 'Low'
  }

  // Parse due date cleanly
  let dueDate: string | null = null
  if (row.due_date) {
    try {
      const d = new Date(row.due_date)
      if (!isNaN(d.getTime())) {
        dueDate = d.toISOString()
      }
    } catch {}
  }

  return {
    ...row,
    id,
    name: id,
    title: row.title || 'Untitled Task',
    description: row.description || '',
    status,
    priority,
    due_date: dueDate,
    reference_doctype: row.reference_doctype || '',
    reference_docname: row.reference_docname || row.reference_title || '',
    reference_id: row.reference_id || null,
    assigned_to: row.assigned_to || '',
    owner: row.owner || row.created_by || '',
    created_by: row.created_by || null,
    completed_at: row.completed_at || (status === 'Done' ? updated_at : null),
    created_at,
    updated_at,
    modified: updated_at,
    creation: created_at,
    _liked_by: row._liked_by || '[]',
  }
}

// ============================================================================
// KANBAN & LIST SHAPERS (Exact Schema Expected by KanbanView & TasksListView)
// ============================================================================

export function buildKanbanViewData(
  tasks: CrmTask[],
  customColumns = DEFAULT_KANBAN_COLUMNS,
) {
  const columnMap: Record<string, CrmTask[]> = {}
  customColumns.forEach((col) => {
    columnMap[col.name] = []
  })

  tasks.forEach((task) => {
    const colName = task.status || 'Backlog'
    if (columnMap[colName]) {
      columnMap[colName].push(task)
    } else {
      if (!columnMap['Backlog']) columnMap['Backlog'] = []
      columnMap['Backlog'].push(task)
    }
  })

  const kanbanColumns = customColumns.map((col) => ({
    column: {
      name: col.name,
      label: col.label,
      color: col.color,
    },
    data: columnMap[col.name] || [],
  }))

  return {
    view_type: 'kanban',
    column_field: 'status',
    title_field: 'title',
    columns: DEFAULT_LIST_COLUMNS,
    fields: DEFAULT_LIST_COLUMNS,
    rows: DEFAULT_TASK_ROWS,
    data: kanbanColumns,
    total_count: tasks.length,
    row_count: tasks.length,
    page_length_count: tasks.length,
  }
}

export function buildListViewData(
  tasks: CrmTask[],
  options: {
    pageLength?: number
    pageCount?: number
    totalCount?: number
  } = {},
) {
  const limit = options.pageLength || 20
  const page = options.pageCount || 1

  return {
    view_type: 'list',
    columns: DEFAULT_LIST_COLUMNS,
    rows: DEFAULT_TASK_ROWS,
    data: tasks,
    row_count: tasks.length,
    total_count: options.totalCount !== undefined ? options.totalCount : tasks.length,
    page_length: limit,
    page_length_count: limit * page,
  }
}

// ============================================================================
// SUPABASE OPERATIONS & MERGED LOCAL CACHE SYNCHRONIZATION
// ============================================================================

export async function fetchTasks(params: TaskFilterParams = {}): Promise<CrmTask[]> {
  const localTasks = loadStoredTasks()
  const deletedIds = getDeletedTaskIds()

  try {
    let query = supabase.from('tasks').select('*')

    if (params.status && params.status !== 'All') {
      let s = params.status
      if (s === 'Done') query = query.in('status', ['Done', 'Completed'])
      else if (s === 'Canceled') query = query.in('status', ['Canceled', 'Cancelled'])
      else query = query.eq('status', s)
    }

    if (params.priority && params.priority !== 'All') {
      query = query.eq('priority', params.priority)
    }

    if (params.assigned_to) {
      query = query.eq('assigned_to', params.assigned_to)
    }

    if (params.search) {
      const term = `%${params.search.trim()}%`
      query = query.or(`title.ilike.${term},description.ilike.${term}`)
    }

    if (params.order_by) {
      const [col, dir] = params.order_by.split(' ')
      query = query.order(col, { ascending: dir?.toLowerCase() === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[Tasks] Supabase query returned error, using local fallback:', error.message)
      return filterLocalTasks(localTasks, params)
    }

    if (Array.isArray(data)) {
      const remoteTasks = data
        .map(normalizeTask)
        .filter((t) => !deletedIds.has(t.id))

      // Resilient Merge Strategy:
      // Never wipe locally created tasks if Supabase returns empty or hasn't synced them yet.
      const remoteIdSet = new Set(remoteTasks.map((t) => t.id))
      const localUnsynced = localTasks.filter((t) => !remoteIdSet.has(t.id) && !deletedIds.has(t.id))

      const merged = [...remoteTasks, ...localUnsynced]
      saveStoredTasks(merged)
      return filterLocalTasks(merged, params)
    }
  } catch (err) {
    console.warn('[Tasks] Supabase connection failed, using local storage fallback:', err)
  }

  return filterLocalTasks(localTasks, params)
}

function filterLocalTasks(tasks: CrmTask[], params: TaskFilterParams): CrmTask[] {
  return tasks.filter((task) => {
    if (params.status && params.status !== 'All') {
      let target = params.status
      if (target === 'Completed') target = 'Done'
      if (target === 'Cancelled') target = 'Canceled'
      if (task.status !== target) return false
    }

    if (params.priority && params.priority !== 'All' && task.priority !== params.priority) {
      return false
    }

    if (params.assigned_to && task.assigned_to !== params.assigned_to) {
      return false
    }

    if (params.search) {
      const q = params.search.toLowerCase()
      const title = (task.title || '').toLowerCase()
      const desc = (task.description || '').toLowerCase()
      if (!title.includes(q) && !desc.includes(q)) return false
    }

    return true
  })
}

export async function createTask(taskData: Partial<CrmTask>): Promise<CrmTask> {
  const finalId = (taskData.id && isUuid(taskData.id)) ? taskData.id : generateUuid()
  const now = new Date().toISOString()

  const normalized = normalizeTask({
    ...taskData,
    id: finalId,
    name: finalId,
    created_at: now,
    updated_at: now,
  })

  // 1. Optimistic instant local storage cache update
  const localList = loadStoredTasks()
  const existingIdx = localList.findIndex((t) => t.id === normalized.id)
  if (existingIdx !== -1) {
    localList[existingIdx] = normalized
  } else {
    localList.unshift(normalized)
  }
  saveStoredTasks(localList)

  // 2. Persist to Supabase
  try {
    const fullPayload: Record<string, any> = {
      title: normalized.title,
      description: normalized.description || '',
      status: normalized.status,
      priority: normalized.priority,
      due_date: normalized.due_date || null,
      reference_doctype: normalized.reference_doctype || '',
      reference_docname: normalized.reference_docname || '',
      assigned_to: normalized.assigned_to || '',
      owner: normalized.owner || '',
      completed_at: normalized.completed_at || null,
      created_at: normalized.created_at,
      updated_at: normalized.updated_at,
    }

    // Only set id if it is a valid UUID
    if (isUuid(normalized.id)) {
      fullPayload.id = normalized.id
    }

    // Only set reference_id if valid UUID
    if (normalized.reference_id && isUuid(normalized.reference_id)) {
      fullPayload.reference_id = normalized.reference_id
    }

    // Try full insert first
    const { data, error } = await supabase.from('tasks').insert([fullPayload]).select().single()

    if (error) {
      console.warn('[Tasks] Supabase full insert failed, trying minimal safe payload:', error.message)

      // Fallback payload with only core columns in case table was created from an older schema
      const safePayload: Record<string, any> = {
        title: normalized.title,
        description: normalized.description || '',
        status: normalized.status,
        priority: normalized.priority,
        due_date: normalized.due_date || null,
      }
      if (isUuid(normalized.id)) {
        safePayload.id = normalized.id
      }
      if (normalized.assigned_to && isUuid(normalized.assigned_to)) {
        safePayload.assigned_to = normalized.assigned_to
      }

      const retry = await supabase.from('tasks').insert([safePayload]).select().single()

      if (retry.error) {
        console.warn('[Tasks] Fallback insert failed, task safely retained locally:', retry.error.message)
        return normalized
      }

      if (retry.data) {
        const saved = normalizeTask(retry.data)
        const updatedList = loadStoredTasks().map((t) => (t.id === normalized.id ? { ...normalized, ...saved } : t))
        saveStoredTasks(updatedList)
        return { ...normalized, ...saved }
      }
    }

    if (data) {
      const saved = normalizeTask(data)
      const updatedList = loadStoredTasks().map((t) => (t.id === normalized.id ? saved : t))
      saveStoredTasks(updatedList)
      return saved
    }
  } catch (err) {
    console.warn('[Tasks] Supabase insert failed, task safely cached locally:', err)
  }

  return normalized
}

export async function updateTask(id: string, updates: Partial<CrmTask>): Promise<CrmTask> {
  const localList = loadStoredTasks()
  const existingIndex = localList.findIndex((t) => t.id === id || t.name === id)
  const existing = existingIndex !== -1 ? localList[existingIndex] : { id }

  const now = new Date().toISOString()
  let status = updates.status || existing.status || 'Backlog'
  if (status === 'Completed') status = 'Done'
  if (status === 'Cancelled') status = 'Canceled'

  let completed_at = updates.completed_at !== undefined ? updates.completed_at : existing.completed_at
  if (status === 'Done' && !completed_at) {
    completed_at = now
  } else if (status !== 'Done') {
    completed_at = null
  }

  const updated: CrmTask = normalizeTask({
    ...existing,
    ...updates,
    status,
    completed_at,
    updated_at: now,
    modified: now,
  })

  // 1. Update local cache immediately
  if (existingIndex !== -1) {
    localList[existingIndex] = updated
  } else {
    localList.unshift(updated)
  }
  saveStoredTasks(localList)

  // 2. Persist to Supabase
  try {
    const fullPayload: Record<string, any> = {
      title: updated.title,
      description: updated.description || '',
      status: updated.status,
      priority: updated.priority,
      due_date: updated.due_date || null,
      reference_doctype: updated.reference_doctype || '',
      reference_docname: updated.reference_docname || '',
      assigned_to: updated.assigned_to || '',
      owner: updated.owner || '',
      completed_at: updated.completed_at,
      updated_at: now,
    }

    if (updated.reference_id && isUuid(updated.reference_id)) {
      fullPayload.reference_id = updated.reference_id
    }

    const { error } = await supabase.from('tasks').update(fullPayload).eq('id', id)

    if (error) {
      console.warn('[Tasks] Supabase full update failed, trying minimal safe payload:', error.message)
      const safePayload = {
        title: updated.title,
        description: updated.description || '',
        status: updated.status,
        priority: updated.priority,
        due_date: updated.due_date || null,
        completed_at: updated.completed_at,
        updated_at: now,
      }
      await supabase.from('tasks').update(safePayload).eq('id', id)
    }
  } catch (err) {
    console.warn('[Tasks] Supabase update failed, saved locally:', err)
  }

  return updated
}

export async function updateTaskColumn(taskNameOrId: string, toColumn: string): Promise<CrmTask> {
  return updateTask(taskNameOrId, { status: toColumn as any })
}

export async function deleteTask(id: string): Promise<boolean> {
  // 1. Mark as deleted and remove from local cache
  recordDeletedTaskId(id)
  const localList = loadStoredTasks().filter((t) => t.id !== id && t.name !== id)
  saveStoredTasks(localList)

  // 2. Remove from Supabase
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      console.warn('[Tasks] Supabase delete warning:', error.message)
    }
    return true
  } catch (err) {
    console.warn('[Tasks] Supabase delete failed, deleted from cache:', err)
    return true
  }
}

export async function bulkUpdateTasks(ids: string[], updates: Partial<CrmTask>): Promise<boolean> {
  const idSet = new Set(ids)
  const localList = loadStoredTasks().map((t) => {
    if (idSet.has(t.id) || idSet.has(t.name)) {
      return normalizeTask({ ...t, ...updates, updated_at: new Date().toISOString() })
    }
    return t
  })
  saveStoredTasks(localList)

  try {
    await Promise.all(ids.map((id) => updateTask(id, updates)))
    return true
  } catch (e) {
    console.warn('[Tasks] Bulk update completed locally with network warning:', e)
    return true
  }
}

export async function bulkDeleteTasks(ids: string[]): Promise<boolean> {
  const idSet = new Set(ids)
  ids.forEach((id) => recordDeletedTaskId(id))
  const localList = loadStoredTasks().filter((t) => !idSet.has(t.id) && !idSet.has(t.name))
  saveStoredTasks(localList)

  try {
    await Promise.all(ids.map((id) => deleteTask(id)))
    return true
  } catch (e) {
    console.warn('[Tasks] Bulk delete completed locally with network warning:', e)
    return true
  }
}
