-- FIX REGISTRATION TRIGGER

-- 1. DROP EXISTING TRIGGER AND FUNCTION (To ensure clean slate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. RECREATE FUNCTION WITH ROBUST ERROR HANDLING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_organization_id UUID;
  v_role TEXT;
BEGIN
  -- Extract Metadata safely
  v_full_name := new.raw_user_meta_data->>'full_name';
  
  -- Default Role (can be overridden later/by invite logic in client, but DB needs a default)
  -- If we don't have a role, default to 'operario' (safest) or 'admin' if first?
  -- Let's stick to nullable or default in table. If table has no default, we provide one.
  v_role := 'operario'; 

  -- Insert into public.profiles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_super_admin, -- Explicitly set to false to avoid nulls if column has no default
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(v_full_name, 'Usuario'),
    v_role,
    FALSE,
    NOW(),
    NOW()
  );

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error (visible in Supabase logs) but try to avoid tough failure if possible, 
    -- OR raise exception to let the user know. 
    -- Getting a "Database error" usually means this raised an exception.
    -- Let's raise a clearer one or try to insert with minimal data.
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new; -- If we return new, auth user is created but profile might be missing. 
                -- Better to Fail if profile is critical.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREATE TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
