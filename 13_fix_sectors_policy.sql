-- ARREGLO DE POLÍTICAS DE SECTORES
-- El insert fallaba por recursión o permisos en la subquery de profiles.
-- Solución: Usar la función segura 'get_auth_user_org_id()' igual que hicimos con organizations.

-- 1. Eliminar políticas anteriores
drop policy if exists "Usuarios ven sectores de su organizacion" on sectors;
drop policy if exists "Admins gestionan sectores" on sectors;

-- 2. Crear nuevas políticas usando la función segura
create policy "Usuarios ven sectores de su organizacion" on sectors
  for select using (
    organization_id = get_auth_user_org_id()
  );

create policy "Admins gestionan sectores" on sectors
  for all using (
    organization_id = get_auth_user_org_id()
  )
  with check (
    organization_id = get_auth_user_org_id()
  );

-- 3. Aplicar lo mismo a Invitaciones (por si acaso)
drop policy if exists "Admins ven invitaciones de su asm" on organization_invitations;
drop policy if exists "Admins crean invitaciones" on organization_invitations;
drop policy if exists "Admins borran invitaciones" on organization_invitations;

create policy "Admins ven invitaciones de su asm" on organization_invitations
  for select using (
    organization_id = get_auth_user_org_id()
  );

create policy "Admins gestionan invitaciones" on organization_invitations
  for all using (
    organization_id = get_auth_user_org_id()
  );
