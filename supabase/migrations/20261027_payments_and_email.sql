-- ============================================================================
-- Migration: 20261027_payments_and_email.sql
-- Description: Dedicated payments ledger table, sequential receipt numbers,
--              self-healing invoice metadata trigger, and email/SMTP delivery settings.
-- ============================================================================

-- 1. Extend Business Settings for Receipts & SMTP / cPanel Configuration
ALTER TABLE public.business_settings
  -- Receipt Sequence Configuration
  ADD COLUMN IF NOT EXISTS receipt_prefix TEXT NOT NULL DEFAULT 'REC-2026-',
  ADD COLUMN IF NOT EXISTS next_receipt_number INTEGER NOT NULL DEFAULT 5001,

  -- Email Sender Identity (used by BusinessSettings.vue and cPanel /api/send_email.php)
  ADD COLUMN IF NOT EXISTS from_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_name TEXT DEFAULT '',

  -- cPanel & SMTP Server-Side Configuration (supporting both naming conventions)
  ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS smtp_host TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 465,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_pass TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_secure TEXT DEFAULT 'ssl',
  ADD COLUMN IF NOT EXISTS smtp_encryption TEXT DEFAULT 'SSL',
  ADD COLUMN IF NOT EXISTS smtp_from_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_from_name TEXT DEFAULT '';

-- Ensure default row exists with initialized values
INSERT INTO public.business_settings (
  id,
  receipt_prefix,
  next_receipt_number,
  from_name,
  from_email
) VALUES (
  'default',
  'REC-2026-',
  5001,
  'Crestara Billing',
  'billing@crestara.com'
) ON CONFLICT (id) DO UPDATE SET
  receipt_prefix = COALESCE(public.business_settings.receipt_prefix, 'REC-2026-'),
  next_receipt_number = COALESCE(public.business_settings.next_receipt_number, 5001);

-- 2. Dedicated Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Auto-populated from parent invoice via trigger if omitted by client
  invoice_number TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT DEFAULT '',
  
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'Bank Wire Transfer',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Settled', 'Pending', 'Failed', 'Refunded')) DEFAULT 'Settled',
  transaction_ref TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_client_email ON public.payments(client_email);

-- 3. Payment Defaults Trigger (Self-Healing from Invoice)
CREATE OR REPLACE FUNCTION public.handle_payments_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If invoice_id is present, populate missing metadata from parent invoice
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT 
      COALESCE(NULLIF(NEW.invoice_number, ''), i.invoice_number),
      COALESCE(NULLIF(NEW.client_name, ''), i.client_name),
      COALESCE(NULLIF(NEW.client_email, ''), i.client_email, ''),
      COALESCE(NEW.customer_id, i.customer_id),
      COALESCE(NULLIF(NEW.currency, ''), i.currency, 'USD')
    INTO 
      NEW.invoice_number,
      NEW.client_name,
      NEW.client_email,
      NEW.customer_id,
      NEW.currency
    FROM public.invoices i
    WHERE i.id = NEW.invoice_id;
  END IF;

  -- Ensure fallback values so empty inserts never fail
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-RECORDED';
  END IF;
  
  IF NEW.client_name IS NULL OR NEW.client_name = '' THEN
    NEW.client_name := 'Valued Client';
  END IF;

  IF NEW.transaction_ref IS NULL OR NEW.transaction_ref = '' THEN
    NEW.transaction_ref := NEW.receipt_number;
  END IF;

  NEW.updated_at := TIMEZONE('utc'::text, NOW());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_defaults ON public.payments;
CREATE TRIGGER trg_payments_defaults
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payments_defaults();

-- 4. Atomic Receipt Number Generator RPC Function
CREATE OR REPLACE FUNCTION public.get_next_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- Handle case where singleton row does not exist yet
  IF NOT FOUND THEN
    INSERT INTO public.business_settings (id, receipt_prefix, next_receipt_number)
    VALUES ('default', 'REC-2026-', 5001)
    RETURNING receipt_prefix, next_receipt_number
    INTO current_prefix, current_num;
  END IF;

  -- Handle NULL column values safely
  IF current_num IS NULL THEN
    current_num := 5001;
  END IF;
  IF current_prefix IS NULL THEN
    current_prefix := 'REC-2026-';
  END IF;

  full_receipt_number := current_prefix || current_num;

  UPDATE public.business_settings
  SET next_receipt_number = current_num + 1,
      updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = 'default';

  RETURN full_receipt_number;
END;
$$;

-- Grant execution permissions on RPC
GRANT EXECUTE ON FUNCTION public.get_next_receipt_number() TO authenticated, anon;

-- 5. Row-Level Security (RLS) Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full CRUD access
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
