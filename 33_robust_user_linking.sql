-- ROBUST USER LINKING SCRIPT

DO $$
DECLARE
    main_user_id UUID;
    main_org_id UUID;
    v_count INTEGER;
BEGIN
    -- 1. Get Main User ID
    SELECT id INTO main_user_id FROM public.profiles WHERE email = 'torneriajosemar@gmail.com';
    
    IF main_user_id IS NULL THEN
        RAISE NOTICE 'Main user torneriajosemar@gmail.com NOT FOUND.';
        RETURN;
    END IF;

    -- 2. Get Main User's Organization
    SELECT organization_id INTO main_org_id FROM public.profiles WHERE id = main_user_id;

    -- 3. If No Organization, Create One and Assign
    IF main_org_id IS NULL THEN
        RAISE NOTICE 'Main user has no organization. Creating one...';
        
        INSERT INTO public.organizations (name) VALUES ('Tornería Josemar')
        RETURNING id INTO main_org_id;
        
        UPDATE public.profiles SET organization_id = main_org_id WHERE id = main_user_id;
    ELSE
        RAISE NOTICE 'Main user organization found: %', main_org_id;
    END IF;

    -- 4. Link Secretary (Administrativo)
    UPDATE public.profiles
    SET organization_id = main_org_id, role = 'administrativo'
    WHERE email = 'admtorneriajosemar@gmail.com';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Updated % rows for Secretary.', v_count;

    -- 5. Link Production (Operario)
    UPDATE public.profiles
    SET organization_id = main_org_id, role = 'operario'
    WHERE email = 'prodtorneriajosemar@gmail.com';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Updated % rows for Production.', v_count;

END $$;
