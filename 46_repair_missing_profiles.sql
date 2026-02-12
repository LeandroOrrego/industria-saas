-- REPAIR MISSING PROFILES & COLUMNS (FINAL VERSION)
-- This script ensures the profiles table has the required structure before attempting repairs.

-- 1. Ensure 'full_name' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- 2. Ensure 'is_super_admin' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_super_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Ensure 'updated_at' column exists (Error fix)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. REPAIR ZOMBIE USERS
-- Insert into profiles users that exist in auth.users but not in profiles
INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    is_super_admin, 
    created_at, 
    updated_at
)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'Usuario Recuperado'), 
    'admin', -- Default to admin for these recovered users
    FALSE,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.profiles);

-- 5. Fix any existing nulls in new columns
UPDATE public.profiles SET full_name = 'Usuario' WHERE full_name IS NULL;
UPDATE public.profiles SET is_super_admin = FALSE WHERE is_super_admin IS NULL;
UPDATE public.profiles SET updated_at = NOW() WHERE updated_at IS NULL;
