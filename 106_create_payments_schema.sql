-- 106_create_payments_schema.sql

-- 1. Actualizar tabla de facturas
-- Agregar estado y saldo
alter table public.invoices 
add column if not exists status text default 'pending', -- pending, paid, partial, void
add column if not exists balance numeric default 0;

-- Inicializar balance con el total para facturas pendientes
update public.invoices 
set balance = total_amount 
where status = 'pending' and balance = 0;

-- 2. Crear tabla de pagos
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  amount numeric not null,
  payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
  payment_method text not null, -- efectivo, cheque, transferencia, tarjeta
  reference text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en pagos
alter table public.payments enable row level security;

create policy "Pagos visibles para autenticados" 
on public.payments for select 
to authenticated 
using (true);

create policy "Pagos gestionables por admin/administrativo" 
on public.payments for all 
to authenticated 
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.role in ('admin', 'administrativo')
  )
);

-- 3. Trigger para actualizar saldo y estado de la factura al registrar pago
create or replace function update_invoice_after_payment()
returns trigger as $$
declare
  v_total_paid numeric;
  v_invoice_total numeric;
begin
  -- Calcular total pagado para esta factura
  select coalesce(sum(amount), 0) into v_total_paid
  from public.payments
  where invoice_id = NEW.invoice_id;

  -- Obtener total de la factura
  select total_amount into v_invoice_total
  from public.invoices
  where id = NEW.invoice_id;

  -- Actualizar factura
  update public.invoices
  set 
    balance = v_invoice_total - v_total_paid,
    status = case 
      when (v_invoice_total - v_total_paid) <= 0 then 'paid'
      when (v_invoice_total - v_total_paid) < v_invoice_total then 'partial'
      else 'pending'
    end
  where id = NEW.invoice_id;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger para Insert/Update/Delete de pagos
drop trigger if exists tr_update_invoice_payment on public.payments;
create trigger tr_update_invoice_payment
after insert or update or delete on public.payments
for each row execute function update_invoice_after_payment();
