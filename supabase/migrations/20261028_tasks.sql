-- ============================================================================
-- Migration: Tasks Table & Schema Alignment for Crestara CRM
-- Date: 2026-10-28
-- Description: Decouples the Tasks module from Frappe Python backend into native
--              Supabase PostgreSQL. Safely handles both clean instances and existing
--              databases created from schema.sql.
-- ============================================================================

-- 1. Create Tasks Table (if not existing)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Backlog',
  priority TEXT NOT NULL DEFAULT 'Low',
  due_date TIMESTAMPTZ,
  reference_doctype TEXT DEFAULT '',
  reference_docname TEXT DEFAULT '',
  reference_id TEXT,
  assigned_to TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  created_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Safely add columns if the table was originally created from schema.sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reference_doctype TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reference_docname TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Relax foreign keys and constraints so both emails and profile UUIDs work seamlessly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_assigned_to_fkey' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_assigned_to_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_created_by_fkey' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks DROP CONSTRAINT tasks_created_by_fkey;
  END IF;
END $$;

-- Ensure column types are compatible with text strings (emails, document references)
ALTER TABLE public.tasks ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;
ALTER TABLE public.tasks ALTER COLUMN assigned_to DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;

-- 4. Check constraints for status and priority
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('Backlog', 'Todo', 'In Progress', 'Done', 'Completed', 'Canceled', 'Cancelled'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'));

-- 5. Indexes for fast lookups, filtering, and Kanban Board sorting
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON public.tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_reference ON public.tasks(reference_doctype, reference_docname);

-- 6. Row-Level Security (RLS) Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to tasks" ON public.tasks;
CREATE POLICY "Allow authenticated full access to tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read tasks" ON public.tasks;
CREATE POLICY "Allow anon read tasks"
  ON public.tasks FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anon all tasks" ON public.tasks;
CREATE POLICY "Allow anon all tasks"
  ON public.tasks FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
