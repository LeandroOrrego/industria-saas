-- FIX RECURSIVE RLS (V2 - IDEMPOTENT)
-- This script repairs RLS policies by dropping them first to avoid "policy already exists" errors.

-- 1. Create Helper Function (Bypass RLS)
CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Drop Problematic Policies (AND existing ones to be recreated)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view organization members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Also cleanup old spanish names if they exist
DROP POLICY IF EXISTS "Ver compañeros de equipo" ON public.profiles;
DROP POLICY IF EXISTS "Usuario ve su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuario edita su propio perfil" ON public.profiles;


-- 3. Create Recursion-Free Policies

-- A) View Own Profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING ( auth.uid() = id );

-- B) View Organization Members (Using Helper)
CREATE POLICY "Users can view organization members" ON public.profiles
    FOR SELECT
    USING (
        organization_id = public.get_auth_user_org_id()
    );

-- C) Update Own Profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING ( auth.uid() = id );

-- D) Insert Own Profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT
    WITH CHECK ( auth.uid() = id );
