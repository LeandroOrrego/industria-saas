-- 123_fix_purchase_schema.sql

-- Add updated_at to purchase_orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'updated_at') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;
