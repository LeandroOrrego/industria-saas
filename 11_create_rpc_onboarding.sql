-- SOLUCIÓN ROBUSTA: UPSERT EN PERFIL
-- Asegura que el perfil exista y se vincule, incluso si el trigger de registro falló.

create or replace function create_organization_for_user(
  org_name text,
  org_tax_id text,
  org_industry text,
  org_address text,
  org_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  new_org json;
  user_email text;
begin
  -- 1. Insertar la nueva organización
  insert into organizations (name, tax_id, industry, address, phone)
  values (org_name, org_tax_id, org_industry, org_address, org_phone)
  returning id into new_org_id;

  -- 2. Obtener email del usuario (desde auth.users, requiere security definer)
  -- Nota: Necesitamos set search_path = public, auth para acceder a auth.users? 
  -- Mejor usamos el search_path por defecto o cualificamos explícitamente y confiamos en permisos de definer.
  select email into user_email from auth.users where id = auth.uid();

  -- 3. Vincular (UPSERT)
  -- Si el perfil no existe, lo creamos. Si existe, lo actualizamos.
  insert into profiles (id, email, organization_id, role)
  values (auth.uid(), user_email, new_org_id, 'admin')
  on conflict (id) do update
  set organization_id = EXCLUDED.organization_id,
      role = 'admin';

  -- 4. Retornar la organización creada
  select to_json(o) from organizations o where id = new_org_id into new_org;
  
  return new_org;
end;
$$;
