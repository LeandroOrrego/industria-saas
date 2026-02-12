-- SCRIPT DE MIGRACIÓN: PERMISOS Y ESQUEMA FINAL PARA ONBOARDING
-- Ejecuta este script el Editor SQL de Supabase para corregir los permisos de creación de empresas.

-- 1. AGREGAR COLUMNAS PARA ONBOARDING (Si no existen)
alter table public.organizations 
add column if not exists tax_id text,
add column if not exists industry text,
add column if not exists address text,
add column if not exists logo_url text;

-- 2. CORREGIR POLÍTICAS DE SEGURIDAD (RLS) PARA ORGANIZACIONES

-- Habilitar RLS en organizations (por si acaso)
alter table public.organizations enable row level security;

-- A) PERMITIR INSERTAR (Crear empresa): Necesario para el Registro
drop policy if exists "Usuarios autenticados pueden crear organizaciones" on organizations;
create policy "Usuarios autenticados pueden crear organizaciones" on organizations for insert to authenticated with check (true);

-- B) PERMITIR ACTUALIZAR (Onboarding): Necesario para guardar datos
drop policy if exists "Admins editan su organizacion" on organizations;
create policy "Admins editan su organizacion" on organizations for update using (
  id in (
    select organization_id from profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
);

-- C) PERMITIR LEER (Ver empresa): Necesario para AppLayout
drop policy if exists "Usuarios ven su propia organizacion" on organizations;
create policy "Usuarios ven su propia organizacion" on organizations for select using (
  id in (
    select organization_id from profiles where profiles.id = auth.uid()
  )
);
