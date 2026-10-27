-- ============================================================================
-- Migration: 20261027_payments_and_email.sql
-- Description: Dedicated payments ledger table, sequential receipt numbers,
--              and email/SMTP delivery settings.
-- ============================================================================

-- 1. Extend Business Settings for Receipts & SMTP Configuration
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS receipt_prefix TEXT NOT NULL DEFAULT 'RCP-2026-',
  ADD COLUMN IF NOT EXISTS next_receipt_number INTEGER NOT NULL DEFAULT 1001,
  ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS smtp_host TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 465,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_from_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_from_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_encryption TEXT DEFAULT 'SSL';

-- 2. Dedicated Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT DEFAULT '',
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'Bank Wire Transfer',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Settled', 'Pending', 'Failed', 'Refunded')) DEFAULT 'Settled',
  transaction_ref TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);

-- 3. Atomic Receipt Number Generator RPC Function
CREATE OR REPLACE FUNCTION public.get_next_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_prefix TEXT;
  current_num INTEGER;
  full_receipt_number TEXT;
BEGIN
  SELECT receipt_prefix, next_receipt_number
  INTO current_prefix, current_num
  FROM public.business_settings
  WHERE id = 'default'
  FOR UPDATE;

  IF current_num IS NULL THEN
    current_prefix := 'RCP-2026-';
    current_num := 1001;
  END IF;

  full_receipt_number := COALESCE(current_prefix, '') || current_num;

  UPDATE public.business_settings
  SET next_receipt_number = current_num + 1,
      updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = 'default';

  RETURN full_receipt_number;
END;
$$;

-- 4. Row-Level Security (RLS) Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Staff and Admins) full CRUD access
DROP POLICY IF EXISTS "Allow authenticated full access to payments" ON public.payments;
CREATE POLICY "Allow authenticated full access to payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users read access (for customer portal receipts and verify links)
DROP POLICY IF EXISTS "Allow anon read payments" ON public.payments;
CREATE POLICY "Allow anon read payments"
  ON public.payments FOR SELECT
  TO anon
  USING (true);
