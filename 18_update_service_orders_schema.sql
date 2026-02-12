-- Add new columns to service_orders table
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal', -- 'alta', 'normal', 'baja'
ADD COLUMN IF NOT EXISTS delivery_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS organization_id uuid references public.organizations(id);

-- Update RLS policy to use organization_id
DROP POLICY IF EXISTS "Service Orders visible to authenticated users" ON public.service_orders;

CREATE POLICY "Service Orders visible to users of same organization"
ON public.service_orders
FOR ALL
TO authenticated
USING (
  organization_id = (select organization_id from public.profiles where id = auth.uid()) 
  OR 
  client_id IN (select id from public.clients where organization_id = (select organization_id from public.profiles where id = auth.uid()))
);

-- Note: We link via organization_id directly for performance, but the OR clause ensures backward compatibility if organization_id is null initially
--Ideally we should backfill organization_id from clients
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.service_orders WHERE organization_id IS NULL) THEN
    UPDATE public.service_orders so
    SET organization_id = c.organization_id
    FROM public.clients c
    WHERE so.client_id = c.id
    AND so.organization_id IS NULL;
  END IF;
END $$;
