-- 127_recalculate_stock.sql

-- Function to recalculate all stock based on history
CREATE OR REPLACE FUNCTION public.recalculate_inventory_levels()
RETURNS void AS $$
BEGIN
    -- 1. Reset all products to 0
    UPDATE public.products SET current_stock = 0;

    -- 2. Add stock from Received Purchases
    -- We sum up quantity from purchase_order_items where the parent order is 'received'
    WITH purchase_totals AS (
        SELECT 
            poi.product_id, 
            SUM(poi.quantity) as total_added
        FROM public.purchase_order_items poi
        JOIN public.purchase_orders po ON poi.po_id = po.id
        WHERE po.status = 'received'
        GROUP BY poi.product_id
    )
    UPDATE public.products p
    SET current_stock = current_stock + pt.total_added
    FROM purchase_totals pt
    WHERE p.id = pt.product_id;

    -- 3. Subtract stock from Service Orders (Consumption)
    -- We assume existence of a service_order_item implies consumption (unless we want to filter by status)
    -- Typically, if it's in the table, it's consumed/reserved.
    WITH usage_totals AS (
        SELECT 
            soi.product_id, 
            SUM(soi.quantity) as total_used
        FROM public.service_order_items soi
        JOIN public.service_orders so ON soi.os_id = so.id
        -- Removed invalid status check
        GROUP BY soi.product_id
    )
    UPDATE public.products p
    SET current_stock = current_stock - ut.total_used
    FROM usage_totals ut
    WHERE p.id = ut.product_id;

    -- 4. Apply Manual Stock Movements
    WITH movement_totals AS (
        SELECT 
            product_id,
            SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in,
            SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out
        FROM public.stock_movements
        GROUP BY product_id
    )
    UPDATE public.products p
    SET current_stock = current_stock + mt.total_in - mt.total_out
    FROM movement_totals mt
    WHERE p.id = mt.product_id;

END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation immediately
SELECT public.recalculate_inventory_levels();
