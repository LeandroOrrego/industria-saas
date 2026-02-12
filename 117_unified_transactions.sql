-- 117_unified_transactions.sql

-- 1. Create Transaction Categories Table
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')), -- 'income' or 'expense'
    is_system BOOLEAN DEFAULT FALSE, -- If true, cannot be deleted (e.g. 'Salarios')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- RLS for Categories
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transaction_categories" ON public.transaction_categories
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage transaction_categories" ON public.transaction_categories
    FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));


-- 2. Enhance Transactions Table
-- We add columns to support the unified flow
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_id UUID, -- Polymorphic ID (Client, Provider, or Employee)
ADD COLUMN IF NOT EXISTS contact_type TEXT CHECK (contact_type IN ('client', 'provider', 'employee', 'other')),
ADD COLUMN IF NOT EXISTS document_number TEXT, -- Invoice #, Receipt #, etc.
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'; 

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contact ON public.transactions(contact_id);


-- 3. Seed Default Categories (Function to limit scope to calling user's org if needed, 
-- but since this is a migration, we might need to handle existing orgs. 
-- For MVP/Single Tenant, we can insert for the current org if known, or rely on frontend/hooks.
-- For now, let's create a helper function to seed for a specific Org, or insert generic if we were multi-tenant properly.
-- Given the context of the reset, we can insert for ALL existing organizations.)

DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM public.organizations LOOP
        -- Income
        INSERT INTO public.transaction_categories (organization_id, name, type, is_system)
        VALUES 
            (org.id, 'Ventas', 'income', true),
            (org.id, 'Servicios', 'income', true),
            (org.id, 'Otros Ingresos', 'income', false);

        -- Expenses
        INSERT INTO public.transaction_categories (organization_id, name, type, is_system)
        VALUES 
            (org.id, 'Compras Insumos', 'expense', true),
            (org.id, 'Gastos Operativos', 'expense', false),
            (org.id, 'Salarios', 'expense', true),
            (org.id, 'Anticipo Sueldo', 'expense', true), -- Critical for Payroll integration
            (org.id, 'Impuestos', 'expense', false),
            (org.id, 'Otros Egresos', 'expense', false);
    END LOOP;
END $$;
