-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- Enums (Tipos de datos) - Manejo de duplicados con DO BLOCK
do $$ 
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type user_role as enum ('admin', 'operario', 'administrativo');
    end if;
    if not exists (select 1 from pg_type where typname = 'product_type') then
        create type product_type as enum ('ferreteria', 'material');
    end if;
    if not exists (select 1 from pg_type where typname = 'os_status') then
        create type os_status as enum ('abierta', 'en_proceso', 'finalizada', 'facturada');
    end if;
    if not exists (select 1 from pg_type where typname = 'product_unit') then
        create type product_unit as enum ('un', 'm', 'm2', 'kg');
    end if;
end $$;

-- Tabla de Perfiles (Extiende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role user_role default 'operario',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Productos
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type product_type not null,
  unit product_unit not null,
  conversion_factor numeric default 1, -- Factor de conversión: Unidad a Consumo (ej. 1 Chapa = 2.4 m2)
  min_stock numeric default 0,
  current_stock numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Clientes
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  tax_id text, -- CUIT/RUC
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Órdenes de Servicio (OS)
create table if not exists public.service_orders (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete restrict,
  status os_status default 'abierta',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ítems de Orden de Servicio (Detalle de Materiales)
create table if not exists public.service_order_items (
  id uuid default uuid_generate_v4() primary key,
  os_id uuid references public.service_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  quantity numeric not null, -- Cantidad en unidades de CONSUMO (ej. m2)
  is_billed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Facturas
create table if not exists public.invoices (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete restrict,
  os_id uuid references public.service_orders(id) on delete set null, -- Enlace opcional
  total_amount numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Líneas de Factura
create table if not exists public.invoice_lines (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade,
  os_item_id uuid references public.service_order_items(id), -- Nullable si es línea personalizada
  description text not null,
  quantity numeric not null,
  unit_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRIGGER: Gestionar Stock al cambiar Ítem de OS (Insertar, Actualizar, Borrar)
create or replace function manage_stock_on_os_item_change()
returns trigger as $$
begin
  -- Manejar INSERT (Resta stock)
  if (TG_OP = 'INSERT') then
    update public.products
    set current_stock = current_stock - (NEW.quantity * conversion_factor)
    where id = NEW.product_id;
    return NEW;
  
  -- Manejar DELETE (Devuelve stock)
  elsif (TG_OP = 'DELETE') then
    update public.products
    set current_stock = current_stock + (OLD.quantity * conversion_factor)
    where id = OLD.product_id;
    return OLD;
  
  -- Manejar UPDATE (Ajusta diferencia)
  elsif (TG_OP = 'UPDATE') then
    -- Fórmula: actual - (nueva_cant - vieja_cant) * factor
    update public.products
    set current_stock = current_stock - ((NEW.quantity - OLD.quantity) * conversion_factor)
    where id = NEW.product_id;
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Definición del Trigger (Drop si existe para evitar error de duplicado)
drop trigger if exists tr_manage_stock_os_items on public.service_order_items;
create trigger tr_manage_stock_os_items
after insert or update or delete on public.service_order_items
for each row execute function manage_stock_on_os_item_change();


-- POLÍTICAS DE SEGURIDAD (RLS) --

-- Habilitar RLS
alter table profiles enable row level security;
alter table products enable row level security;
alter table clients enable row level security;
alter table service_orders enable row level security;
alter table service_order_items enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;

-- Políticas para Perfiles
drop policy if exists "Perfiles públicos visibles para todos" on profiles;
create policy "Perfiles públicos visibles para todos" on profiles for select using (true);

drop policy if exists "Usuarios editan su propio perfil" on profiles;
create policy "Usuarios editan su propio perfil" on profiles for update using (auth.uid() = id);

-- Políticas para Productos
drop policy if exists "Productos visibles para autenticados" on products;
create policy "Productos visibles para autenticados" on products for select to authenticated using (true);

drop policy if exists "Gestión productos por admin/adminis" on products;
create policy "Gestión productos por admin/adminis" on products for all to authenticated using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'administrativo')
  )
);

-- Políticas para Órdenes de Servicio (OS)
drop policy if exists "OS visibles para autenticados" on service_orders;
create policy "OS visibles para autenticados" on service_orders for select to authenticated using (true);

drop policy if exists "OS editables por autorizados" on service_orders;
create policy "OS editables por autorizados" on service_orders for all to authenticated using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'operario', 'administrativo')
  )
);

-- Políticas para Ítems de OS
drop policy if exists "Items OS visibles para autenticados" on service_order_items;
create policy "Items OS visibles para autenticados" on service_order_items for select to authenticated using (true);

drop policy if exists "Items OS editables por autorizados" on service_order_items;
create policy "Items OS editables por autorizados" on service_order_items for all to authenticated using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'operario', 'administrativo')
  )
);

-- Políticas para Facturas
drop policy if exists "Facturas gestión por admin/adminis" on invoices;
create policy "Facturas gestión por admin/adminis" on invoices for all to authenticated using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'administrativo')
  )
);

drop policy if exists "Lineas Factura gestión por admin/adminis" on invoice_lines;
create policy "Lineas Factura gestión por admin/adminis" on invoice_lines for all to authenticated using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'administrativo')
  )
);
