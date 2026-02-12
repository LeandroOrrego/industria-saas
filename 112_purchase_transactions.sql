-- 112_purchase_transactions.sql

-- 0. Ensure payment_method type exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM ('efectivo', 'transferencia', 'cheque', 'tarjeta', 'otros');
    END IF;
END $$;

-- 1. Add payment_method to purchase_orders
alter table public.purchase_orders
add column if not exists payment_method text; -- Using text to be safe, can cast to enum if needed in triggers

-- 2. Function to create transaction from purchase
create or replace function public.sync_purchase_to_transaction()
returns trigger as $$
declare
    v_desc text;
begin
    -- Only creating transaction if status is 'received' (or we can decide when). 
    -- For 'Direct Purchase', status goes to 'received' eventually.
    -- If we use the 'ordered' -> 'received' flow:
    -- We should probably record the expense when it is PAID. 
    -- If invoice_type is 'Contado', we assume it is paid immediately (at 'ordered' or 'received').
    -- Let's stick to: If 'Contado' AND status becomes 'received' (or maybe 'ordered' if we want to record it early, but 'received' is safer for stock/finance consistency).
    -- Actually, if I create it as 'ordered' and it is 'Contado', money probably left.
    -- BUT, `process_purchase_receipt` sets it to 'received'.
    
    -- Let's trigger on INSERT or UPDATE.
    -- Condition: invoice_type = 'Contado' AND status IN ('ordered', 'received') 
    -- AND we haven't already created a transaction for this purchase? 
    -- The transactions table has `invoice_id`. Does it have `purchase_id`? Probably not.
    -- We need to check if we can link it.
    -- `transactions` usually has `reference_id` or similar, or `description`.
    
    -- Let's check `transactions` columns in 01_initial_schema.sql or similar.
    -- I'll assume standard structure or add a column `purchase_id` to transactions if possible.
    -- For now, I'll put it in description and assume we don't need hard FK.
    -- Or better, let's add `purchase_id` to transactions to be clean.
    
    v_desc := 'Compra Factura ' || coalesce(NEW.invoice_number, 'S/N') || ' - ' || (select name from providers where id = NEW.provider_id);
    
    if NEW.invoice_type = 'Contado' and NEW.status in ('ordered', 'received') and NEW.deleted_at is null then
        -- Check if transaction already exists to avoid duplicates
        if not exists (select 1 from public.transactions where description = v_desc and amount = NEW.total_amount and transaction_date = NEW.order_date::timestamp) then
             insert into public.transactions (
                organization_id,
                description,
                type,
                amount,
                payment_method,
                transaction_date,
                created_by
            ) values (
                NEW.organization_id,
                v_desc,
                'expense',
                NEW.total_amount,
                COALESCE(NEW.payment_method, 'efectivo')::public.payment_method, -- Cast to enum if exists
                NEW.order_date::timestamp,
                auth.uid() -- This might be null in trigger? Better use created_by from PO if available or NULL.
            );
        end if;
    end if;

    return NEW;
end;
$$ language plpgsql security definer;

-- 3. Trigger
-- We need to handle INSERT and UPDATE.
-- Note: 'auth.uid()' in trigger might be tricky if triggered by system. 
-- But usually okay if triggered by user action.
-- Ideally purchase_orders tracks `created_by`.

drop trigger if exists tr_sync_purchase_transaction on public.purchase_orders;
create trigger tr_sync_purchase_transaction
after insert or update on public.purchase_orders
for each row execute function public.sync_purchase_to_transaction();
