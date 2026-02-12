-- 105_add_client_address_email.sql

-- Agregar columas de dirección y email a la tabla de clientes
alter table public.clients
  add column if not exists address text,
  add column if not exists email text;

-- Migrar datos existentes: Copiar 'city' a 'address' si 'address' está vacío, asumiendo que antes guardaban la dirección en 'city'
update public.clients 
set address = city 
where address is null and city is not null;
