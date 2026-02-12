-- Add Billing Configuration to Organizations
-- This avoids creating a new single-row table per tenant
alter table public.organizations 
  add column if not exists tax_id text, -- RUC / CUIT
  add column if not exists legal_name text, -- Razon Social (might differ from display name)
  add column if not exists address text,
  add column if not exists logo_url text,
  add column if not exists current_timbrado text, -- Py Specific: Tax Auth Code
  add column if not exists timbrado_expiration date,
  add column if not exists next_invoice_number integer default 1,
  add column if not exists invoice_prefix text default '001-001'; -- Puntero

-- Enhanced Invoice Fields
alter table public.invoices
  add column if not exists timbrado text, -- Snapshot at moment of issuance
  add column if not exists vat_total numeric default 0, -- IVA sum
  add column if not exists discount_total numeric default 0;

-- Function to increment invoice number automatically
create or replace function get_next_invoice_number(p_org_id uuid)
returns text as $$
declare
  v_num integer;
  v_prefix text;
begin
  select next_invoice_number, invoice_prefix 
  into v_num, v_prefix 
  from public.organizations 
  where id = p_org_id;

  -- Update for next time
  update public.organizations 
  set next_invoice_number = next_invoice_number + 1 
  where id = p_org_id;

  return v_prefix || '-' || lpad(v_num::text, 7, '0');
end;
$$ language plpgsql;
