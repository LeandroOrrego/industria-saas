-- 128_fix_payments_schema.sql

-- 1. Ensure `invoices` has status and balance columns
-- NOTE: status is likely an ENUM 'invoice_status' ('draft', 'issued', 'paid', 'cancelled')
-- We should not try to add it as TEXT if it exists as ENUM. 
-- We will just add balance.

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- Update balance for existing invoices if needed
-- We assume 'issued' invoices with 0 balance are the ones needing update
UPDATE public.invoices 
SET balance = total_amount 
WHERE status = 'issued' AND balance = 0 AND total_amount > 0;


-- 2. Create `payments` table if not exists
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_method TEXT NOT NULL, -- efectivo, cheque, transferencia, tarjeta
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Pagos visibles para autenticados') THEN
        CREATE POLICY "Pagos visibles para autenticados" ON public.payments FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Pagos gestionables por admin/administrativo') THEN
        CREATE POLICY "Pagos gestionables por admin/administrativo" ON public.payments FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'administrativo'))
        );
    END IF;
END $$;


-- 3. Trigger to Update Invoice Balance upon Payment
CREATE OR REPLACE FUNCTION update_invoice_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_invoice_total NUMERIC;
BEGIN
  -- Calculate total paid for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Get invoice total (from parent invoice)
  SELECT total_amount INTO v_invoice_total
  FROM public.invoices
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Update invoice balance and status
  -- Status enum: 'issued' (pending payment), 'paid' (fully paid)
  UPDATE public.invoices
  SET 
    balance = v_invoice_total - v_total_paid,
    status = CASE 
      WHEN (v_invoice_total - v_total_paid) <= 0 THEN 'paid'
      ELSE 'issued' -- Revert to issued if not fully paid
    END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_invoice_payment ON public.payments;
CREATE TRIGGER tr_update_invoice_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_after_payment();


-- 4. Trigger to Sync Payment to Transactions (Corrected Logic)
CREATE OR REPLACE FUNCTION public.sync_payment_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_number TEXT;
  v_client_name TEXT;
  v_client_id UUID;
  v_org_id UUID;
  v_desc TEXT;
  v_category_id UUID;
BEGIN
  -- Get Invoice Details
  SELECT i.invoice_number, c.name, i.client_id, i.organization_id
  INTO v_invoice_number, v_client_name, v_client_id, v_org_id
  FROM public.invoices i
  LEFT JOIN public.clients c ON i.client_id = c.id
  WHERE i.id = NEW.invoice_id;

  v_desc := 'Cobro Factura ' || COALESCE(v_invoice_number, 'Pendiente') || ' - ' || COALESCE(v_client_name, 'Cliente');

  -- Get Category (Ventas or Servicios) for Income
  SELECT id INTO v_category_id
  FROM public.transaction_categories
  WHERE organization_id = v_org_id 
    AND (name = 'Ventas' OR name = 'Servicios') 
    AND type = 'income'
  LIMIT 1;

  -- Insert into transactions
  INSERT INTO public.transactions (
    organization_id,
    description,
    type,
    amount,
    payment_method, -- text
    invoice_id,
    transaction_date,
    created_by,
    category_id,
    contact_id,
    contact_type,
    document_number
  ) VALUES (
    v_org_id,
    v_desc,
    'income',
    NEW.amount,
    NEW.payment_method,
    NEW.invoice_id,
    NEW.payment_date,
    NEW.created_by,
    v_category_id, -- Can be NULL if not found, consider fallback or default
    v_client_id,
    'client',
    v_invoice_number
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_payment_transaction ON public.payments;
CREATE TRIGGER tr_sync_payment_transaction
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_transaction();
