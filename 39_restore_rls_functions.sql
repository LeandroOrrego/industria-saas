-- RESTORE RLS FUNCTIONS AND POLICIES
-- This script fixes the "Infinite Recursion" error in the profiles table.

-- 1. Create the Secure Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_auth_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop recursive policies
DROP POLICY IF EXISTS "Users can view members of their own organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;

-- 3. Re-create Optimized Policies

-- A. Users can ALWAYS see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- B. Users can see other members of their org (using the function)
CREATE POLICY "Users can view members of their own organization" ON public.profiles
    FOR SELECT
    USING (
        organization_id = public.get_auth_user_organization_id()
    );

-- C. Users can UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());
