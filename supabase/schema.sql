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

-- 3. CUSTOMERS MASTER TABLE (Clients / Organizations Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_type TEXT NOT NULL CHECK (customer_type IN ('Business', 'Individual', 'Non-Profit', 'Government')) DEFAULT 'Business',
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Prospect', 'Archived')) DEFAULT 'Active',
  lifecycle_stage TEXT CHECK (lifecycle_stage IN ('Onboarding', 'Active', 'At-Risk', 'Churned', 'Advocate')) DEFAULT 'Onboarding',
  account_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- B2B Corporate Registry
  company_name TEXT NOT NULL,
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

  -- B2C Demographics & Contacts
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

-- Backward-Compatibility View for legacy organizations references
CREATE OR REPLACE VIEW public.organizations AS
  SELECT
    id,
    company_name AS name,
    website,
    phone,
    industry,
    territory,
    annual_revenue,
    account_manager_id AS owner_id,
    created_at,
    updated_at
  FROM public.customers;

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
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
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
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
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
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
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

-- 12. CLIENT CHANGE REQUESTS
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

-- ============================================================================
-- 14. BUSINESS SETTINGS & ATOMIC INVOICE NUMBER RPC
-- ============================================================================
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

  -- Inventory & Stock Management Defaults
  auto_deduct_inventory BOOLEAN NOT NULL DEFAULT false,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  default_low_stock_threshold INTEGER NOT NULL DEFAULT 5,

  -- Audit & Metadata
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read business settings" ON public.business_settings;
CREATE POLICY "Allow authenticated read business settings"
  ON public.business_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon read business settings" ON public.business_settings;
CREATE POLICY "Allow anon read business settings"
  ON public.business_settings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access business settings" ON public.business_settings;
CREATE POLICY "Allow authenticated full access business settings"
  ON public.business_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

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

-- ============================================================================
-- 15. INVOICES & REVENUE MANAGEMENT (Single-Table Document Model)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON public.invoices(client_email);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated full access to invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read invoices" ON public.invoices;
CREATE POLICY "Allow anon read invoices"
  ON public.invoices FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- 16. SUPABASE STORAGE BUCKETS & MEDIA ASSETS
-- ============================================================================
-- 1. Create or update the 'crm-assets' public storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-assets',
  'crm-assets',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

-- 2. Storage Objects Row Level Security (RLS) Policies
-- (Note: In Supabase, storage.objects has RLS enabled by default. Do not run ALTER TABLE storage.objects)
DROP POLICY IF EXISTS "Public can view crm-assets" ON storage.objects;
CREATE POLICY "Public can view crm-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-assets');

DROP POLICY IF EXISTS "Authenticated users can upload crm-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload crm-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'crm-assets');

DROP POLICY IF EXISTS "Authenticated users can update crm-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update crm-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'crm-assets');

DROP POLICY IF EXISTS "Authenticated users can delete crm-assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete crm-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'crm-assets');

-- 3. Customer Master Table: Logo & Avatar Columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- ============================================================================
-- 17. INVENTORY, PRODUCTS & SERVICES MASTER TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  type TEXT NOT NULL CHECK (type IN ('Product', 'Service')) DEFAULT 'Product',
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  quantity_in_stock NUMERIC(15, 2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(15, 2) NOT NULL DEFAULT 5,
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('Active', 'Archived', 'Draft')) DEFAULT 'Active',
  barcode TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_inventory_code ON public.inventory(code);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON public.inventory(type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory(created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_updated_at();

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to inventory" ON public.inventory;
CREATE POLICY "Allow authenticated full access to inventory"
  ON public.inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read inventory" ON public.inventory;
CREATE POLICY "Allow anon read inventory"
  ON public.inventory FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- 18. PAYMENTS LEDGER & SEQUENTIAL COMMERCIAL RECEIPTS
-- ============================================================================
-- 1. Extend Business Settings for Receipts & SMTP / cPanel Configuration
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS receipt_prefix TEXT NOT NULL DEFAULT 'REC-2026-',
  ADD COLUMN IF NOT EXISTS next_receipt_number INTEGER NOT NULL DEFAULT 5001,
  ADD COLUMN IF NOT EXISTS from_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_name TEXT DEFAULT '',
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

-- 2. Dedicated Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
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

  IF NOT FOUND THEN
    INSERT INTO public.business_settings (id, receipt_prefix, next_receipt_number)
    VALUES ('default', 'REC-2026-', 5001)
    RETURNING receipt_prefix, next_receipt_number
    INTO current_prefix, current_num;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_next_receipt_number() TO authenticated, anon;

-- 5. Row-Level Security (RLS) Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to payments" ON public.payments;
CREATE POLICY "Allow authenticated full access to payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read payments" ON public.payments;
CREATE POLICY "Allow anon read payments"
  ON public.payments FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- 18. CALENDAR EVENTS & SCHEDULING (DECOUPLED FROM FRAPPE)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_events_dates ON public.events(starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_events_owner ON public.events(owner);
CREATE INDEX IF NOT EXISTS idx_events_ref ON public.events(reference_doctype, reference_docname);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

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

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS default_calendar_view TEXT DEFAULT 'Weekly',
  ADD COLUMN IF NOT EXISTS calendar_notifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS calendar_allday_notifications JSONB DEFAULT '[]'::jsonb;





