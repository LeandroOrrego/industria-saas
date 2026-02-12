-- ADD SOFT DELETE TO PRODUCTS
-- User requested soft delete flow. We use 'deleted_at' column.

-- 1. Add column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.products ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;
