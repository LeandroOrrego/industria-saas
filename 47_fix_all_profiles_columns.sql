-- FIX ALL PROFILES COLUMNS AND DEFAULTS
-- This script ensures the profiles table has ALL columns expected by the application code.

-- 1. full_name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- 2. is_super_admin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_super_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. organization_id (Constraint)
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
END $$;

-- 5. onboarding_completed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 6. Set Defaults/Repair Data
UPDATE public.profiles SET full_name = 'Usuario' WHERE full_name IS NULL;
UPDATE public.profiles SET is_super_admin = FALSE WHERE is_super_admin IS NULL;
UPDATE public.profiles SET onboarding_completed = FALSE WHERE onboarding_completed IS NULL;

-- 7. Fix Trigger to include onboarding_completed default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  v_full_name := new.raw_user_meta_data->>'full_name';
  v_role := 'operario'; 

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_super_admin,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(v_full_name, 'Usuario'),
    v_role,
    FALSE,
    FALSE,
    NOW(),
    NOW()
  );

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
