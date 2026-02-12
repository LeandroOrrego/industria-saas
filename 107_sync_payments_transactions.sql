-- 107_sync_payments_transactions.sql

-- Function to sync payments to transactions
create or replace function public.sync_payment_to_transaction()
returns trigger as $$
declare
  v_invoice_number text;
  v_client_name text;
  v_client_id uuid;
  v_org_id uuid;
  v_desc text;
  v_category_id uuid;
begin
  -- Get Invoice Details
  select i.invoice_number, c.name, i.client_id, i.organization_id
  into v_invoice_number, v_client_name, v_client_id, v_org_id
  from public.invoices i
  left join public.clients c on i.client_id = c.id
  where i.id = NEW.invoice_id;

  v_desc := 'Cobro Factura ' || coalesce(v_invoice_number, 'Pendiente') || ' - ' || coalesce(v_client_name, 'Cliente');

  -- Get Category (Ventas or Servicios)
  select id into v_category_id
  from public.transaction_categories
  where organization_id = v_org_id 
    and (name = 'Ventas' OR name = 'Servicios') 
    and type = 'income'
  limit 1;

  -- Insert into transactions
  insert into public.transactions (
    organization_id,
    description,
    type,
    amount,
    payment_method,
    invoice_id,
    transaction_date,
    created_by,
    category_id,
    contact_id,
    contact_type,
    document_number
  ) values (
    v_org_id,
    v_desc,
    'income',
    NEW.amount,
    NEW.payment_method, -- Removed Enum Cast, now Text
    NEW.invoice_id,
    NEW.payment_date,
    NEW.created_by,
    v_category_id,
    v_client_id,
    'client',
    v_invoice_number
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists tr_sync_payment_transaction on public.payments;
create trigger tr_sync_payment_transaction
after insert on public.payments
for each row execute function public.sync_payment_to_transaction();
