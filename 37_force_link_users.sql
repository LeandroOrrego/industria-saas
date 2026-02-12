-- FORCE LINK USERS TO FRESH ORGANIZATION

DO $$
DECLARE
    new_org_id UUID;
    v_count INTEGER;
BEGIN
    -- 1. Create a FRESH Organization to avoid any confusion with duplicates
    INSERT INTO public.organizations (name) 
    VALUES ('Tornería Josemar - Principal')
    RETURNING id INTO new_org_id;

    RAISE NOTICE 'Created new Organization ID: %', new_org_id;

    -- 2. Link ADMIN User
    UPDATE public.profiles
    SET organization_id = new_org_id, role = 'admin'
    WHERE email = 'torneriajosemar@gmail.com';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Linked Admin (torneriajosemar@gmail.com): % rows', v_count;

    -- 3. Link SECRETARY User
    UPDATE public.profiles
    SET organization_id = new_org_id, role = 'administrativo'
    WHERE email = 'admtorneriajosemar@gmail.com';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Linked Secretary (admtorneriajosemar@gmail.com): % rows', v_count;

    -- 4. Link PRODUCTION User
    UPDATE public.profiles
    SET organization_id = new_org_id, role = 'operario'
    WHERE email = 'prodtorneriajosemar@gmail.com';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Linked Production (prodtorneriajosemar@gmail.com): % rows', v_count;

    -- 5. Final Safety Check on RLS Policy (Re-applying with logging)
    -- Ensure the function exists and is correct
    EXECUTE '
        CREATE OR REPLACE FUNCTION public.get_auth_user_organization_id()
        RETURNS UUID AS $f$
        BEGIN
            RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
        END;
        $f$ LANGUAGE plpgsql SECURITY DEFINER;
    ';

    -- Ensure policy uses it
    EXECUTE 'DROP POLICY IF EXISTS "Users can view members of their own organization" ON public.profiles';
    EXECUTE '
        CREATE POLICY "Users can view members of their own organization" ON public.profiles
        FOR SELECT
        USING (
            organization_id = public.get_auth_user_organization_id()
        )
    ';

END $$;
