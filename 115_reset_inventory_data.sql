-- 115_reset_inventory_data.sql

-- WARNING: This script clears all Purchase and Inventory History!
-- Use this to "Start Fresh" as requested.

BEGIN;

-- 1. Delete all Purchase Orders (Cascades to Items)
DELETE FROM public.purchase_orders;

-- 2. Delete all Stock Movements (Physical history)
DELETE FROM public.stock_movements;

-- 3. Reset Product Stock to 0
UPDATE public.products SET current_stock = 0;

-- 4. Reset Received Quantity in PO Items (if any remained, but they are deleted above)
-- (No need, strictly cascade)

COMMIT;

-- Ensure the fix for receipt processing is applied (re-run just in case)
-- We repeat the permission fix here to be absolutely sure.
create or replace function public.process_purchase_receipt(p_po_id uuid, p_user_id uuid)
returns void as $$
declare
  r_item record;
  v_org_id uuid;
begin
  -- Get Org ID
  select organization_id into v_org_id from public.purchase_orders where id = p_po_id;
  
  -- Update Status
  update public.purchase_orders set status = 'received' where id = p_po_id;

  -- Loop items
  for r_item in select * from public.purchase_order_items where po_id = p_po_id
  loop
    -- Add to Stock
    update public.products 
    set current_stock = current_stock + r_item.quantity 
    where id = r_item.product_id;

    -- Create Movement Log
    insert into public.stock_movements (organization_id, product_id, type, quantity, reference_id, notes, user_id)
    values (v_org_id, r_item.product_id, 'in', r_item.quantity, p_po_id, 'Compra recibida', p_user_id);
    
    -- Mark received quantity
    update public.purchase_order_items set received_quantity = quantity where id = r_item.id;
  end loop;
end;
$$ language plpgsql security definer;
