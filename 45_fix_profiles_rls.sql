-- FIX PROFILES RLS
-- The error "No se pudo cargar el perfil" almost certainly means the SELECT query returned no rows due to RLS blocking it.

-- 1. Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. Create Permissive Policies for Owners

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING ( auth.uid() = id );

-- Allow insertion (triggers usually invoke this with security definer, so this might not be strictly needed for the trigger, but good for client-side registration fallback)
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT
    WITH CHECK ( auth.uid() = id );

-- Allow reading ALL profiles if user belongs to same organization (needed for Roles page, etc.)
CREATE POLICY "Users can view organization members" ON public.profiles
    FOR SELECT
    USING ( 
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );
