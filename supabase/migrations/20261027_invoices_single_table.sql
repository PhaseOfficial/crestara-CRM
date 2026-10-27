-- ============================================================================
-- Migration: 20261027_invoices_single_table.sql
-- Description: Single-table invoices architecture with items JSONB and payments JSONB
-- ============================================================================

-- 1. Create public.invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Client & Contact details
  client_name TEXT NOT NULL,
  client_email TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  
  -- Invoice Status & Workflow
  -- Statuses: 'Draft', 'Issued', 'Partially paid', 'Paid', 'Overdue', 'Cancelled'
  status TEXT NOT NULL DEFAULT 'Draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  payment_terms TEXT DEFAULT 'Net 30',
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Pricing & Calculation Totals
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Embedded Document Payloads (Point-in-time Snapshots)
  -- items: Array of [{ id, product_id, code, name, description, quantity, unit_price, amount }]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- payments: Array of [{ id, transaction_ref, amount, currency, payment_method, payment_date, status, notes }]
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Notes & Metadata
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Indexes for High-Performance Querying
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON public.invoices(client_email);

-- 3. Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Staff, Admins, Clients) full access
DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated full access to invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon to read invoices (e.g. for client portal receipt links or public verification)
DROP POLICY IF EXISTS "Allow anon read invoices" ON public.invoices;
CREATE POLICY "Allow anon read invoices"
  ON public.invoices FOR SELECT
  TO anon
  USING (true);

-- 4. Updated At Trigger
CREATE OR REPLACE FUNCTION public.handle_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoices_updated_at();
