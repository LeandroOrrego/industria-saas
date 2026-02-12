-- 1. Add is_super_admin to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Set the system owner as super admin (using email match for safety in this script)
UPDATE public.profiles 
SET is_super_admin = TRUE 
WHERE email = 'torneriajosemar@gmail.com';

-- 2. Create Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'PYG', -- Guaraníes
    limits JSONB DEFAULT '{}'::JSONB, -- e.g. {"max_users": 5, "features": ["billing"]}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Subscriptions Table (Links Org -> Plan)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT CHECK (status IN ('active', 'canceled', 'trial', 'past_due')) DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS Policies

-- Plans: Read Public, Write Super Admin Only
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.plans
    FOR SELECT USING (true); -- Or (is_active = true)

CREATE POLICY "Super Admins can manage plans" ON public.plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = TRUE
        )
    );

-- Subscriptions: Org Admins can view own, Super Admins can manage all
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own subscription" ON public.subscriptions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Super Admins manage subscriptions" ON public.subscriptions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = TRUE
        )
    );
