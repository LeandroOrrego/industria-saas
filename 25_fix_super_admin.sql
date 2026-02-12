-- 1. Remove Super Admin from 'torneriajosemar'
UPDATE public.profiles 
SET is_super_admin = FALSE 
WHERE email = 'torneriajosemar@gmail.com';

-- 2. Grant Super Admin to 'leandrobyb'
-- NOTE: This assumes 'leandrobyb@gmail.com' has already registered and exists in the profiles table.
-- If not, you must register first, then run this script.
UPDATE public.profiles 
SET is_super_admin = TRUE 
WHERE email = 'leandrobyb@gmail.com';

-- Verification (Optional)
SELECT email, role, is_super_admin FROM public.profiles WHERE email IN ('torneriajosemar@gmail.com', 'leandrobyb@gmail.com');
