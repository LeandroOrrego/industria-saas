-- Tipos de estado de maquinaria
create type machine_status as enum ('active', 'maintenance', 'repair', 'out_of_service');
create type maintenance_type as enum ('preventive', 'corrective');

-- Tabla de Maquinaria
create table if not exists public.machines (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  brand text,
  model text,
  serial_number text,
  status machine_status default 'active',
  purchase_date date,
  last_maintenance_date date,
  next_maintenance_date date, -- Alerta preventiva
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Registros de Mantenimiento
create table if not exists public.maintenance_logs (
  id uuid default uuid_generate_v4() primary key,
  machine_id uuid references public.machines(id) on delete cascade not null,
  type maintenance_type default 'preventive',
  description text not null,
  cost numeric default 0,
  performed_by text, -- Puede ser un tercero o un empleado
  maintenance_date date default now(),
  next_due_date date, -- Para programar el siguiente
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger para actualizar fechas en la máquina
create or replace function update_machine_maintenance_dates()
returns trigger as $$
begin
  update public.machines
  set 
    last_maintenance_date = NEW.maintenance_date,
    next_maintenance_date = COALESCE(NEW.next_due_date, next_maintenance_date)
  where id = NEW.machine_id;
  return NEW;
end;
$$ language plpgsql;

create trigger tr_update_machine_dates
after insert on public.maintenance_logs
for each row execute function update_machine_maintenance_dates();


-- RLS Policies
alter table public.machines enable row level security;
alter table public.maintenance_logs enable row level security;

-- Maquinas visibles por organización
create policy "Machines visible to organization"
  on public.machines for select
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
  );

create policy "Machines editable by authorized roles"
  on public.machines for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'administrativo', 'operario') -- Operarios pueden ver o reportar, simplificamos acceso
    )
  );

-- Logs visibles por organización via maquina
create policy "Logs visible to organization"
  on public.maintenance_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.machines m
      join public.profiles p on p.organization_id = m.organization_id
      where m.id = maintenance_logs.machine_id
      and p.id = auth.uid()
    )
  );

create policy "Logs editable by authorized roles"
  on public.maintenance_logs for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'administrativo', 'operario')
    )
  );
