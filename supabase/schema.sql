-- ============================================================================
-- Crestara CRM — Supabase PostgreSQL Schema & Security Policies
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER PROFILES (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('Administrator', 'Staff', 'Customer')) DEFAULT 'Customer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger to automatically create profile record on Supabase signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ORGANIZATIONS / ACCOUNTS
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

-- 4. CONTACTS
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
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  lead_name TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN last_name IS NOT NULL AND last_name <> '' THEN first_name || ' ' || last_name
      ELSE first_name
    END
  ) STORED,
  email TEXT,
  mobile_no TEXT,
  phone TEXT,
  job_title TEXT,
  organization TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'New', -- 'New', 'Contacted', 'Qualified', 'Lost'
  source TEXT, -- 'Website', 'Referral', 'Cold Call', 'LinkedIn', 'Social Media'
  territory TEXT,
  industry TEXT,
  annual_revenue NUMERIC(15, 2),
  website TEXT,
  converted BOOLEAN DEFAULT FALSE,
  lead_owner UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DEALS
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  deal_value NUMERIC(15, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'Qualification', -- 'Qualification', 'Demo', 'Proposal', 'Won', 'Lost'
  pipeline TEXT DEFAULT 'Standard',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  expected_close_date DATE,
  probability INTEGER DEFAULT 50,
  lost_reason TEXT,
  deal_owner UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Backlog', -- 'Backlog', 'Todo', 'In Progress', 'Completed', 'Cancelled'
  priority TEXT NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
  due_date TIMESTAMPTZ,
  reference_doctype TEXT, -- 'leads', 'deals', 'contacts', 'organizations'
  reference_id UUID,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTES
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  reference_doctype TEXT, -- 'leads', 'deals', 'contacts', 'organizations'
  reference_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTIVITIES & TIMELINE EVENTS
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL, -- 'note', 'call', 'email', 'task', 'status_change', 'creation'
  subject TEXT,
  description TEXT,
  reference_doctype TEXT,
  reference_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profiles
CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow individual update profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Universal workspace access for authenticated CRM team members
CREATE POLICY "Allow authenticated full access organizations"
  ON public.organizations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access contacts"
  ON public.contacts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access deals"
  ON public.deals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access notes"
  ON public.notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(lead_owner);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(deal_owner);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reference ON public.tasks(reference_doctype, reference_id);
CREATE INDEX IF NOT EXISTS idx_notes_reference ON public.notes(reference_doctype, reference_id);
CREATE INDEX IF NOT EXISTS idx_activities_reference ON public.activities(reference_doctype, reference_id);

-- 12. CUSTOMERS MASTER TABLE (Keyed 1:1 to profiles.id for role='Customer')
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('Business', 'Individual', 'Non-Profit', 'Government')) DEFAULT 'Business',
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Prospect', 'Archived')) DEFAULT 'Active',
  lifecycle_stage TEXT CHECK (lifecycle_stage IN ('Onboarding', 'Active', 'At-Risk', 'Churned', 'Advocate')) DEFAULT 'Onboarding',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  account_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- B2B Corporate Registry
  company_name TEXT,
  legal_name TEXT,
  trade_name TEXT,
  company_registration_number TEXT,
  tin TEXT,
  vat_number TEXT,
  duns_number TEXT,
  legal_structure TEXT,
  industry TEXT,
  sub_industry TEXT,
  incorporation_date DATE,
  annual_revenue NUMERIC(15, 2),
  annual_revenue_currency TEXT DEFAULT 'USD',
  employee_count_range TEXT,
  website TEXT,
  linkedin_url TEXT,

  -- B2C Demographics & Analytics
  salutation TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-Binary', 'Other', 'Prefer Not to Say')),
  date_of_birth DATE,
  age_group TEXT CHECK (age_group IN ('Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  national_id_number TEXT,
  national_id_type TEXT,
  nationality TEXT,
  marital_status TEXT CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed', 'Other')),
  employment_status TEXT CHECK (employment_status IN ('Employed', 'Self-Employed', 'Business Owner', 'Student', 'Retired', 'Other')),
  education_level TEXT,
  job_title TEXT,
  department TEXT,

  -- Tax Exemption & Verification
  tax_id TEXT,
  tax_exempt BOOLEAN DEFAULT FALSE,
  tax_exempt_certificate_number TEXT,
  tax_exempt_reason TEXT,
  kyc_status TEXT CHECK (kyc_status IN ('Unverified', 'Pending', 'Verified', 'Rejected')) DEFAULT 'Unverified',
  kyc_verified_at TIMESTAMPTZ,

  -- Contact Points
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

  -- Commercial Terms Defaults
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

  -- Audit & Metadata
  internal_notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. CLIENT CHANGE REQUESTS
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

-- Indexes for customers & change requests
CREATE INDEX IF NOT EXISTS idx_customers_tin ON public.customers(tin);
CREATE INDEX IF NOT EXISTS idx_customers_reg_num ON public.customers(company_registration_number);
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON public.customers(national_id_number);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON public.customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON public.customers(customer_segment);
CREATE INDEX IF NOT EXISTS idx_change_requests_customer ON public.client_change_requests(customer_id);
