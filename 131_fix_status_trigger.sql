-- 131_fix_status_trigger.sql

-- The error "column 'status' is of type invoice_status but expression is of type text"
-- occurs in the 'update_invoice_after_payment' trigger function.
-- We need to cast the text string 'paid' or 'issued' to the ENUM type 'invoice_status'.

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
  -- We explicitly cast to invoice_status enum to avoid type mismatch
  UPDATE public.invoices
  SET 
    balance = v_invoice_total - v_total_paid,
    status = CASE 
      WHEN (v_invoice_total - v_total_paid) <= 0 THEN 'paid'::invoice_status
      ELSE 'issued'::invoice_status
    END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
