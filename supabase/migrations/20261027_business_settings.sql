-- ============================================================================
-- Migration: 20261027_business_settings.sql
-- Description: Business settings singleton table, RLS policies, atomic invoice sequence RPC
-- ============================================================================

-- 1. Table: public.business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  
  -- Company & Contact Details
  business_name TEXT NOT NULL DEFAULT 'Crestara CRM',
  legal_name TEXT DEFAULT 'Crestara Technologies Inc.',
  business_email TEXT NOT NULL DEFAULT 'billing@crestara.com',
  business_phone TEXT DEFAULT '+1 (555) 000-1234',
  business_address TEXT DEFAULT '100 Business Parkway, Suite 500, San Francisco, CA 94105',
  tax_id TEXT DEFAULT 'US-94-8829103',
  website TEXT DEFAULT 'https://crestara.com',
  logo_url TEXT DEFAULT '',

  -- Invoicing & Financial Rules
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-2026-',
  next_invoice_number INTEGER NOT NULL DEFAULT 1045,
  default_payment_terms INTEGER NOT NULL DEFAULT 30,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 8.50,
  late_fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
  notes_template TEXT DEFAULT 'Thank you for your business. Remittance is due within agreed terms.',

  -- Bank Wire / Remittance Settlement
  bank_name TEXT DEFAULT '',
  bank_account_name TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_routing_iban TEXT DEFAULT '',
  swift_bic TEXT DEFAULT '',
  payment_instructions TEXT DEFAULT '',

  -- Audit & Metadata
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Row Level Security (RLS)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Staff, Admins, Customers) to read business settings
DROP POLICY IF EXISTS "Allow authenticated read business settings" ON public.business_settings;
CREATE POLICY "Allow authenticated read business settings"
  ON public.business_settings FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to read business settings (e.g. for customer invoice portal or public previews)
DROP POLICY IF EXISTS "Allow anon read business settings" ON public.business_settings;
CREATE POLICY "Allow anon read business settings"
  ON public.business_settings FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users full write access to business settings
DROP POLICY IF EXISTS "Allow authenticated full access business settings" ON public.business_settings;
CREATE POLICY "Allow authenticated full access business settings"
  ON public.business_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Seed Default Singleton Row for Crestara
INSERT INTO public.business_settings (
  id,
  business_name,
  legal_name,
  business_email,
  business_phone,
  business_address,
  tax_id,
  website,
  currency,
  currency_symbol,
  invoice_prefix,
  next_invoice_number,
  default_payment_terms,
  tax_rate,
  late_fee_percentage,
  notes_template
) VALUES (
  'default',
  'Crestara CRM',
  'Crestara Technologies Inc.',
  'billing@crestara.com',
  '+1 (555) 000-1234',
  '100 Business Parkway, Suite 500, San Francisco, CA 94105',
  'US-94-8829103',
  'https://crestara.com',
  'USD',
  '$',
  'INV-2026-',
  1045,
  30,
  8.50,
  2.00,
  'Thank you for your business. Remittance is due within agreed terms.'
) ON CONFLICT (id) DO NOTHING;

-- 4. Atomic Invoice Number Generator RPC Function
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_prefix TEXT;
  current_num INTEGER;
  full_inv_number TEXT;
BEGIN
  SELECT invoice_prefix, next_invoice_number
  INTO current_prefix, current_num
  FROM public.business_settings
  WHERE id = 'default'
  FOR UPDATE;

  IF current_num IS NULL THEN
    current_prefix := 'INV-2026-';
    current_num := 1001;
  END IF;

  full_inv_number := COALESCE(current_prefix, '') || current_num;

  UPDATE public.business_settings
  SET next_invoice_number = current_num + 1,
      updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = 'default';

  RETURN full_inv_number;
END;
$$;
