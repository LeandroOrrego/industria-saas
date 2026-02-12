-- 104_enhance_invoices.sql

-- 1. Agregar nuevas columnas a la tabla de Facturas
alter table public.invoices 
  add column if not exists invoice_number text, -- Número con formato ej. "001-001-0000001"
  add column if not exists condition text check (condition in ('contado', 'credito')) default 'contado',
  add column if not exists deleted_at timestamp with time zone;

-- 2. Agregar logo_url a organizaciones si no existe (podría existir de scripts anteriores, pero es bueno asegurarse)
alter table public.organizations 
  add column if not exists logo_url text;

-- 3. Actualizar RLS para manejar Borrado Lógico (Soft Delete) en Facturas
-- Esto asegura que las facturas 'eliminadas' estén ocultas de consultas estándar a menos que se soliciten específicamente (aunque usualmente manejamos esto en la consulta SELECT)
-- Por ahora, filtraremos en el frontend, pero podemos prevenir actualizaciones a items eliminados.

create policy "Invoices soft delete protection" on invoices
  for update using (deleted_at is null);
