-- NUCLEAR REPAIR SCRIPT (FIX EVERYTHING)
-- This script combines all previous fixes to guarantee a working state.

-- 1. FIX TRIGGER (Ensure future users are created)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, role, is_super_admin, onboarding_completed, created_at, updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    'operario', -- Default
    FALSE,
    FALSE,
    NOW(),
    NOW()
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Trigger Error: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. ENSURE COLUMNS (Just in case)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 3. REPAIR MISSING PROFILES (The "Zombie" Fix re-run)
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at, is_super_admin, onboarding_completed)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'Usuario'), 
    'admin', 
    NOW(), 
    NOW(),
    FALSE,
    FALSE -- Force false so they go to onboarding if needed
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.profiles);

-- 4. FIX "GHOST" ORGS
-- If a profile points to an org that doesn't exist, set it to NULL
UPDATE public.profiles
SET organization_id = NULL
WHERE organization_id IS NOT NULL 
AND organization_id NOT IN (SELECT id FROM public.organizations);

-- 5. RE-APPLY RLS FIXES (Recursive fix)
-- Helper
CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1; $$;

-- Drop old
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view organization members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "Users can view organization members" ON public.profiles FOR SELECT USING ( organization_id = public.get_auth_user_org_id() );
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ( auth.uid() = id );
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );

-- 6. GRANT PERMISSIONS (Just in case)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
