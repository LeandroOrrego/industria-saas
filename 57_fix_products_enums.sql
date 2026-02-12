-- FIX PRODUCTS ENUMS
-- The current ENUMs ('ferreteria', 'material') are too restrictive.
-- We convert them to TEXT to support 'Insumo', 'Herramienta', 'Producto Final' etc.

-- 1. Convert 'type' to TEXT
ALTER TABLE public.products 
    ALTER COLUMN type TYPE TEXT USING type::text,
    ALTER COLUMN type SET DEFAULT 'Material';

-- 2. Convert 'unit' to TEXT
ALTER TABLE public.products 
    ALTER COLUMN unit TYPE TEXT USING unit::text,
    ALTER COLUMN unit SET DEFAULT 'u';

-- 3. Drop the old types if they are no longer used (Optional, safe to keep mostly)
-- DROP TYPE IF EXISTS product_type;
-- DROP TYPE IF EXISTS unit_type;
