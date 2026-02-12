-- 113_fix_payment_method.sql

-- 1. Ensure 'other' exists in payment_method enum (if it was created with English values)
-- We wrap in a DO block to avoid errors if it already exists
DO $$
BEGIN
    ALTER TYPE public.payment_method ADD VALUE 'other';
EXCEPTION
    WHEN duplicate_object THEN
        -- value already exists, ignore
        null;
    WHEN others THEN
        -- handle other errors if necessary, or just ignore for now if type doesn't support it (unlikely if it's an enum)
        raise notice 'Could not add value to enum: %', SQLERRM;
END $$;

-- 2. Update the sync definition to use English default 'cash'
create or replace function public.sync_purchase_to_transaction()
returns trigger as $$
declare
    v_desc text;
begin
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
                COALESCE(NEW.payment_method, 'cash')::public.payment_method, -- Default to 'cash' (English)
                NEW.order_date::timestamp,
                auth.uid()
            );
        end if;
    end if;

    return NEW;
end;
$$ language plpgsql security definer;
