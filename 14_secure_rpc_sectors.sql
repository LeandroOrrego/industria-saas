-- SOLUCIÓN DEFINITIVA PARA SECTORES: RPC
-- Si las políticas RLS siguen fallando, usamos una función RPC Security Definer.

create or replace function add_organization_sectors(
  sector_names text[]
)
returns void
language plpgsql
security definer -- Bypass RLS
set search_path = public
as $$
declare
  v_org_id uuid;
  s_name text;
begin
  -- 1. Obtener ID de org del usuario actual
  select organization_id into v_org_id 
  from profiles 
  where id = auth.uid();
  
  if v_org_id is null then
    raise exception 'El usuario no pertenece a ninguna organización';
  end if;

  -- 2. Insertar sectores
  -- Usamos un loop o unnest para insertar
  foreach s_name in array sector_names
  loop
    -- Insertamos si no existe (opcional, para evitar duplicados)
    if not exists (select 1 from sectors where organization_id = v_org_id and name = s_name) then
      insert into sectors (organization_id, name, type)
      values (v_org_id, s_name, 'production');
    end if;
  end loop;

end;
$$;
