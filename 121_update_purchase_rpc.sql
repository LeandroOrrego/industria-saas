-- 121_update_purchase_rpc.sql

CREATE OR REPLACE FUNCTION public.update_purchase_order(
    p_po_id UUID,
    p_provider_id UUID,
    p_date DATE,
    p_invoice_number TEXT,
    p_invoice_type TEXT,
    p_payment_method TEXT,
    p_description TEXT,
    p_notes TEXT,
    p_total_amount NUMERIC,
    p_iva_5 NUMERIC,
    p_iva_10 NUMERIC,
    p_exempt NUMERIC,
    p_items JSONB, -- Array of objects: { product_id, quantity, unit_price }
    p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
    v_item JSONB;
    v_old_item RECORD;
BEGIN
    -- 1. Get current status
    SELECT status INTO v_old_status FROM public.purchase_orders WHERE id = p_po_id;
    
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'Purchase Order not found';
    END IF;

    -- 2. If Received, Revert Stock for OLD items
    IF v_old_status = 'received' THEN
        FOR v_old_item IN SELECT * FROM public.purchase_order_items WHERE po_id = p_po_id LOOP
            -- Decrease stock (revert the addition)
            UPDATE public.products 
            SET current_stock = current_stock - v_old_item.received_quantity
            WHERE id = v_old_item.product_id;
        END LOOP;
    END IF;

    -- 3. Delete Old Items
    DELETE FROM public.purchase_order_items WHERE po_id = p_po_id;

    -- 4. Update Header
    UPDATE public.purchase_orders SET
        provider_id = p_provider_id,
        order_date = p_date,
        delivery_date = p_date,
        invoice_number = p_invoice_number,
        invoice_type = p_invoice_type,
        payment_method = p_payment_method::payment_method,
        description = p_description,
        notes = p_notes,
        total_amount = p_total_amount,
        iva_5 = p_iva_5,
        iva_10 = p_iva_10,
        exempt_amount = p_exempt,
        updated_at = NOW()
    WHERE id = p_po_id;

    -- 5. Insert New Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO public.purchase_order_items (
            po_id,
            product_id,
            quantity,
            unit_price,
            received_quantity
        ) VALUES (
            p_po_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            CASE WHEN v_old_status = 'received' THEN (v_item->>'quantity')::NUMERIC ELSE 0 END
        );

        -- 6. If Received, Add Stock for NEW items
        IF v_old_status = 'received' THEN
            UPDATE public.products 
            SET current_stock = current_stock + (v_item->>'quantity')::NUMERIC
            WHERE id = (v_item->>'product_id')::UUID;
        END IF;
    END LOOP;

    -- 7. Sync Transaction
    -- Handled by trigger `sync_purchase_to_transaction` on purchase_orders.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
