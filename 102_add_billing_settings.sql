-- Agregar Configuración de Facturación a Organizaciones
alter table public.organizations 
  add column if not exists activity_description text,
  add column if not exists timbrado_start_date date,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists website text,
  
  -- Calibración de Impresión (Márgenes por defecto en mm)
  add column if not exists print_margin_top numeric default 0,
  add column if not exists print_margin_left numeric default 0;

-- Asegurar que RLS permita configuraciones (usualmente cubierto por "Usuarios pueden actualizar su propia org")
-- Por si acaso, verificar política:
-- create policy "Organizations editable by admin" ... (revisar 52_fix_organizations_schema_final.sql o similar si es necesario)
