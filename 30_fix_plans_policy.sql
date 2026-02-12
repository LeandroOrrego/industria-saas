-- Fix RLS Policies for Plans Table

-- 1. Ensure RLS is enabled
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 2. Drop potentially conflicting or broken policies
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plans;
DROP POLICY IF EXISTS "Super Admins can manage plans" ON public.plans;

-- 3. Re-create Public Read Policy (Authenticated Users can see ACTIVE plans)
CREATE POLICY "Anyone can view active plans" ON public.plans
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 4. Re-create Super Admin Management Policy (Can see ALL, edit ALL)
CREATE POLICY "Super Admins can manage plans" ON public.plans
    FOR ALL
    USING (
        check_is_super_admin() = TRUE
    );

-- 5. Safety Check: Ensure plans are actually active
UPDATE public.plans SET is_active = TRUE WHERE is_active IS NULL;
