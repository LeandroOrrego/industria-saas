-- Manual Link of Users to Main Organization

-- 1. Updates for 'admtorneriajosemar@gmail.com' (Secretaria -> Administrativo)
UPDATE public.profiles
SET 
    organization_id = (SELECT organization_id FROM public.profiles WHERE email = 'torneriajosemar@gmail.com' LIMIT 1),
    role = 'administrativo'
WHERE email = 'admtorneriajosemar@gmail.com';

-- 2. Updates for 'prodtorneriajosemar@gmail.com' (Producción -> Operario)
UPDATE public.profiles
SET 
    organization_id = (SELECT organization_id FROM public.profiles WHERE email = 'torneriajosemar@gmail.com' LIMIT 1),
    role = 'operario'
WHERE email = 'prodtorneriajosemar@gmail.com';

-- 3. Verify the updates (Optional select to double check)
SELECT email, role, organization_id FROM public.profiles 
WHERE email IN ('torneriajosemar@gmail.com', 'admtorneriajosemar@gmail.com', 'prodtorneriajosemar@gmail.com');
