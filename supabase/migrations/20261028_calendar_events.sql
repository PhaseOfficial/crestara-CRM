-- ============================================================================
-- Migration: Calendar Events Table & Business Settings Integration
-- Date: 2026-10-28
-- Description: Decouple Frappe Event doctype to a native Supabase events table
--              with JSONB participants & notifications, plus calendar preferences.
-- ============================================================================

-- 1. Create Calendar Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  description TEXT DEFAULT '',
  starts_on TIMESTAMPTZ NOT NULL,
  ends_on TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT NOT NULL DEFAULT 'Public' CHECK (event_type IN ('Public', 'Private')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Completed', 'Cancelled')),
  location TEXT DEFAULT '',
  color TEXT DEFAULT '#30A66D',
  attending TEXT DEFAULT 'Yes' CHECK (attending IN ('Yes', 'No', 'Maybe', 'Awaiting')),
  reference_doctype TEXT DEFAULT '',
  reference_docname TEXT DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  event_participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  notifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Indexes for Range Queries and Lookups
CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events(starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events(owner);
CREATE INDEX IF NOT EXISTS idx_events_ref ON public.events(reference_doctype, reference_docname);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

-- 3. Row-Level Security (RLS) Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to events" ON public.events;
CREATE POLICY "Allow authenticated full access to events"
  ON public.events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read events" ON public.events;
CREATE POLICY "Allow anon read events"
  ON public.events FOR SELECT
  TO anon
  USING (true);

-- 4. Calendar Settings in Business Settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS default_calendar_view TEXT DEFAULT 'Weekly',
  ADD COLUMN IF NOT EXISTS calendar_notifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS calendar_allday_notifications JSONB DEFAULT '[]'::jsonb;
