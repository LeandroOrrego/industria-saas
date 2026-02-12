-- Corregir RLS para Organizaciones
alter table public.organizations enable row level security;

-- Política: Admin puede administrar su propia organización
drop policy if exists "Admin manages own organization" on organizations;
create policy "Admin manages own organization" on organizations for all to authenticated using (
  exists (
    select 1 from profiles
    where profiles.organization_id = organizations.id
    and profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Política: Usuarios pueden ver su propia organización (para leer configuraciones)
drop policy if exists "Users view own organization" on organizations;
create policy "Users view own organization" on organizations for select to authenticated using (
  exists (
    select 1 from profiles
    where profiles.organization_id = organizations.id
    and profiles.id = auth.uid()
  )
);
