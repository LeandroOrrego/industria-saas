-- SOLUCIÓN DEFINITIVA: FUNCION SECURITY DEFINER
-- Las subqueries normales dentro de policies causan recursión infinita.
-- Usamos una función SECURITY DEFINER para "salir" del contexto RLS y leer el ID de forma segura.

-- 1. Función auxiliar segura
create or replace function get_auth_user_org_id()
returns uuid
language sql
security definer -- IMPORTANTE: Ejecuta con permisos del creador, bypass RLS
set search_path = public
stable
as $$
  select organization_id from profiles where id = auth.uid() limit 1;
$$;

-- 2. RESET de Policies (Borrar todo lo anterior para evitar conflictos)
drop policy if exists "Ver perfiles de mi org" on profiles;
drop policy if exists "Usuarios ven su propio perfil" on profiles;
drop policy if exists "Perfiles públicos visibles para todos" on profiles;
drop policy if exists "Usuario ve su propio perfil" on profiles;
drop policy if exists "Usuario edita su propio perfil" on profiles;
drop policy if exists "Ver compañeros de equipo" on profiles;

drop policy if exists "Usuarios ven su propia organizacion" on organizations;
drop policy if exists "Admins editan su organizacion" on organizations;
drop policy if exists "Usuarios autenticados crean organizacion" on organizations;
drop policy if exists "Usuarios autenticados pueden crear organizaciones" on organizations;

-- 3. Nuevas Policies de PROFILES
-- A) Ver/Editar mi propio perfil (Regla base)
create policy "Usuario ve su propio perfil" on profiles
  for select using ( auth.uid() = id );

create policy "Usuario edita su propio perfil" on profiles
  for update using ( auth.uid() = id );

-- B) Ver a otros miembros de la MISMA organización (Usando la función segura)
create policy "Ver compañeros de equipo" on profiles
  for select using (
    organization_id = get_auth_user_org_id()
  );

-- 4. Nuevas Policies de ORGANIZATIONS
-- A) Ver mi organización
create policy "Usuarios ven su propia organizacion" on organizations
  for select using (
    id = get_auth_user_org_id()
  );

-- B) Editar mi organización (Solo admins)
create policy "Admins editan su organizacion" on organizations
  for update using (
    id = get_auth_user_org_id()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- C) Crear organización (Necesario para el registro)
create policy "Usuarios autenticados pueden crear organizaciones" on organizations
  for insert with check ( auth.role() = 'authenticated' );
