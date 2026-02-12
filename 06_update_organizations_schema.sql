-- AGREGAR CAMPOS PARA ONBOARDING EN ORGANIZATIONS

-- 1. Agregar columnas
alter table public.organizations 
add column if not exists tax_id text, -- CUIT o RUT
add column if not exists industry text, -- Tipo de Industria
add column if not exists address text, -- Dirección Principal
add column if not exists logo_url text; -- URL del logo

-- 2. Asegurar política de UPDATE
-- Actualmente solo hay política de SELECT. Necesitamos permitir que los admins actualicen su organización.

drop policy if exists "Admins editan su organizacion" on organizations;

create policy "Admins editan su organizacion" on organizations for update using (
  id in (
    select organization_id from profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
) with check (
  id in (
    select organization_id from profiles 
    where profiles.id = auth.uid() 
    and profiles.role = 'admin'
  )
);
