-- FIX SUBSCRIPTION CONSTRAINT
-- The 'upsert' in Subscription.tsx requires a UNIQUE constraint on 'organization_id'.

-- 1. Ensure 'subscriptions' table has the constraint
DO $$
BEGIN
    -- Check if constraint exists (postgres automatic name or custom)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscriptions_organization_id_key' 
        OR conname = 'unique_org_subscription'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);
    END IF;
END $$;
