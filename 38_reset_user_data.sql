-- CLEAN SLATE RESET SCRIPT (ROBUST & SAFE VERSION)
-- WARNING: THIS DELETES ALL COMPANY DATA. USE WITH CAUTION.
-- PRESERVES USER: leandrobyb@gmail.com

DO $$
BEGIN

    -- 1. Delete Transactional/Operational Data
    BEGIN DELETE FROM public.work_logs; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table work_logs missing, skipping.'; END;
    BEGIN DELETE FROM public.service_orders; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table service_orders missing, skipping.'; END;
    BEGIN DELETE FROM public.machinery; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table machinery missing, skipping.'; END;
    BEGIN DELETE FROM public.purchases; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table purchases missing, skipping.'; END;
    BEGIN DELETE FROM public.inventory_movements; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table inventory_movements missing, skipping.'; END;
    BEGIN DELETE FROM public.products; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table products missing, skipping.'; END;
    BEGIN DELETE FROM public.clients; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table clients missing, skipping.'; END;
    BEGIN DELETE FROM public.providers; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table providers missing, skipping.'; END;

    -- 2. Delete Billing/SaaS Data
    BEGIN DELETE FROM public.saas_invoices; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table saas_invoices missing, skipping.'; END;
    BEGIN DELETE FROM public.subscriptions; EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'Table subscriptions missing, skipping.'; END;

    -- 3. Delete Permissions & Roles
    -- Only delete permissions for users that we are about to delete
    BEGIN 
        DELETE FROM public.user_permissions 
        WHERE user_id IN (SELECT id FROM public.profiles WHERE email != 'leandrobyb@gmail.com');
    EXCEPTION WHEN undefined_table THEN 
        RAISE NOTICE 'Table user_permissions missing, skipping.'; 
    END;

    -- 4. Delete Users & Organizations
    RAISE NOTICE 'Deleting profiles except leandrobyb@gmail.com...';
    
    BEGIN 
        DELETE FROM public.profiles 
        WHERE email != 'leandrobyb@gmail.com'; 
    EXCEPTION WHEN undefined_table THEN 
        RAISE NOTICE 'Table profiles missing, skipping.'; 
    END;

    RAISE NOTICE 'Deleting orphan organizations...';

    BEGIN 
        -- Delete organizations that have NO matching profile user
        -- This preserves the organization of 'leandrobyb@gmail.com' if it exists and they are linked to it.
        DELETE FROM public.organizations 
        WHERE id NOT IN (SELECT DISTINCT organization_id FROM public.profiles WHERE organization_id IS NOT NULL);
    EXCEPTION WHEN undefined_table THEN 
        RAISE NOTICE 'Table organizations missing, skipping.'; 
    END;

    RAISE NOTICE 'Cleanup completed. User leandrobyb@gmail.com preserved.';
END $$;
