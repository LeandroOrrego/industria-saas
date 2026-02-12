-- Add labor_cost column to service_orders
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0;

-- Comment
COMMENT ON COLUMN public.service_orders.labor_cost IS 'Cost of labor/services for the order';
