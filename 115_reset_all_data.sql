-- 115_reset_all_data.sql

-- MASTER RESET SCRIPT
-- Clears all transactional data to start operations from scratch.
-- Preserves Master Data: Clients, Products, Providers, Employees, Settings.

BEGIN;

-- 1. Operations (Service Orders)
DELETE FROM public.service_order_items;
DELETE FROM public.service_orders;

-- 2. Finance (Invoices & Transactions)
DELETE FROM public.invoice_lines;
DELETE FROM public.invoices;
DELETE FROM public.transactions; 

-- 3. Inventory (Purchases & Stock Movements)
DELETE FROM public.stock_movements;
DELETE FROM public.purchase_order_items;
DELETE FROM public.purchase_orders;

-- 4. Reset Product Stock
UPDATE public.products SET current_stock = 0;

-- 5. Payroll (Optional: if we had a table for history, delete it here)
-- DELETE FROM public.payroll_history; -- (Future proofing)

COMMIT;

-- Re-apply Important Fixes (Just in case)

-- Ensure Inventory Update Permissions
create or replace function public.process_purchase_receipt(p_po_id uuid, p_user_id uuid)
returns void as $$
declare
  r_item record;
  v_org_id uuid;
begin
  select organization_id into v_org_id from public.purchase_orders where id = p_po_id;
  update public.purchase_orders set status = 'received' where id = p_po_id;

  for r_item in select * from public.purchase_order_items where po_id = p_po_id
  loop
    update public.products 
    set current_stock = current_stock + r_item.quantity 
    where id = r_item.product_id;

    insert into public.stock_movements (organization_id, product_id, type, quantity, reference_id, notes, user_id)
    values (v_org_id, r_item.product_id, 'in', r_item.quantity, p_po_id, 'Compra recibida', p_user_id);
    
    update public.purchase_order_items set received_quantity = quantity where id = r_item.id;
  end loop;
end;
$$ language plpgsql security definer;
