-- 118_fix_purchase_payment_method.sql

-- 1. Ensure purchase_orders has payment_method column as TEXT
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN payment_method TEXT DEFAULT 'cash';
    END IF;
END $$;

-- 2. Update the Sync Function to use the text value directly and strictly
CREATE OR REPLACE FUNCTION public.sync_purchase_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_desc text;
    v_payment_method text;
BEGIN
    -- Determine Description
    v_desc := 'Compra Factura ' || COALESCE(NEW.invoice_number, 'S/N') || ' - ' || (SELECT name FROM public.providers WHERE id = NEW.provider_id);
    
    -- Normalize Payment Method (Frontend uses 'card', 'cash', etc. DB might have enum or text)
    v_payment_method := COALESCE(NEW.payment_method, 'cash');
    
    -- Map 'credit_card' to 'card' just in case old frontend code sends it
    IF v_payment_method = 'credit_card' THEN
        v_payment_method := 'card';
    END IF;

    -- Only proceed if Contado and status is relevant
    IF NEW.invoice_type = 'Contado' AND NEW.status IN ('ordered', 'received') AND NEW.deleted_at IS NULL THEN
        
        -- Check for existing transaction to avoid duplicates (using composite key logic)
        IF NOT EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE description = v_desc 
            AND amount = NEW.total_amount 
            AND transaction_date = NEW.order_date::timestamp
        ) THEN
            INSERT INTO public.transactions (
                organization_id,
                description,
                type,
                amount,
                payment_method,
                transaction_date,
                created_by
            ) VALUES (
                NEW.organization_id,
                v_desc,
                'expense',
                NEW.total_amount,
                v_payment_method, -- Use the normalized text
                NEW.order_date::timestamp,
                auth.uid()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate Trigger to be sure
DROP TRIGGER IF EXISTS tr_sync_purchase_transaction ON public.purchase_orders;
CREATE TRIGGER tr_sync_purchase_transaction
AFTER INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_purchase_to_transaction();
