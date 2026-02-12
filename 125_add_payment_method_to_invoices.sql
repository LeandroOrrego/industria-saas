-- 125_add_payment_method_to_invoices.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_method') THEN
        ALTER TABLE public.invoices ADD COLUMN payment_method TEXT DEFAULT 'cash';
    END IF;
END $$;
