-- 1. Create a Secure Function to check Super Admin status
-- This function runs with the privileges of the database owner (SECURITY DEFINER),
-- bypassing RLS on the table itself, thus avoiding recursion.

CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
        FALSE
    );
$$;

-- 2. Update RLS Policies to use this function

-- Fix Organizations Policy
DROP POLICY IF EXISTS "Super Admin view all orgs" ON public.organizations;
CREATE POLICY "Super Admin view all orgs" ON public.organizations
    FOR SELECT
    USING (
        check_is_super_admin() = TRUE
    );

-- Fix Profiles Policy
DROP POLICY IF EXISTS "Super Admin view all profiles" ON public.profiles;
CREATE POLICY "Super Admin view all profiles" ON public.profiles
    FOR SELECT
    USING (
        check_is_super_admin() = TRUE
    );

-- Fix Plans Policy (Just in case)
DROP POLICY IF EXISTS "Super Admins can manage plans" ON public.plans;
CREATE POLICY "Super Admins can manage plans" ON public.plans
    FOR ALL
    USING (
        check_is_super_admin() = TRUE
    );

DROP POLICY IF EXISTS "Super Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Super Admins manage subscriptions" ON public.subscriptions
    FOR ALL
    USING (
        check_is_super_admin() = TRUE
    );
