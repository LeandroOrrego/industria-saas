-- Debug: View all profiles similar to the target emails
SELECT id, email, role, organization_id 
FROM public.profiles 
WHERE email ILIKE '%torneriajosemar%';
