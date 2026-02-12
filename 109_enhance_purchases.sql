-- 109_enhance_purchases.sql

-- Add Invoice related columns to purchase_orders
alter table public.purchase_orders
  add column if not exists invoice_number text,
  add column if not exists invoice_type text default 'Contado', -- 'Contado' or 'Crédito'
  add column if not exists iva_5 numeric default 0,
  add column if not exists iva_10 numeric default 0,
  add column if not exists exempt_amount numeric default 0,
  add column if not exists deleted_at timestamp with time zone;

-- Ensure numeric fields are not null (optional, defaulting to 0 is safer for now)
comment on column public.purchase_orders.invoice_number is 'Numero de Factura del Proveedor (001-001-XXXXXXX)';
