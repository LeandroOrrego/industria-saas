-- 116_force_reset_and_fix.sql

-- FORCE RESET VIA SECURITY DEFINER FUNCTION
-- This approach ensures RLS (Row Level Security) does not block the deletion.

CREATE OR REPLACE FUNCTION public.hard_reset_system()
RETURNS void AS $$
BEGIN
    -- 1. Operations & Finance (Delete Dependents First)
    DELETE FROM public.invoice_lines; -- References service_order_items
    DELETE FROM public.invoices;
    DELETE FROM public.stock_movements; -- References products, potentially others
    DELETE FROM public.service_order_items;
    DELETE FROM public.service_orders;
    DELETE FROM public.transactions;
    DELETE FROM public.purchase_order_items;
    DELETE FROM public.purchase_orders;

    -- 2. Reset Product Stock
    UPDATE public.products SET current_stock = 0;

    -- 3. Reset Employees (Optional - Ensure clean state if needed)
    -- UPDATE public.employees SET base_salary = 2550307 WHERE base_salary IS NULL OR base_salary = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function immediately
SELECT public.hard_reset_system();

-- Drop it afterwards if you want, or keep it for admin use
-- DROP FUNCTION public.hard_reset_system();
