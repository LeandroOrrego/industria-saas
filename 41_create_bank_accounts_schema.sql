-- DYNAMIC BANK ACCOUNTS SCHEMA

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.saas_bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ruc_document TEXT, -- Optional
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.saas_bank_accounts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Public Read (Authenticated Users) - ONLY Active accounts
CREATE POLICY "Everyone can view active bank accounts" ON public.saas_bank_accounts
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Super Admin Manage (All Operations)
-- Assuming 'check_is_super_admin()' function exists from previous scripts
CREATE POLICY "Super Admins can manage bank accounts" ON public.saas_bank_accounts
    FOR ALL
    USING (
        check_is_super_admin() = TRUE
    );

-- 4. Insert Initial Data (Optional - migrating from hardcoded)
INSERT INTO public.saas_bank_accounts (bank_name, account_holder, account_number, ruc_document)
VALUES 
('Banco Itaú (Ejemplo)', 'Leandro B.', '720004561', '4587621-3');
