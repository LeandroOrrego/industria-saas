-- ADD PRODUCT PRICES
-- User requested Cost Price and Sale Price.

-- 1. Add 'cost_price'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE public.products ADD COLUMN cost_price NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 2. Add 'sale_price'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_price') THEN
        ALTER TABLE public.products ADD COLUMN sale_price NUMERIC DEFAULT 0;
    END IF;
END $$;
