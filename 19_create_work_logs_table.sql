-- Tabla de Registros de Trabajo (Marcación de horas)
create table if not exists public.work_logs (
  id uuid default uuid_generate_v4() primary key,
  os_id uuid references public.service_orders(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete restrict not null, -- Quién hizo el trabajo
  task_name text not null, -- Ej: 'Soldadura', 'Corte', 'Pintura'
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone, -- Null si está en curso
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.work_logs enable row level security;

-- Políticas de RLS
create policy "Work logs visibles para organizacion"
  on public.work_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.service_orders so
      join public.profiles p on p.organization_id = so.organization_id
      where so.id = work_logs.os_id
      and p.id = auth.uid()
    )
  );

create policy "Usuarios pueden crear sus propios logs"
  on public.work_logs for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

create policy "Usuarios pueden finalizar sus propios logs"
  on public.work_logs for update
  to authenticated
  using (
    user_id = auth.uid()
  );

-- Admin puede editar/borrar cualquier log (por si hay errores)
create policy "Admins pueden gestionar todos los logs"
  on public.work_logs for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'administrativo')
    )
  );
