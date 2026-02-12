-- 119_enhance_purchase_sync.sql

-- 1. Create or Update Function to include contact_id, document_number, category_id
CREATE OR REPLACE FUNCTION public.sync_purchase_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_desc text;
    v_payment_method text;
    v_category_id uuid;
BEGIN
    v_desc := 'Compra Factura ' || COALESCE(NEW.invoice_number, 'S/N') || ' - ' || (SELECT name FROM public.providers WHERE id = NEW.provider_id);
    v_payment_method := COALESCE(NEW.payment_method, 'cash');
    
    if v_payment_method = 'credit_card' then
        v_payment_method := 'card';
    end if;

    -- Find 'Compras Insumos' category or fallback to any expense category
    SELECT id INTO v_category_id FROM public.transaction_categories 
    WHERE organization_id = NEW.organization_id 
    AND type = 'expense' 
    AND name ILIKE '%Compras%' 
    LIMIT 1;

    -- If not found, try any expense category
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id FROM public.transaction_categories 
        WHERE organization_id = NEW.organization_id 
        AND type = 'expense' 
        LIMIT 1;
    END IF;

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
                created_by,
                category_id,       -- NEW
                contact_id,        -- NEW
                contact_type,      -- NEW
                document_number    -- NEW
            ) VALUES (
                NEW.organization_id,
                v_desc,
                'expense',
                NEW.total_amount,
                v_payment_method,
                NEW.order_date::timestamp,
                auth.uid(),
                v_category_id,
                NEW.provider_id,
                'provider',
                NEW.invoice_number
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
