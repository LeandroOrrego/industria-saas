-- FINAL FIX FOR PRODUCTS VISIBILITY
-- 1. Ensure 'deleted_at' column exists (Crucial for the new filter)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.products ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 2. Ensure 'type' and 'unit' are TEXT (fix enum issues)
ALTER TABLE public.products 
    ALTER COLUMN type TYPE TEXT USING type::text,
    ALTER COLUMN type SET DEFAULT 'Material';

ALTER TABLE public.products 
    ALTER COLUMN unit TYPE TEXT USING unit::text,
    ALTER COLUMN unit SET DEFAULT 'u';

-- 3. Ensure RLS Policy allows reading rows where deleted_at IS NULL
DROP POLICY IF EXISTS "Users can view products" ON public.products;

CREATE POLICY "Users can view products" ON public.products
    FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        -- We do NOT filter deleted_at here strictly, we filter in the query usually, 
        -- but we can enforce it here if we want soft-delete to be absolute.
        -- For now, we prefer application-level filtering or broad RLS.
    );

-- 4. Verify existing products don't have weird data
UPDATE public.products SET deleted_at = NULL WHERE deleted_at IS NOT NULL AND deleted_at > NOW(); -- Cleanup future dates if any? No, just ensuring.
