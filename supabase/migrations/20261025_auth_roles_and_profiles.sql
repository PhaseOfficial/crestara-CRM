-- ============================================================================
-- Crestara CRM — Supabase Auth, Profiles, and Role-Based Access Control (RBAC)
-- Migration: 20261025_auth_roles_and_profiles.sql
-- ============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  organization TEXT,
  role TEXT NOT NULL CHECK (role IN ('Administrator', 'Staff', 'Customer')) DEFAULT 'Customer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Indexes for fast lookup & filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Helper function: Get Role of Authenticated User
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 6. RLS Policies for Profiles
-- A. Allow users to read their own profile
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
CREATE POLICY "Allow users to read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- B. Allow Staff and Administrators to read all profiles (for team list, assignment, client records)
DROP POLICY IF EXISTS "Allow staff and admin read all profiles" ON public.profiles;
CREATE POLICY "Allow staff and admin read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.get_auth_role() IN ('Administrator', 'Staff')
  );

-- C. Allow users to update their own non-role fields
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent non-admins from promoting themselves
    AND (
      public.get_auth_role() = 'Administrator'
      OR role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );

-- D. Allow Administrators full update on all profiles (e.g. changing roles in Business Settings)
DROP POLICY IF EXISTS "Allow admin update all profiles" ON public.profiles;
CREATE POLICY "Allow admin update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_auth_role() = 'Administrator')
  WITH CHECK (public.get_auth_role() = 'Administrator');

-- E. Allow Administrators to insert or delete profiles
DROP POLICY IF EXISTS "Allow admin manage profiles" ON public.profiles;
CREATE POLICY "Allow admin manage profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'Administrator')
  WITH CHECK (public.get_auth_role() = 'Administrator');

-- 7. Automated Trigger: Create Profile on auth.users Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
  raw_name TEXT;
  f_name TEXT;
  l_name TEXT;
BEGIN
  -- Extract names
  raw_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  f_name := split_part(raw_name, ' ', 1);
  l_name := NULLIF(SUBSTRING(raw_name FROM LENGTH(f_name) + 2), '');

  -- Check existing profiles count
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- The very first user account created is automatically an Administrator.
  -- Subsequent accounts default to the role passed in metadata, or 'Customer'.
  IF user_count = 0 THEN
    assigned_role := 'Administrator';
  ELSE
    assigned_role := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', ''),
      'Customer'
    );
    -- Enforce valid enum
    IF assigned_role NOT IN ('Administrator', 'Staff', 'Customer') THEN
      assigned_role := 'Customer';
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    avatar_url,
    phone,
    organization,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    raw_name,
    f_name,
    l_name,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'organization',
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Backfill existing account(s) in auth.users
-- Automatically populates your existing authentication account as an Administrator
INSERT INTO public.profiles (id, email, full_name, first_name, last_name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  split_part(COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), ' ', 1),
  NULLIF(SUBSTRING(COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) FROM LENGTH(split_part(COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), ' ', 1)) + 2), ''),
  'Administrator'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  role = 'Administrator';
