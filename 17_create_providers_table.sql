-- Create Providers Table
create table if not exists public.providers (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  tax_id text, -- RUC / CI
  phone text,
  email text,
  address text,
  category text, -- 'materia_prima', 'servicios', 'insumos', 'equipos'
  status text default 'active', -- 'active', 'inactive'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.providers enable row level security;

-- Policies (Similar to Clients)
create policy "Providers visible to authenticated users"
  on public.providers for select
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Providers editable by admins and administrative"
  on public.providers for all
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'administrativo')
    )
  );
