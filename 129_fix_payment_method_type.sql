-- 129_fix_payment_method_type.sql

-- The 'payments' table was created with a custom ENUM type for 'payment_method' in a previous migration or manually.
-- The application sends string values like 'efectivo', 'transferencia', 'cheque', 'tarjeta'.
-- To avoid type mismatch errors (column "payment_method" is of type payment_method but expression is of type text),
-- and to allow storing these Spanish values directly, we will convert the column to TEXT.

-- We use a generic alter statement. attempting to drop the default if it uses the enum (unlikely but good practice)
-- and then altering the type with a cast.

BEGIN;

-- 1. Alter the column to TEXT
ALTER TABLE public.payments 
ALTER COLUMN payment_method TYPE TEXT;

-- 2. Drop the custom type if it's no longer used (Optional, but cleaner)
-- We wrap in a block to avoid error if it's used elsewhere
DO $$
BEGIN
    -- Check if type exists and is not used by other tables (simple check)
    -- For safety, we might just leave the type exist, but we can try to drop properly.
    -- However, dropping types can be risky if used in functions. 
    -- We will just leave the type for now to be safe, verifying only the column change is critical.
END $$;

COMMIT;
