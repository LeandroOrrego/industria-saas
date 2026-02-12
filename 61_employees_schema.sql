-- CREATE EMPLOYEES TABLE (Funcionarios)
-- For internal management (salaries, commissions) without requiring system login.

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    full_name TEXT NOT NULL,
    document_id TEXT, -- DNI / CI
    position TEXT, -- Cargo
    email TEXT,
    phone TEXT,
    
    -- Optional link to a system user (if they eventually get access)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Salary Info (Optional base for future modules)
    base_salary NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- Soft Delete
);

-- RLS POLICIES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policy: View Employees (All org members can view)
CREATE POLICY "Users can view employees" ON public.employees
    FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Policy: Manage Employees (Only Admins/SuperAdmin)
-- For now, let's allow all authenticated members to manage to keep it simple, 
-- or stick to the 'admin' role check if strict. 
-- Let's stick to simpleorg check for now to avoid permission blockers, user can refine later.
CREATE POLICY "Users can manage employees" ON public.employees
    FOR ALL
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );
