-- ============================================================================
-- Migration: 20261028_payment_reminders.sql
-- Description: Automated payment reminders configuration, countdown intervals,
--              overdue schedules, and per-invoice reminder tracking.
-- ============================================================================

-- 1. Extend business_settings with automated reminder configurations
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_days_before TEXT NOT NULL DEFAULT '7, 3, 1',
  ADD COLUMN IF NOT EXISTS reminder_on_due_date BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_overdue_days TEXT NOT NULL DEFAULT '3, 7',
  ADD COLUMN IF NOT EXISTS cron_secret_token TEXT NOT NULL DEFAULT 'cr_rem_live_secret';

-- 2. Extend invoices table with per-invoice reminder overrides & audit logs
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_reminder_days TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_overdue_days TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminders_sent_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Index for performance querying unsettled invoices during cron runs
CREATE INDEX IF NOT EXISTS idx_invoices_reminders_unsettled
  ON public.invoices (status, due_date, balance_due)
  WHERE balance_due > 0;
