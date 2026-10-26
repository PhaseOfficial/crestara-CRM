-- ============================================================================
-- Migration: 20261027_retire_organizations_unify_customers.sql
-- Description: Safely retire public.organizations table, repoint contacts, leads, and deals to public.customers,
--              and create a backward-compatible public.organizations VIEW over public.customers.
-- ============================================================================

-- 1. MIGRATE ANY EXISTING ORGANIZATIONS INTO CUSTOMERS MASTER (IF TABLE EXISTS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organizations' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE '
      INSERT INTO public.customers (
        id,
        company_name,
        legal_name,
        industry,
        website,
        phone,
        annual_revenue,
        customer_type,
        status,
        created_at,
        updated_at
      )
      SELECT
        o.id,
        COALESCE(o.name, ''Client Account''),
        COALESCE(o.name, ''Client Account''),
        o.industry,
        o.website,
        o.phone,
        o.annual_revenue,
        ''Business'',
        ''Active'',
        COALESCE(o.created_at, NOW()),
        COALESCE(o.updated_at, NOW())
      FROM public.organizations o
      WHERE NOT EXISTS (
        SELECT 1 FROM public.customers c WHERE c.id = o.id
      )
      ON CONFLICT (id) DO NOTHING;
    ';
  END IF;
END $$;

-- 2. ENSURE CONTACTS TABLE EXISTS AND IS LINKED TO CUSTOMERS
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN last_name IS NOT NULL AND last_name <> '' THEN first_name || ' ' || last_name
      ELSE first_name
    END
  ) STORED,
  email TEXT,
  phone TEXT,
  mobile_no TEXT,
  job_title TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If contacts already existed as a base table, ensure customer_id exists and is populated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'contacts' AND table_type = 'BASE TABLE'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'customer_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.contacts ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'organization_id'
    ) THEN
      EXECUTE 'UPDATE public.contacts SET customer_id = organization_id WHERE customer_id IS NULL AND organization_id IS NOT NULL;';
    END IF;
  END IF;
END $$;

-- 3. UPDATE LEADS RELATIONSHIPS (IF LEADS TABLE EXISTS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'leads' AND table_type = 'BASE TABLE'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'customer_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.leads ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'organization_id'
    ) THEN
      EXECUTE 'UPDATE public.leads SET customer_id = organization_id WHERE customer_id IS NULL AND organization_id IS NOT NULL;';
    END IF;
  END IF;
END $$;

-- 4. UPDATE DEALS RELATIONSHIPS (IF DEALS TABLE EXISTS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'deals' AND table_type = 'BASE TABLE'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'deals' AND column_name = 'customer_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.deals ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'deals' AND column_name = 'organization_id'
    ) THEN
      EXECUTE 'UPDATE public.deals SET customer_id = organization_id WHERE customer_id IS NULL AND organization_id IS NOT NULL;';
    END IF;
  END IF;
END $$;

-- 5. REMOVE REDUNDANT ORGANIZATION_ID FROM CUSTOMERS ITSELF (IF PRESENT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'organization_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.customers DROP COLUMN organization_id CASCADE;';
  END IF;
END $$;

-- 6. DROP FOREIGN KEYS TARGETING LEGACY ORGANIZATIONS TABLE BEFORE REPLACING WITH VIEW
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN (
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'organizations'
      AND tc.table_name IN ('contacts', 'leads', 'deals')
  ) LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(fk_record.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_record.constraint_name);
  END LOOP;
END $$;

-- 7. RE-ATTACH FOREIGN KEYS DIRECTLY TO PUBLIC.CUSTOMERS(id) (ONLY IF TABLES EXIST)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts' AND table_type = 'BASE TABLE') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_contacts_customer') THEN
      ALTER TABLE public.contacts ADD CONSTRAINT fk_contacts_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads' AND table_type = 'BASE TABLE') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leads_customer') THEN
      ALTER TABLE public.leads ADD CONSTRAINT fk_leads_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals' AND table_type = 'BASE TABLE') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_deals_customer') THEN
      ALTER TABLE public.deals ADD CONSTRAINT fk_deals_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 8. REPLACE ORGANIZATIONS (TABLE OR VIEW) WITH BACKWARD-COMPATIBILITY VIEW OVER CUSTOMERS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    EXECUTE 'DROP VIEW public.organizations CASCADE;';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organizations' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'DROP TABLE public.organizations CASCADE;';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.organizations AS
  SELECT
    id,
    company_name AS name,
    website,
    phone,
    industry,
    territory,
    annual_revenue,
    employee_count_range AS employee_count,
    account_manager_id AS owner_id,
    created_at,
    updated_at
  FROM public.customers;

-- Enable permissions on backward-compatibility view
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;
