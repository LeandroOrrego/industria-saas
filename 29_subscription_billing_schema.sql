-- 1. Update Subscriptions Table to track Payment Details
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- 2. Create SAAS Invoices Table (Invoices issued BY the SaaS TO the Client)
CREATE TABLE IF NOT EXISTS public.saas_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'PYG',
    status TEXT CHECK (status IN ('draft', 'issued', 'paid', 'void')) DEFAULT 'issued',
    pdf_url TEXT, -- Link to generated PDF if we generate one
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- 3. RLS for SaaS Invoices

ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;

-- Clients can View their own invoices
CREATE POLICY "Clients view own invoices" ON public.saas_invoices
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Super Admins can Manage everything
CREATE POLICY "Super Admins manage invoices" ON public.saas_invoices
    FOR ALL
    USING (
        check_is_super_admin() = TRUE
    );
