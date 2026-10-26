-- ============================================================================
-- Migration: Customer Master Data, Profiles Clean Up, & Change Requests
-- File: supabase/migrations/20261025_customer_master_and_profile_cleanup.sql
-- ============================================================================

-- 0. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure get_auth_role() helper exists for RLS policies
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Ensure organizations table exists before customer foreign key references it
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  website TEXT,
  phone TEXT,
  industry TEXT,
  territory TEXT,
  annual_revenue NUMERIC(15, 2),
  employee_count INTEGER,
  logo TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and Admin can manage organizations" ON public.organizations;
CREATE POLICY "Staff and Admin can manage organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 1. CLEAN UP PROFILES TABLE
-- Drop redundant / misplaced columns from public.profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_name;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization;

-- Update trigger handle_new_user to only populate clean profiles columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
  raw_name TEXT;
BEGIN
  raw_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    assigned_role := 'Administrator';
  ELSE
    assigned_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', ''),
      'Customer'
    );
    IF assigned_role NOT IN ('Administrator', 'Staff', 'Customer') THEN
      assigned_role := 'Customer';
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    raw_name,
    NEW.raw_user_meta_data->>'avatar_url',
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CREATE CUSTOMERS MASTER TABLE (Keyed 1:1 to profiles.id)
CREATE TABLE IF NOT EXISTS public.customers (
  -- Primary key linked directly to profiles.id (and auth.users.id)
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Classification & Status
  customer_type TEXT NOT NULL CHECK (customer_type IN ('Business', 'Individual', 'Non-Profit', 'Government')) DEFAULT 'Business',
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Prospect', 'Archived')) DEFAULT 'Active',
  lifecycle_stage TEXT CHECK (lifecycle_stage IN ('Onboarding', 'Active', 'At-Risk', 'Churned', 'Advocate')) DEFAULT 'Onboarding',

  -- Relational Linkages
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  account_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- B2B Corporate Registry & Attributes
  company_name TEXT,
  legal_name TEXT,
  trade_name TEXT,
  company_registration_number TEXT, -- CRN / SIREN / Handelsregister
  tin TEXT, -- Taxpayer Identification Number / EIN
  vat_number TEXT, -- VAT / GST ID
  duns_number TEXT, -- Dun & Bradstreet 9-digit credit identifier
  legal_structure TEXT, -- LLC, Corporation, Ltd, PLC, Partnership, Sole Proprietorship
  industry TEXT, -- Technology, Healthcare, Finance, Manufacturing, Retail, Construction, etc.
  sub_industry TEXT,
  incorporation_date DATE,
  annual_revenue NUMERIC(15, 2),
  annual_revenue_currency TEXT DEFAULT 'USD',
  employee_count_range TEXT, -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  website TEXT,
  linkedin_url TEXT,

  -- B2C Individual Demographics (Analytics & KYC)
  salutation TEXT, -- Mr., Ms., Mrs., Dr., Prof.
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-Binary', 'Other', 'Prefer Not to Say')),
  date_of_birth DATE,
  age_group TEXT CHECK (age_group IN ('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  national_id_number TEXT,
  national_id_type TEXT, -- 'National ID', 'Passport', 'Driver License', 'Social Security / Insurance'
  nationality TEXT,
  marital_status TEXT CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed', 'Other')),
  employment_status TEXT CHECK (employment_status IN ('Employed', 'Self-Employed', 'Business Owner', 'Student', 'Retired', 'Other')),
  education_level TEXT,
  job_title TEXT,
  department TEXT,

  -- Tax Exemption & Verification Status
  tax_id TEXT,
  tax_exempt BOOLEAN DEFAULT FALSE,
  tax_exempt_certificate_number TEXT,
  tax_exempt_reason TEXT,
  kyc_status TEXT CHECK (kyc_status IN ('Unverified', 'Pending', 'Verified', 'Rejected')) DEFAULT 'Unverified',
  kyc_verified_at TIMESTAMPTZ,

  -- Contact Details
  primary_email TEXT NOT NULL,
  billing_email TEXT,
  phone TEXT,
  mobile_no TEXT,
  whatsapp_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  -- Structured Billing Address
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state_province TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'United States',

  -- Structured Shipping / Service Address
  shipping_address_same_as_billing BOOLEAN DEFAULT TRUE,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state_province TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT,
  shipping_delivery_instructions TEXT,

  -- Commercial Terms Defaults (Master Non-Transactional)
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_payment_terms TEXT NOT NULL DEFAULT 'Net 30',
  default_payment_method TEXT DEFAULT 'Bank Transfer',
  credit_limit NUMERIC(15, 2) DEFAULT 0.00,
  credit_hold BOOLEAN DEFAULT FALSE,
  default_discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
  price_tier TEXT DEFAULT 'Standard',

  -- Preferences & Consents
  preferred_language TEXT DEFAULT 'en',
  preferred_timezone TEXT DEFAULT 'UTC',
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('Email', 'Phone', 'SMS', 'WhatsApp', 'Mail')) DEFAULT 'Email',
  invoice_delivery_method TEXT CHECK (invoice_delivery_method IN ('Email', 'Client Portal', 'Postal Mail', 'Electronic Data Interchange (EDI)')) DEFAULT 'Email',
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  marketing_opt_in_date TIMESTAMPTZ,
  e_invoicing_consent BOOLEAN DEFAULT TRUE,
  gdpr_data_processing_consent BOOLEAN DEFAULT TRUE,

  -- Analytics & Attribution
  customer_segment TEXT DEFAULT 'Standard',
  clv_tier TEXT CHECK (clv_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond')) DEFAULT 'Bronze',
  territory TEXT,
  acquisition_channel TEXT,
  acquisition_date DATE,
  churn_risk_level TEXT CHECK (churn_risk_level IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Low',
  health_score TEXT CHECK (health_score IN ('Healthy', 'Neutral', 'At-Risk', 'Critical')) DEFAULT 'Healthy',
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),

  -- Profile Completeness & Onboarding Tracking
  is_profile_complete BOOLEAN DEFAULT FALSE,
  profile_completion_percentage INTEGER DEFAULT 20,
  onboarding_steps_completed JSONB DEFAULT '[]'::jsonb,

  -- Extensibility & Audit
  internal_notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. STRICT ROLE CHECK: Only 'Customer' role allowed in customers table
CREATE OR REPLACE FUNCTION public.check_is_customer_role()
RETURNS TRIGGER AS $$
DECLARE
  target_role TEXT;
BEGIN
  SELECT role INTO target_role FROM public.profiles WHERE id = NEW.id;
  IF target_role IS DISTINCT FROM 'Customer' THEN
    RAISE EXCEPTION 'Constraint Violation: Profile % has role "%". Only profiles with role "Customer" are permitted in public.customers.', NEW.id, target_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_customer_role ON public.customers;
CREATE TRIGGER trigger_enforce_customer_role
  BEFORE INSERT OR UPDATE OF id ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.check_is_customer_role();

-- 4. AUTOMATIC PROVISIONING & SYNC ON PROFILE ROLE CHANGE
CREATE OR REPLACE FUNCTION public.sync_profile_to_customer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'Customer' THEN
    INSERT INTO public.customers (
      id,
      primary_email,
      company_name,
      first_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)),
      split_part(COALESCE(NEW.full_name, ''), ' ', 1),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      primary_email = EXCLUDED.primary_email,
      updated_at = NOW();
  ELSIF OLD.role = 'Customer' AND NEW.role IN ('Administrator', 'Staff') THEN
    DELETE FROM public.customers WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_profile_to_customer ON public.profiles;
CREATE TRIGGER trigger_sync_profile_to_customer
  AFTER INSERT OR UPDATE OF role, email, full_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_customer();

-- 5. CLIENT CHANGE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.client_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  reason TEXT NOT NULL,
  current_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_name TEXT,
  review_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  reviewed_at TIMESTAMPTZ
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_gender ON public.customers(gender);
CREATE INDEX IF NOT EXISTS idx_customers_age_group ON public.customers(age_group);
CREATE INDEX IF NOT EXISTS idx_customers_nationality ON public.customers(nationality);
CREATE INDEX IF NOT EXISTS idx_customers_tin ON public.customers(tin);
CREATE INDEX IF NOT EXISTS idx_customers_reg_num ON public.customers(company_registration_number);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public.customers(national_id_number);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON public.customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON public.customers(customer_segment);
CREATE INDEX IF NOT EXISTS idx_customers_clv_tier ON public.customers(clv_tier);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_custom_fields ON public.customers USING GIN (custom_fields);
CREATE INDEX IF NOT EXISTS idx_change_requests_customer ON public.client_change_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON public.client_change_requests(status);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and Admin can view all customers" ON public.customers;
CREATE POLICY "Staff and Admin can view all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.get_auth_role() IN ('Administrator', 'Staff'));

DROP POLICY IF EXISTS "Staff and Admin can manage customers" ON public.customers;
CREATE POLICY "Staff and Admin can manage customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.get_auth_role() IN ('Administrator', 'Staff'))
  WITH CHECK (public.get_auth_role() IN ('Administrator', 'Staff'));

DROP POLICY IF EXISTS "Customers can view own customer record" ON public.customers;
CREATE POLICY "Customers can view own customer record"
  ON public.customers FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Staff and Admin manage change requests" ON public.client_change_requests;
CREATE POLICY "Staff and Admin manage change requests"
  ON public.client_change_requests FOR ALL
  TO authenticated
  USING (public.get_auth_role() IN ('Administrator', 'Staff'))
  WITH CHECK (public.get_auth_role() IN ('Administrator', 'Staff'));

DROP POLICY IF EXISTS "Customers can view own change requests" ON public.client_change_requests;
CREATE POLICY "Customers can view own change requests"
  ON public.client_change_requests FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert change requests" ON public.client_change_requests;
CREATE POLICY "Customers can insert change requests"
  ON public.client_change_requests FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- 8. BACKFILL EXISTING PROFILES WITH ROLE 'Customer'
INSERT INTO public.customers (id, primary_email, company_name, first_name)
SELECT id, email, COALESCE(full_name, split_part(email, '@', 1)), split_part(COALESCE(full_name, ''), ' ', 1)
FROM public.profiles
WHERE role = 'Customer'
ON CONFLICT (id) DO NOTHING;
