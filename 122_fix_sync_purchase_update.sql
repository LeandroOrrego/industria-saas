-- 122_fix_sync_purchase_update.sql

CREATE OR REPLACE FUNCTION public.sync_purchase_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_desc text;
    v_payment_method text;
    v_category_id uuid;
    v_old_desc text; -- To find existing
BEGIN
    -- Determine Description
    IF NEW.description IS NOT NULL AND NEW.description <> '' THEN
        v_desc := NEW.description;
    ELSE
        v_desc := 'Compra Factura ' || COALESCE(NEW.invoice_number, 'S/N') || ' - ' || (SELECT name FROM public.providers WHERE id = NEW.provider_id);
    END IF;

    v_payment_method := COALESCE(NEW.payment_method::text, 'cash');
    if v_payment_method = 'credit_card' then v_payment_method := 'card'; end if;

    SELECT id INTO v_category_id FROM public.transaction_categories 
    WHERE organization_id = NEW.organization_id AND type = 'expense' AND name ILIKE '%Compras%' LIMIT 1;
    
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id FROM public.transaction_categories WHERE organization_id = NEW.organization_id AND type = 'expense' LIMIT 1;
    END IF;

    IF NEW.invoice_type = 'Contado' AND NEW.status IN ('ordered', 'received') AND NEW.deleted_at IS NULL THEN
        -- Try to UPDATE existing transaction based on somewhat unique fields (Document Number + Provider)
        -- Note: If user changes Invoice Number, we might lose track. 
        -- Ideally we'd have a link column `purchase_order_id` in transactions. 
        -- Since we don't, we try best effort match by OLD values (not available in AFTER trigger easily without accessing OLD, distinct from NEW).
        -- Trigger has access to OLD.
        
        IF TG_OP = 'UPDATE' THEN
            -- Try to find by OLD invoice number
            UPDATE public.transactions SET
                description = v_desc,
                amount = NEW.total_amount,
                payment_method = v_payment_method::payment_method,
                transaction_date = NEW.order_date::timestamp,
                category_id = v_category_id,
                contact_id = NEW.provider_id,
                contact_type = 'provider',
                document_number = NEW.invoice_number
            WHERE 
                organization_id = NEW.organization_id 
                AND (document_number = OLD.invoice_number OR (description LIKE 'Compra Factura ' || OLD.invoice_number || '%'));
                
            -- If no row updated (maybe it didn't exist), Insert?
            IF NOT FOUND THEN
                 INSERT INTO public.transactions (
                    organization_id, description, type, amount, payment_method, transaction_date, created_by, category_id, contact_id, contact_type, document_number
                ) VALUES (
                    NEW.organization_id, v_desc, 'expense', NEW.total_amount, v_payment_method::payment_method, NEW.order_date::timestamp, auth.uid(), v_category_id, NEW.provider_id, 'provider', NEW.invoice_number
                );
            END IF;
        ELSE
            -- INSERT case
            IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE document_number = NEW.invoice_number AND organization_id = NEW.organization_id) THEN
                INSERT INTO public.transactions (
                    organization_id, description, type, amount, payment_method, transaction_date, created_by, category_id, contact_id, contact_type, document_number
                ) VALUES (
                    NEW.organization_id, v_desc, 'expense', NEW.total_amount, v_payment_method::payment_method, NEW.order_date::timestamp, auth.uid(), v_category_id, NEW.provider_id, 'provider', NEW.invoice_number
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
