-- ENSURE FLOW SCHEMA AND TRIGGERS

-- 1. Add 'onboarding_completed' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Ensure User Creation Trigger exists and is working
-- This is critical for Register.tsx to work (it updates the profile created here)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name',
        'operario' -- Default role, updated to 'admin' by Register.tsx if creating org
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to be sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
