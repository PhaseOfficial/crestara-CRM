-- ============================================================================
-- Migration: 20261029_solidify_customer_rls.sql
-- Description: Solidify Row Level Security (RLS) policies across invoices,
--              payments, customers, events, tasks, and notes to strictly prevent
--              cross-client data leakage.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper function to check if the authenticated user has elevated roles
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('Administrator', 'Staff', 'System Manager')
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Solidify public.invoices RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow anon read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff and Admin full access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers read own invoices" ON public.invoices;

-- Staff and Admin full operational access (CRUD)
CREATE POLICY "Staff and Admin full access to invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Customers can ONLY view invoices issued to their email or matching customer record
CREATE POLICY "Customers read own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    lower(client_email) = lower(auth.jwt() ->> 'email')
    OR customer_id IN (
      SELECT id FROM public.customers
      WHERE lower(primary_email) = lower(auth.jwt() ->> 'email')
         OR lower(billing_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Solidify public.payments RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow anon read payments" ON public.payments;
DROP POLICY IF EXISTS "Staff and Admin full access to payments" ON public.payments;
DROP POLICY IF EXISTS "Customers read own payments" ON public.payments;

CREATE POLICY "Staff and Admin full access to payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Customers read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    lower(client_email) = lower(auth.jwt() ->> 'email')
    OR invoice_id IN (
      SELECT id FROM public.invoices
      WHERE lower(client_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Solidify public.customers RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Staff and Admin full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Customers read own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Customers update own customer profile" ON public.customers;

CREATE POLICY "Staff and Admin full access to customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Customers read own customer profile"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    lower(primary_email) = lower(auth.jwt() ->> 'email')
    OR lower(billing_email) = lower(auth.jwt() ->> 'email')
  );

CREATE POLICY "Customers update own customer profile"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    lower(primary_email) = lower(auth.jwt() ->> 'email')
    OR lower(billing_email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    lower(primary_email) = lower(auth.jwt() ->> 'email')
    OR lower(billing_email) = lower(auth.jwt() ->> 'email')
  );

-- ----------------------------------------------------------------------------
-- 5. Solidify public.events (Calendar Meetings) RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to events" ON public.events;
DROP POLICY IF EXISTS "Allow anon read events" ON public.events;
DROP POLICY IF EXISTS "Staff and Admin full access to events" ON public.events;
DROP POLICY IF EXISTS "Customers read own events" ON public.events;

CREATE POLICY "Staff and Admin full access to events"
  ON public.events FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Customers read own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    event_type = 'Public'
    OR (
      auth.jwt() ->> 'email' IS NOT NULL
      AND (
        lower(owner) = lower(auth.jwt() ->> 'email')
        OR COALESCE(event_participants::text, '') ILIKE '%' || (auth.jwt() ->> 'email') || '%'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Lock down internal CRM operational tables from Customer access
-- ----------------------------------------------------------------------------
-- Guarded: tasks and contacts (present in live DB)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff and Admin full access tasks" ON public.tasks;
CREATE POLICY "Staff and Admin full access tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff and Admin full access contacts" ON public.contacts;
CREATE POLICY "Staff and Admin full access contacts"
  ON public.contacts FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Dynamically guard tables that may or may not exist in the live database
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    EXECUTE '
      ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow authenticated full access leads" ON public.leads;
      DROP POLICY IF EXISTS "Staff and Admin full access leads" ON public.leads;
      CREATE POLICY "Staff and Admin full access leads" ON public.leads FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    EXECUTE '
      ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow authenticated full access deals" ON public.deals;
      DROP POLICY IF EXISTS "Staff and Admin full access deals" ON public.deals;
      CREATE POLICY "Staff and Admin full access deals" ON public.deals FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());
    ';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    EXECUTE '
      ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow authenticated full access notes" ON public.notes;
      DROP POLICY IF EXISTS "Staff and Admin full access notes" ON public.notes;
      CREATE POLICY "Staff and Admin full access notes" ON public.notes FOR ALL TO authenticated USING (public.is_admin_or_staff()) WITH CHECK (public.is_admin_or_staff());
    ';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Solidify public.client_change_requests RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.client_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to change requests" ON public.client_change_requests;
DROP POLICY IF EXISTS "Staff and Admin manage change requests" ON public.client_change_requests;
DROP POLICY IF EXISTS "Staff and Admin full access change requests" ON public.client_change_requests;
DROP POLICY IF EXISTS "Customers can view own change requests" ON public.client_change_requests;
DROP POLICY IF EXISTS "Customers view own change requests" ON public.client_change_requests;
DROP POLICY IF EXISTS "Customers can insert change requests" ON public.client_change_requests;
DROP POLICY IF EXISTS "Customers insert own change requests" ON public.client_change_requests;

-- Staff and Admin have full CRUD access
CREATE POLICY "Staff and Admin full access change requests"
  ON public.client_change_requests FOR ALL
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

-- Customers can view only their own profile change requests
CREATE POLICY "Customers view own change requests"
  ON public.client_change_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR customer_id = auth.uid()
    OR customer_id IN (
      SELECT id FROM public.customers
      WHERE lower(primary_email) = lower(auth.jwt() ->> 'email')
         OR lower(billing_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Customers can only insert their own change requests with status 'Pending'
CREATE POLICY "Customers insert own change requests"
  ON public.client_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'Pending'
    AND (
      requested_by = auth.uid()
      OR customer_id = auth.uid()
      OR customer_id IN (
        SELECT id FROM public.customers
        WHERE lower(primary_email) = lower(auth.jwt() ->> 'email')
           OR lower(billing_email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

