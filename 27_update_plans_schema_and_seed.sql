-- 1. Update Plans Table Schema
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_yearly NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::JSONB;

-- Remove the old single 'price' column if desired, or keep it as a fallback. 
-- For clarity, we will assume price_monthly is the primary monthly reference.

-- 2. Seed Data: Create the 3 Standard Plans
-- We use ON CONFLICT DO NOTHING to avoid duplicates if run multiple times, 
-- but since we don't have a unique constraint on name, we'll check existence first.

-- Plan: Básico (Basic)
INSERT INTO public.plans (name, description, price_monthly, price_yearly, currency, limits, features, is_active)
SELECT 'Básico', 'Ideal para talleres unipersonales.', 0, 0, 'PYG', 
    '{"max_users": 2, "max_storage_gb": 1}'::JSONB, 
    '["Ordenes de Trabajo", "Gestión de Clientes", "Catálogo de Productos"]'::JSONB,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Básico');

-- Plan: Pro (Growth)
INSERT INTO public.plans (name, description, price_monthly, price_yearly, currency, limits, features, is_active)
SELECT 'Pro', 'Para pequeñas fábricas en crecimiento.', 0, 0, 'PYG', 
    '{"max_users": 5, "max_storage_gb": 10}'::JSONB, 
    '["Ordenes de Trabajo", "Gestión de Clientes", "Productos", "Facturación", "Tesorería", "Inventario"]'::JSONB,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Pro');

-- Plan: Premium (Scale)
INSERT INTO public.plans (name, description, price_monthly, price_yearly, currency, limits, features, is_active)
SELECT 'Premium', 'Gestión completa para industrias consolidadas.', 0, 0, 'PYG', 
    '{"max_users": 9999, "max_storage_gb": 100}'::JSONB, 
    '["Todo lo del Pro", "Sueldos y RRHH", "Reportes Avanzados", "Auditoría", "Soporte Prioritario"]'::JSONB,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Premium');
