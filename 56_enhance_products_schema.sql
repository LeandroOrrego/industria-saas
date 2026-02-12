-- ENHANCE PRODUCTS SCHEMA
-- User requested 'type' and 'unit' fields for products.

-- 1. Ensure columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'type') THEN
        ALTER TABLE public.products ADD COLUMN type TEXT DEFAULT 'Material';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'unit') THEN
        ALTER TABLE public.products ADD COLUMN unit TEXT DEFAULT 'u';
    END IF;
END $$;

-- 2. Ensure RLS allows INSERT (Creating Products)
DROP POLICY IF EXISTS "Users can create products" ON public.products;

CREATE POLICY "Users can create products" ON public.products
    FOR INSERT
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- 3. Ensure RLS allows UPDATE (Editing Products)
DROP POLICY IF EXISTS "Users can update products" ON public.products;

CREATE POLICY "Users can update products" ON public.products
    FOR UPDATE
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
