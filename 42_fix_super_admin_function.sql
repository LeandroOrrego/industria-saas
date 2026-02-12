-- FIX SUPER ADMIN FUNCTION
-- This function is required by the RLS policies on saas_bank_accounts.
-- If it's missing, the Admin page will crash.

CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_super BOOLEAN;
BEGIN
    SELECT is_super_admin INTO is_super
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(is_super, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply policies to be safe
DROP POLICY IF EXISTS "Super Admins can manage bank accounts" ON public.saas_bank_accounts;

CREATE POLICY "Super Admins can manage bank accounts" ON public.saas_bank_accounts
    FOR ALL
    USING (
        public.check_is_super_admin() = TRUE
    );
