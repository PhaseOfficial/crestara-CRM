-- ============================================================================
-- Migration: 20261030_backfill_customer_records_and_fix_rls.sql
-- Description: 
--   1. Automatically provision public.customers row for any new Customer signup
--   2. Backfill existing profiles with role 'Customer' into public.customers
--   3. Enable id = auth.uid() in public.customers RLS for infallible customer access
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Backfill all existing Customer profiles into public.customers master
-- ----------------------------------------------------------------------------
INSERT INTO public.customers (
  id,
  primary_email,
  company_name,
  first_name,
  status,
  customer_type,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.email,
  COALESCE(p.full_name, split_part(p.email, '@', 1)),
  split_part(COALESCE(p.full_name, ''), ' ', 1),
  'Active',
  'Business',
  NOW(),
  NOW()
FROM public.profiles p
WHERE p.role = 'Customer'
ON CONFLICT (id) DO UPDATE SET
  primary_email = EXCLUDED.primary_email,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 2. Update handle_new_user() trigger to provision public.customers on signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
  raw_name TEXT;
  raw_company TEXT;
BEGIN
  raw_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  raw_company := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'company',
    raw_name
  );

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

  -- 1. Insert Profile
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
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  -- 2. If Customer, ensure customer master record exists immediately
  IF assigned_role = 'Customer' THEN
    INSERT INTO public.customers (
      id,
      primary_email,
      company_name,
      first_name,
      status,
      customer_type,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      raw_company,
      split_part(raw_name, ' ', 1),
      'Active',
      'Business',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      primary_email = EXCLUDED.primary_email,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. Enhance public.customers RLS to allow direct lookup by id = auth.uid()
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers read own customer profile" ON public.customers;
CREATE POLICY "Customers read own customer profile"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR lower(primary_email) = lower(auth.jwt() ->> 'email')
    OR lower(billing_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Customers update own customer profile" ON public.customers;
CREATE POLICY "Customers update own customer profile"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR lower(primary_email) = lower(auth.jwt() ->> 'email')
    OR lower(billing_email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    id = auth.uid()
    OR lower(primary_email) = lower(auth.jwt() ->> 'email')
    OR lower(billing_email) = lower(auth.jwt() ->> 'email')
  );
