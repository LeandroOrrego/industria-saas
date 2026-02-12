-- FIX VISIBILITY AND CLEANUP DUPLICATES

-- 1. FIX RLS: Allow users to see other members of their organization
-- (This explains why they are linked but you can't see them in the list)
DROP POLICY IF EXISTS "Users can view members of their own organization" ON public.profiles;

CREATE POLICY "Users can view members of their own organization" ON public.profiles
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. CLEANUP: Delete empty organizations (duplicates) to reduce confusion
-- Deletes organizations that have NO matching profile user
DELETE FROM public.organizations 
WHERE id NOT IN (SELECT DISTINCT organization_id FROM public.profiles WHERE organization_id IS NOT NULL);

-- 3. VALIDATION: Output the current state to the message log
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- CURRENT USER LINKS ---';
    FOR r IN 
        SELECT email, role, organization_id, 
               (SELECT name FROM public.organizations WHERE id = profiles.organization_id) as org_name
        FROM public.profiles 
        WHERE email IN ('torneriajosemar@gmail.com', 'admtorneriajosemar@gmail.com', 'prodtorneriajosemar@gmail.com')
    LOOP
        RAISE NOTICE 'User: %, Role: %, Org: % (%)', r.email, r.role, r.org_name, r.organization_id;
    END LOOP;
    
    RAISE NOTICE '--- END ---';
END $$;
