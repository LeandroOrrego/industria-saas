-- MIGRACIÓN A MULTI-TENANT (SaaS) - CORREGIDO
-- Orden de ejecución ajustado para evitar errores de columnas inexistentes.

-- 1. Crear tabla de Organizaciones
create table public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Insertar Organización por Defecto
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000000', 'Organización Demo');

-- 3. Modificar Tabla Profiles (AGREGAR COLUMNA ANTES DE USARLA EN POLÍTICAS)
alter table public.profiles 
add column organization_id uuid references public.organizations(id);

-- Asignar usuarios existentes a la org demo
update public.profiles set organization_id = '00000000-0000-0000-0000-000000000000' where organization_id is null;

-- 4. Modificar Entidades (Products, Clients, OS, Invoices)

-- Products
alter table public.products 
add column organization_id uuid references public.organizations(id);
update public.products set organization_id = '00000000-0000-0000-0000-000000000000' where organization_id is null;
alter table public.products alter column organization_id set not null;

-- Clients
alter table public.clients 
add column organization_id uuid references public.organizations(id);
update public.clients set organization_id = '00000000-0000-0000-0000-000000000000' where organization_id is null;
alter table public.clients alter column organization_id set not null;

-- Service Orders
alter table public.service_orders 
add column organization_id uuid references public.organizations(id);
update public.service_orders set organization_id = '00000000-0000-0000-0000-000000000000' where organization_id is null;
alter table public.service_orders alter column organization_id set not null;

-- Invoices
alter table public.invoices 
add column organization_id uuid references public.organizations(id);
update public.invoices set organization_id = '00000000-0000-0000-0000-000000000000' where organization_id is null;
alter table public.invoices alter column organization_id set not null;

-- 5. APLICAR POLÍTICAS DE SEGURIDAD (RLS)
-- Ahora que todas las tablas tienen organization_id, podemos crear las políticas seguramente.

-- Organizaciones (Ahora sí podemos referenciar profiles.organization_id)
alter table public.organizations enable row level security;
create policy "Usuarios ven su propia organizacion" on organizations for select using (
  id in (select organization_id from profiles where profiles.id = auth.uid())
);

-- Profiles
drop policy "Perfiles públicos visibles para todos" on profiles;
create policy "Ver perfiles de mi org" on profiles for select using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);

-- Products
drop policy "Productos visibles para autenticados" on products;
drop policy "Gestión productos por admin/adminis" on products;

create policy "Productos ver misma org" on products for select using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);
create policy "Productos gestion misma org" on products for all using (
  organization_id = (select organization_id from profiles where id = auth.uid())
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'administrativo')
  )
);

-- Clients
create policy "Clientes ver misma org" on clients for select using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);
create policy "Clientes gestion misma org" on clients for all using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);

-- Service Orders (OS)
drop policy "OS visibles para autenticados" on service_orders;
drop policy "OS editables por autorizados" on service_orders;

create policy "OS ver misma org" on service_orders for select using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);
create policy "OS gestion misma org" on service_orders for all using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);

-- Service Order Items
drop policy "Items OS visibles para autenticados" on service_order_items;
drop policy "Items OS editables por autorizados" on service_order_items;

create policy "Items OS ver misma org" on service_order_items for select using (
  exists (
    select 1 from service_orders os
    where os.id = service_order_items.os_id
    and os.organization_id = (select organization_id from profiles where id = auth.uid())
  )
);
create policy "Items OS gestion misma org" on service_order_items for all using (
  exists (
    select 1 from service_orders os
    where os.id = service_order_items.os_id
    and os.organization_id = (select organization_id from profiles where id = auth.uid())
  )
);

-- Invoices
drop policy "Facturas gestión por admin/adminis" on invoices;

create policy "Facturas ver misma org" on invoices for select using (
  organization_id = (select organization_id from profiles where id = auth.uid())
);
create policy "Facturas gestion misma org" on invoices for all using (
  organization_id = (select organization_id from profiles where id = auth.uid())
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'administrativo')
  )
);
