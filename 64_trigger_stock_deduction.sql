-- Function to handle stock updates from Service Order Items
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
        -- Revert OLD quantity, subtract NEW quantity = (current + OLD - NEW)
        -- Or simply diff: current - (NEW - OLD)
        UPDATE public.products
        SET current_stock = current_stock - (NEW.quantity - OLD.quantity)
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS trg_os_item_stock ON public.service_order_items;

CREATE TRIGGER trg_os_item_stock
AFTER INSERT OR UPDATE OR DELETE ON public.service_order_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_os_item_stock();
