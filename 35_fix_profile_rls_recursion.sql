-- FIX INFINITE RECURSION IN RLS

-- 1. Helper Function: Get Current User's Org ID (Bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_auth_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- SECURITY DEFINER = Runs with privileges of the creator (postgres), ignoring RLS on profiles table.

-- 2. Clean up conflicting policies
DROP POLICY IF EXISTS "Users can view members of their own organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;

-- 3. Policy: View Own Profile (Simple, no recursion)
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- 4. Policy: View Org Members (Uses function to avoid recursion)
CREATE POLICY "Users can view members of their own organization" ON public.profiles
    FOR SELECT
    USING (
        organization_id = public.get_auth_user_organization_id()
    );

-- 5. Policy: Update Own Profile
-- (Keeping the one we added earlier, it was fine, but ensuring it exists)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());
