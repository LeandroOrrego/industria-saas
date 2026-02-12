-- AGREGAR CAMPO DE TELÉFONO
alter table public.organizations 
add column if not exists phone text;
