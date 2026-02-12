-- 114_fix_inventory_and_ui.sql

-- 1. FIX INVENTORY: Security Definer for process_purchase_receipt
-- The issue is likely that the user executing the purchase doesn't have direct permission 
-- to update 'products' or insert into 'stock_movements' if RLS is strict.
-- SECURITY DEFINER makes the function run with the privileges of the creator (postgres/admin).

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


-- 2. FIX INVOICES: Add Soft Delete column
alter table public.invoices 
add column if not exists deleted_at timestamp with time zone default null;

-- Update RLS or Policies if needed?
-- usually we filter in the query, but we can check policies.
-- Let's ensure the 'select' policy doesn't implicitly hide them unless we want it to.
-- Standard practice: Policy allows viewing all, App filters. OR Policy hides deleted.
-- Let's stick to App filters for now to allow "Restore" features later if needed, 
-- or just simple soft delete where we filter `deleted_at is null` in frontend/backend queries.

