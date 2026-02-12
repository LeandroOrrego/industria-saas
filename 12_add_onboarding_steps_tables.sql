-- CREACIÓN DE TABLAS PARA ONBOARDING (PASOS 2 y 3)

-- 1. Tabla de SECTORES (Areas de la fábrica)
create table if not exists public.sectors (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  type text default 'production', -- 'production', 'office', 'storage', etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Sectores
alter table public.sectors enable row level security;

create policy "Usuarios ven sectores de su organizacion" on sectors
  for select using (
    organization_id = (select organization_id from profiles where id = auth.uid())
  );

create policy "Admins gestionan sectores" on sectors
  for all using (
    organization_id = (select organization_id from profiles where id = auth.uid() and role = 'admin')
  );

-- 2. Tabla de INVITACIONES (Para miembros del equipo)
create table if not exists public.organization_invitations (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  email text not null,
  role user_role default 'operario',
  status text default 'pending', -- 'pending', 'accepted'
  token uuid default uuid_generate_v4(), -- Token único para el link de invitación
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(organization_id, email)
);

-- RLS para Invitaciones
alter table public.organization_invitations enable row level security;

create policy "Admins ven invitaciones de su asm" on organization_invitations
  for select using (
    organization_id = (select organization_id from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins crean invitaciones" on organization_invitations
  for insert with check (
    organization_id = (select organization_id from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins borran invitaciones" on organization_invitations
  for delete using (
    organization_id = (select organization_id from profiles where id = auth.uid() and role = 'admin')
  );
