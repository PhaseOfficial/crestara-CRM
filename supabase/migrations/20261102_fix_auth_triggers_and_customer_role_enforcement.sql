-- ============================================================================
-- Migration: 20261102_fix_auth_triggers_and_customer_role_enforcement.sql
-- Description:
--   1. Reconfigure on_auth_user_created trigger on auth.users to fire ONLY on AFTER INSERT.
--      (Prevents Supabase Auth sign-in updates from firing user-creation logic).
--   2. Fortify public.handle_new_user() with role and update guards:
--      - On TG_OP = 'UPDATE': only sync profile metadata; never touch roles or public.customers.
--      - On TG_OP = 'INSERT': if profile exists, keep existing role; strictly validate
--        roles against 'Administrator', 'Staff', 'Customer'.
--      - ONLY insert into public.customers if assigned_role is strictly 'Customer'
--        and profile is not an Administrator or Staff.
--   3. Clean up: Delete any Administrator or Staff accounts erroneously inserted into public.customers.
--   4. Re-enable Row Level Security (RLS) across all tables where it was temporarily disabled.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper function: check if authenticated user is Staff or Administrator
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
      AND role IN ('Administrator', 'Staff')
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Update handle_new_user() with strict guards
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
  existing_role TEXT;
  raw_name TEXT;
  raw_company TEXT;
BEGIN
  -- A. If triggered by an UPDATE on auth.users (e.g. sign-in timestamp or email change):
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET
      email = NEW.email,
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', public.profiles.full_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', public.profiles.avatar_url),
      updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- B. If profile already exists in public.profiles, do NOT recalculate role or touch customers
  SELECT role INTO existing_role FROM public.profiles WHERE id = NEW.id;
  IF existing_role IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- C. Determine role: first registered user is Administrator; subsequent default to Customer
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    assigned_role := 'Administrator';
  ELSE
    assigned_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', ''),
      'Customer'
    );
    -- Enforce only valid roles: Administrator, Staff, Customer
    IF assigned_role NOT IN ('Administrator', 'Staff', 'Customer') THEN
      assigned_role := 'Customer';
    END IF;
  END IF;

  raw_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  raw_company := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'company',
    raw_name
  );

  -- D. Insert new profile into public.profiles
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

  -- E. Provision public.customers ONLY if role is strictly 'Customer'
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
-- 3. Ensure trigger on auth.users fires ONLY on INSERT (not on sign-in UPDATE)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. Clean up any Administrator or Staff records mistakenly in public.customers
-- ----------------------------------------------------------------------------
DELETE FROM public.customers
WHERE id IN (
  SELECT id FROM public.profiles WHERE role IN ('Administrator', 'Staff')
);

-- ----------------------------------------------------------------------------
-- 5. Re-enable Row Level Security (RLS) across all CRM tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_change_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_settings') THEN
    ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
