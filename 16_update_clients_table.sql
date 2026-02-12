-- Add new columns to clients table to match the UI design
-- Needs: phone, city, status, category

alter table public.clients 
add column if not exists phone text,
add column if not exists city text,
add column if not exists status text default 'active', -- 'active', 'inactive', 'pending'
add column if not exists category text default 'general'; -- 'industrial', 'construction', etc.

-- Optional: Comments for clarity
comment on column public.clients.status is 'active, inactive, or pending';
comment on column public.clients.category is 'Business category or segment';
