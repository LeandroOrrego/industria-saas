-- Add deleted_at to service_orders for soft delete support
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index for performance on active queries
CREATE INDEX IF NOT EXISTS idx_service_orders_deleted_at 
ON public.service_orders (deleted_at) 
WHERE deleted_at IS NULL;

-- Update RLS to allow viewing only non-deleted orders (optional, or handle in app)
-- Generally better to handle in app for Admin "restore" capabilities, 
-- but consistent with other modules to filter in app for now.
