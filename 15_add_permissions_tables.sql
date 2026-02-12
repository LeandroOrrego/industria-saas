-- TABLAS DE PERMISOS (GRANULARIDAD DE USUARIO)

-- 1. Catálogo de Permisos del Sistema
create table if not exists public.app_permissions (
  code text primary key, -- ej. 'production.view_orders', 'finance.approve_payments'
  category text not null, -- 'PRODUCCIÓN', 'FINANZAS', 'ADMINISTRACIÓN'
  description text not null
);

-- Seed de Permisos (Basado en el diseño UI)
insert into public.app_permissions (code, category, description) values
  ('production.view_orders', 'PRODUCCIÓN', 'Ver Ordenes de Trabajo'),
  ('production.finalize_process', 'PRODUCCIÓN', 'Finalizar Procesos'),
  ('finance.view_balances', 'FINANZAS', 'Visualizar Balances'),
  ('finance.pay_providers', 'FINANZAS', 'Emitir Pagos a Proveedores'),
  ('finance.edit_margins', 'FINANZAS', 'Modificar Margen de Utilidad'),
  ('admin.manage_users', 'ADMINISTRACIÓN', 'Gestionar Usuarios'),
  ('admin.system_settings', 'ADMINISTRACIÓN', 'Configuración del Sistema')
on conflict (code) do nothing;

-- 2. Permisos Asignados a Usuarios
create table if not exists public.user_permissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  permission_code text references public.app_permissions(code) on delete cascade not null,
  granted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, organization_id, permission_code)
);

-- RLS para Permisos
alter table public.user_permissions enable row level security;

-- Admins ven y gestionan todos los permisos de su organización
create policy "Admins gestionan permisos" on user_permissions
  for all using (
    organization_id = (select organization_id from profiles where id = auth.uid() and role = 'admin')
  );

-- Usuarios ven sus propios permisos (para UI render)
create policy "Usuarios ven sus permisos" on user_permissions
  for select using (
    user_id = auth.uid()
  );

-- Catálogo de permisos es público para lectura autenticada
alter table public.app_permissions enable row level security;
create policy "Todos ven catalogo de permisos" on app_permissions for select to authenticated using (true);
