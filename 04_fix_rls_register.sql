-- CORRECCIÓN RLS PARA REGISTRO
-- Permitir que usuarios autenticados creen su organización durante el registro.

create policy "Usuarios autenticados crean organizaciones" 
on public.organizations 
for insert 
to authenticated 
with check (true);

-- Asegurarnos que el perfil se pueda actualizar (ya debería estar, pero reforzamos)
-- (La política "Usuarios editan su propio perfil" en 01_initial_schema.sql cubre esto)
