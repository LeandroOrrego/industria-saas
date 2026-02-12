-- ENSURE ORGANIZATIONS SCHEMA AND RLS
-- This script repairs the organizations table and ensures permissions for Onboarding.

-- 1. Ensure Columns Exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'tax_id') THEN
        ALTER TABLE public.organizations ADD COLUMN tax_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'industry') THEN
        ALTER TABLE public.organizations ADD COLUMN industry TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address') THEN
        ALTER TABLE public.organizations ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'phone') THEN
        ALTER TABLE public.organizations ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 2. RLS Policies for Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Allow insert (anyone authenticated can create an organization, usually via RPC but permissive RLS helps)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow update (Members of the org can update it)
DROP POLICY IF EXISTS "Members can update their organization" ON public.organizations;
CREATE POLICY "Members can update their organization" ON public.organizations
    FOR UPDATE
    USING (
        id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Allow select (Members can view their organization)
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;
CREATE POLICY "Members can view their organization" ON public.organizations
    FOR SELECT
    USING (
        id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
