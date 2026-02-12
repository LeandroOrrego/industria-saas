-- Fix Permissions for User Invitations
-- Issue: Enforce that users can update their own organization_id (used during invitation acceptance)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Check if the policy exists, drop it to be safe and re-create it properly
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Create Policy allowing users to update their own row
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());

-- 3. Ensure "Users can read own profile" (usually exists, but ensuring)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());
