-- FIX ORGANIZATIONS SCHEMA (FINAL)
-- The RPC fails because 'updated_at' is missing in 'organizations'.

-- 1. Add 'updated_at'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'updated_at') THEN
        ALTER TABLE public.organizations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Add 'created_at' (Just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'created_at') THEN
        ALTER TABLE public.organizations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Fix Data (Ensure no nulls)
UPDATE public.organizations SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE public.organizations SET created_at = NOW() WHERE created_at IS NULL;
