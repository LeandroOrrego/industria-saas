-- FIX SUBSCRIPTIONS RLS
-- The upsert failed because there were no policies allowing INSERT/UPDATE on 'subscriptions'.

-- 1. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Helper Safety (in case not present)
CREATE OR REPLACE FUNCTION public.get_auth_user_org_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1; $$;

-- 3. Drop Old Policies
DROP POLICY IF EXISTS "Members can view subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can create subscription" ON public.subscriptions;

-- 4. Create New Policies

-- A) View (All members of the org)
CREATE POLICY "Members can view subscription" ON public.subscriptions
    FOR SELECT
    USING (
        organization_id = public.get_auth_user_org_id()
    );

-- B) Insert (Any member can strictly insert ONLY for their own org)
CREATE POLICY "Admins can create subscription" ON public.subscriptions
    FOR INSERT
    WITH CHECK (
        organization_id = public.get_auth_user_org_id()
    );

-- C) Update (Any member can update status/plan of their own org's subscription)
CREATE POLICY "Admins can update subscription" ON public.subscriptions
    FOR UPDATE
    USING (
        organization_id = public.get_auth_user_org_id()
    );
