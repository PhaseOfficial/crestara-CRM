import { describe, it, expect, beforeEach } from 'vitest'
import {
  isUuid,
  generateUuid,
  normalizeTask,
  buildKanbanViewData,
  buildListViewData,
  loadStoredTasks,
  saveStoredTasks,
  getDeletedTaskIds,
  recordDeletedTaskId,
  DEFAULT_KANBAN_COLUMNS,
  DEFAULT_LIST_COLUMNS,
  DEFAULT_TASK_ROWS,
  TASKS_STORAGE_KEY,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskColumn,
  bulkUpdateTasks,
  bulkDeleteTasks,
} from '@/utils/taskEndpoints'

describe('taskEndpoints Service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('UUID Utilities', () => {
    it('validates UUID format correctly', () => {
      expect(isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
      expect(isUuid('task_12345')).toBe(false)
      expect(isUuid('')).toBe(false)
      expect(isUuid(null)).toBe(false)
    })

    it('generates valid v4 UUIDs', () => {
      const id1 = generateUuid()
      const id2 = generateUuid()
      expect(isUuid(id1)).toBe(true)
      expect(isUuid(id2)).toBe(true)
      expect(id1).not.toBe(id2)
    })
  })

  describe('normalizeTask', () => {
    it('normalizes missing fields with safe defaults and valid UUID', () => {
      const raw = { title: 'Call client' }
      const normalized = normalizeTask(raw)

      expect(normalized.title).toBe('Call client')
      expect(normalized.id).toBeDefined()
      expect(isUuid(normalized.id)).toBe(true)
      expect(normalized.name).toBe(normalized.id)
      expect(normalized.status).toBe('Backlog')
      expect(normalized.priority).toBe('Low')
      expect(normalized.due_date).toBeNull()
      expect(normalized.modified).toBeDefined()
      expect(normalized.creation).toBeDefined()
    })

    it('standardizes status aliases (Completed -> Done, Cancelled -> Canceled)', () => {
      expect(normalizeTask({ status: 'Completed' }).status).toBe('Done')
      expect(normalizeTask({ status: 'Cancelled' }).status).toBe('Canceled')
      expect(normalizeTask({ status: 'Done' }).status).toBe('Done')
      expect(normalizeTask({ status: 'Todo' }).status).toBe('Todo')
    })

    it('sets completed_at automatically when status is Done', () => {
      const task = normalizeTask({ status: 'Done' })
      expect(task.completed_at).toBeDefined()
      expect(typeof task.completed_at).toBe('string')
    })
  })

  describe('buildKanbanViewData', () => {
    it('shapes tasks into the exact structure expected by KanbanView', () => {
      const sampleTasks = [
        normalizeTask({ title: 'Task 1', status: 'Backlog' }),
        normalizeTask({ title: 'Task 2', status: 'Todo' }),
        normalizeTask({ title: 'Task 3', status: 'In Progress' }),
        normalizeTask({ title: 'Task 4', status: 'Done' }),
        normalizeTask({ title: 'Task 5', status: 'Canceled' }),
      ]

      const kanbanData = buildKanbanViewData(sampleTasks)

      expect(kanbanData.view_type).toBe('kanban')
      expect(kanbanData.column_field).toBe('status')
      expect(kanbanData.title_field).toBe('title')
      expect(kanbanData.data).toHaveLength(DEFAULT_KANBAN_COLUMNS.length)

      const backlogCol = kanbanData.data.find((c) => c.column.name === 'Backlog')
      expect(backlogCol?.data).toHaveLength(1)
      expect(backlogCol?.data[0].title).toBe('Task 1')

      const inProgressCol = kanbanData.data.find((c) => c.column.name === 'In Progress')
      expect(inProgressCol?.data).toHaveLength(1)
      expect(inProgressCol?.data[0].title).toBe('Task 3')
    })

    it('routes unknown status tasks to Backlog column', () => {
      const task = normalizeTask({ title: 'Unknown task', status: 'UnknownStatus' })
      const kanbanData = buildKanbanViewData([task])
      const backlogCol = kanbanData.data.find((c) => c.column.name === 'Backlog')
      expect(backlogCol?.data).toHaveLength(1)
    })
  })

  describe('buildListViewData', () => {
    it('shapes tasks into the structure expected by TasksListView', () => {
      const sampleTasks = [
        normalizeTask({ title: 'Task A', priority: 'High' }),
        normalizeTask({ title: 'Task B', priority: 'Low' }),
      ]

      const listData = buildListViewData(sampleTasks, { pageLength: 20 })

      expect(listData.view_type).toBe('list')
      expect(listData.columns).toEqual(DEFAULT_LIST_COLUMNS)
      expect(listData.rows).toEqual(DEFAULT_TASK_ROWS)
      expect(listData.data).toHaveLength(2)
      expect(listData.total_count).toBe(2)
      expect(listData.page_length).toBe(20)
    })
  })

  describe('Local Storage Cache & Synchronization', () => {
    it('saves and loads tasks correctly from localStorage', () => {
      const tasks = [
        normalizeTask({ id: 't-1', title: 'Task One' }),
        normalizeTask({ id: 't-2', title: 'Task Two' }),
      ]

      saveStoredTasks(tasks)
      const loaded = loadStoredTasks()

      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe('t-1')
      expect(loaded[1].title).toBe('Task Two')
    })

    it('returns empty array when cache is empty or corrupt', () => {
      localStorage.setItem(TASKS_STORAGE_KEY, 'invalid-json{')
      expect(loadStoredTasks()).toEqual([])
    })

    it('tracks deleted task IDs and excludes them from cache loading', () => {
      recordDeletedTaskId('deleted-uuid-123')
      const set = getDeletedTaskIds()
      expect(set.has('deleted-uuid-123')).toBe(true)

      const tasks = [
        normalizeTask({ id: 'deleted-uuid-123', title: 'Should be omitted' }),
        normalizeTask({ id: 'valid-uuid-456', title: 'Should stay' }),
      ]
      saveStoredTasks(tasks)
      const loaded = loadStoredTasks()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('valid-uuid-456')
    })
  })

  describe('CRUD & Column Transitions', () => {
    it('createTask adds a task and caches it', async () => {
      const created = await createTask({ title: 'New Sales Call', status: 'Todo' })

      expect(created.title).toBe('New Sales Call')
      expect(created.status).toBe('Todo')
      expect(isUuid(created.id)).toBe(true)

      const stored = loadStoredTasks()
      expect(stored.some((t) => t.id === created.id)).toBe(true)
    })

    it('updateTask modifies properties and adjusts completion timestamp', async () => {
      const task = await createTask({ title: 'Prepare Invoice', status: 'In Progress' })
      expect(task.completed_at).toBeNull()

      const updated = await updateTask(task.id, { status: 'Done' })
      expect(updated.status).toBe('Done')
      expect(updated.completed_at).toBeDefined()

      const reverted = await updateTask(task.id, { status: 'In Progress' })
      expect(reverted.status).toBe('In Progress')
      expect(reverted.completed_at).toBeNull()
    })

    it('updateTaskColumn performs instant status transition for Kanban drag-and-drop', async () => {
      const task = await createTask({ title: 'Review Contract', status: 'Backlog' })
      const moved = await updateTaskColumn(task.id, 'In Progress')

      expect(moved.status).toBe('In Progress')
      const stored = loadStoredTasks().find((t) => t.id === task.id)
      expect(stored?.status).toBe('In Progress')
    })

    it('deleteTask removes task from cache', async () => {
      const task = await createTask({ title: 'Temporary task' })
      expect(loadStoredTasks().some((t) => t.id === task.id)).toBe(true)

      const success = await deleteTask(task.id)
      expect(success).toBe(true)
      expect(loadStoredTasks().some((t) => t.id === task.id)).toBe(false)
    })

    it('bulkUpdateTasks and bulkDeleteTasks work on multiple task IDs', async () => {
      const t1 = await createTask({ title: 'Task 1', status: 'Backlog' })
      const t2 = await createTask({ title: 'Task 2', status: 'Backlog' })

      await bulkUpdateTasks([t1.id, t2.id], { status: 'Done' })
      let stored = loadStoredTasks()
      expect(stored.find((t) => t.id === t1.id)?.status).toBe('Done')
      expect(stored.find((t) => t.id === t2.id)?.status).toBe('Done')

      await bulkDeleteTasks([t1.id, t2.id])
      stored = loadStoredTasks()
      expect(stored.some((t) => t.id === t1.id)).toBe(false)
      expect(stored.some((t) => t.id === t2.id)).toBe(false)
    })
  })
})
