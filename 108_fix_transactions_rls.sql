-- 108_fix_transactions_rls.sql

-- Drop existing restrictive policy
drop policy if exists "Transactions managed by admin" on public.transactions;

-- Create new policy allowing admin AND administrativo
create policy "Transactions managed by staff"
  on public.transactions for all
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'administrativo', 'owner'))
  );
