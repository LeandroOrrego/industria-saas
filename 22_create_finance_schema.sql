-- ENUMS
create type invoice_type as enum ('A', 'B', 'C', 'M');
create type invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');
create type transaction_type as enum ('income', 'expense');
create type payment_method as enum ('cash', 'transfer', 'check', 'credit_card');

-- 1. ENHANCE INVOICES (Sales)
-- Add organization and electronic billing fields
delete from public.invoices; -- Clear dev data if any to avoid conflicts with new non-nulls or just alter

alter table public.invoices 
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade default null;

-- Update existing rows (if any) before setting not null (in a real migration this is critical, here we accept strictness)
-- For now, allow null to not break existing, or we assume clean state.
-- Let's make it robust:
alter table public.invoices 
  add column if not exists type invoice_type default 'B',
  add column if not exists status invoice_status default 'draft',
  add column if not exists due_date date,
  add column if not exists cae text, -- Código de Autorización Electrónico
  add column if not exists cae_expires_at date,
  add column if not exists invoice_number text; -- Puntero-Numero (0001-00001234)

-- RLS for Invoices
alter table public.invoices enable row level security;
create policy "Invoices visible to organization"
  on public.invoices for select
  to authenticated
  using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Invoices editable by admin/admin"
  on public.invoices for all
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'administrativo'))
  );


-- 2. TREASURY (Transactions / Cash Flow)
-- Centralizes all money movements (Invoices Paid, POs Paid, Salaries Paid, Misc Expenses)
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  description text not null,
  type transaction_type not null,
  amount numeric not null,
  payment_method payment_method,
  
  -- Links to other entities (Polymorphic-ish or specific columns)
  invoice_id uuid references public.invoices(id) on delete set null,
  po_id uuid references public.purchase_orders(id) on delete set null,
  
  transaction_date date default now(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id)
);

alter table public.transactions enable row level security;
create policy "Transactions visible to organization"
  on public.transactions for select
  to authenticated
  using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Transactions managed by admin"
  on public.transactions for all
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 3. PAYROLL (Salaries)
create table if not exists public.payroll_settlements (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete restrict not null,
  period_start date not null,
  period_end date not null,
  total_hours numeric default 0,
  hourly_rate numeric default 0,
  total_amount numeric default 0,
  status text default 'draft', -- draft, paid
  payment_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payroll_settlements enable row level security;
create policy "Payroll visible to organization admins"
  on public.payroll_settlements for select
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and (
      auth.uid() = user_id -- Users see their own
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'administrativo'))
    )
  );

-- Function to Calculate Hours for Payroll Preview
create or replace function calculate_hours(p_user_id uuid, p_start date, p_end date)
returns numeric as $$
declare
  total_mins numeric;
begin
  select coalesce(sum(extract(epoch from (end_time - start_time))/3600), 0)
  into total_mins
  from public.work_logs
  where user_id = p_user_id
  and start_time >= p_start::timestamp
  and end_time <= p_end::timestamp + interval '1 day' -- Include full end day
  and end_time is not null;
  
  return round(total_mins::numeric, 2);
end;
$$ language plpgsql;
