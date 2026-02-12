-- FIX ONBOARDING RPC (V2)
-- This function is called by the Onboarding page to create an organization and link the user.

-- 1. DROP EXISTING FUNCTION (Required if return type changes)
DROP FUNCTION IF EXISTS public.create_organization_for_user(text,text,text,text,text);

-- 2. CREATE FUNCTION
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
    org_name TEXT,
    org_tax_id TEXT,
    org_industry TEXT,
    org_address TEXT,
    org_phone TEXT
)
RETURNS public.organizations AS $$
DECLARE
    new_org public.organizations;
BEGIN
    -- 1. Create Organization
    INSERT INTO public.organizations (
        name,
        tax_id,
        industry,
        address,
        phone,
        created_at,
        updated_at
    )
    VALUES (
        org_name,
        org_tax_id,
        org_industry,
        org_address,
        org_phone,
        NOW(),
        NOW()
    )
    RETURNING * INTO new_org;

    -- 2. Link User to Organization and Mark Onboarding Complete
    -- We use auth.uid() so this is secure.
    UPDATE public.profiles
    SET 
        organization_id = new_org.id,
        onboarding_completed = TRUE,
        role = 'admin', -- Force admin role for the creator
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN new_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER is key: it allows the function to bypass RLS on the profiles update if the user strictly couldn't do it otherwise (though we fixed RLS, this is double safety).

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO authenticated;
