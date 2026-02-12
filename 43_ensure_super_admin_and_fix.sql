-- ENSURE SUPER ADMIN COLUMN AND FIX

-- 1. Add 'is_super_admin' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_super_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update the function to be absolutely safe
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_super BOOLEAN;
BEGIN
    -- Select the column safely
    SELECT is_super_admin INTO is_super
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Return false if null or false, true only if true
    RETURN COALESCE(is_super, FALSE);
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs (e.g. column missing), return false
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Make YOU a super admin (update based on your current user)
-- This tries to update the user running the script (if run via dashboard SQL editor this might not work as 'auth.uid()' is generic, but the user requested 'leandrobyb@gmail.com' preserved previously)
-- Better: Force update for known emails
UPDATE public.profiles
SET is_super_admin = TRUE
WHERE email IN ('torneriajosemar@gmail.com', 'leandrobyb@gmail.com');
