-- 1. FIX MISSING PROFILE
-- Attempt to insert profile from auth.users if it doesn't exist
INSERT INTO public.profiles (id, email, role, created_at)
SELECT 
    id, 
    email, 
    'admin' as role,
    created_at
FROM auth.users
WHERE email = 'leandrobyb@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
);

-- 2. GRANT SUPER ADMIN
UPDATE public.profiles 
SET is_super_admin = TRUE 
WHERE email = 'leandrobyb@gmail.com';

-- 3. GLOBAL RLS POLICIES FOR SUPER ADMIN

-- Allow Super Admin to VIEW ALL Organizations
DROP POLICY IF EXISTS "Super Admin view all orgs" ON public.organizations;
CREATE POLICY "Super Admin view all orgs" ON public.organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = TRUE
        )
    );

-- Allow Super Admin to VIEW ALL Profiles (Users)
DROP POLICY IF EXISTS "Super Admin view all profiles" ON public.profiles;
CREATE POLICY "Super Admin view all profiles" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = TRUE
        )
    );

-- Allow Super Admin to VIEW ALL Plans (Done previously, but ensuring)
-- (Already covered by "Anyone can view active plans" or "Super Admins can manage plans")

-- Verification
SELECT * FROM public.profiles WHERE email = 'leandrobyb@gmail.com';
