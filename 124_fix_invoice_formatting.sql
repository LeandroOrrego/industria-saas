-- 124_fix_invoice_formatting.sql

-- 1. Fix Organization Prefix
-- Assuming the user accidentally put a full invoice number or extra segments in the prefix.
-- Standard prefix should be like '001-001' (7 chars).
-- If we find something long with multiple dashes, we reset it to '001-001' or truncate.
-- Safe bet for this user: Set to '001-001' if it has more than 1 dash.

UPDATE public.organizations
SET invoice_prefix = '001-001'
WHERE invoice_prefix LIKE '%-%-%';

-- 2. Fix Existing Invoices with double numbering
-- Pattern: 001-001-0000001-0000004 (4 parts, 3 dashes)
-- Target: 001-001-0000004

UPDATE public.invoices
SET invoice_number = split_part(invoice_number, '-', 1) || '-' || 
                     split_part(invoice_number, '-', 2) || '-' || 
                     split_part(invoice_number, '-', 4)
WHERE invoice_number LIKE '%-%-%-%';
