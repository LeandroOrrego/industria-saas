-- 126_fix_stock_and_dates.sql

-- 1. Add start_date to service_orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'start_date') THEN
        ALTER TABLE public.service_orders ADD COLUMN start_date timestamp with time zone;
    END IF;
END $$;

-- 2. Re-Apply Stock Trigger for Service Order Items
-- To ensure stock is returned when items are deleted.

CREATE OR REPLACE FUNCTION public.handle_os_item_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- ON INSERT: Deduct stock
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.products
        SET current_stock = current_stock - NEW.quantity
        WHERE id = NEW.product_id;
        RETURN NEW;
    
    -- ON DELETE: Return stock
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.products
        SET current_stock = current_stock + OLD.quantity
        WHERE id = OLD.product_id;
        RETURN OLD;

    -- ON UPDATE: Adjust stock diff
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revert OLD, Subtract NEW -> current + OLD - NEW
        -- Diff = NEW - OLD. We want to subtract Diff.
        -- If NEW > OLD (increased qty), we subtract more (stock goes down).
        -- If NEW < OLD (decreased qty), we subtract negative (stock goes up).
        UPDATE public.products
        SET current_stock = current_stock - (NEW.quantity - OLD.quantity)
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and Recreate Trigger
DROP TRIGGER IF EXISTS trg_os_item_stock ON public.service_order_items;

CREATE TRIGGER trg_os_item_stock
AFTER INSERT OR UPDATE OR DELETE ON public.service_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_os_item_stock();
