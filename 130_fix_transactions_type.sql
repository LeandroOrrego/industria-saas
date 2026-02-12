-- 130_fix_transactions_type.sql

-- The error "column 'payment_method' is of type payment_method but expression is of type text" 
-- indicates that the target table (transactions) or others still use the custom ENUM type.
-- We must convert ALL tables using this column to TEXT to allow free-form Spanish values.

BEGIN;

-- 1. Fix Transactions Table (This is likely the cause of the trigger error)
ALTER TABLE public.transactions 
ALTER COLUMN payment_method TYPE TEXT;

-- 2. Fix Purchase Orders Table (Just in case)
ALTER TABLE public.purchase_orders 
ALTER COLUMN payment_method TYPE TEXT;

-- 3. Fix Payments Table (Redundant if 129 was run, but ensures consistency)
ALTER TABLE public.payments 
ALTER COLUMN payment_method TYPE TEXT;

COMMIT;
