-- Tipos de estado de compra
create type purchase_status as enum ('draft', 'ordered', 'received', 'cancelled');
create type movement_type as enum ('in', 'out', 'adjustment');

-- Tabla de Órdenes de Compra
create table if not exists public.purchase_orders (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete restrict,
  status purchase_status default 'draft',
  order_date date default now(),
  delivery_date date,
  total_amount numeric default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Items de Orden de Compra
create table if not exists public.purchase_order_items (
  id uuid default uuid_generate_v4() primary key,
  po_id uuid references public.purchase_orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete restrict not null,
  quantity numeric not null,
  unit_price numeric default 0,
  received_quantity numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Compras (Stock Movements) - Historial físico
create table if not exists public.stock_movements (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete restrict not null,
  type movement_type not null,
  quantity numeric not null, -- Siempre positivo, el tipo define si suma o resta
  reference_id uuid, -- ID de OS o PO
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id)
);

-- RLS
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.stock_movements enable row level security;

-- Policies for Purchase Orders
create policy "PO visible to organization"
  on public.purchase_orders for select
  to authenticated
  using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "PO editable by authorized"
  on public.purchase_orders for all
  to authenticated
  using (
    organization_id = (select organization_id from public.profiles where id = auth.uid())
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'administrativo'))
  );

-- Policies for Items (via PO)
create policy "PO Items visible to organization"
  on public.purchase_order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_items.po_id
      and po.organization_id = (select organization_id from public.profiles where id = auth.uid())
    )
  );

create policy "PO Items editable by authorized"
  on public.purchase_order_items for all
  to authenticated
  using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_items.po_id
      and po.organization_id = (select organization_id from public.profiles where id = auth.uid())
    )
  );

-- Policies for Movements
create policy "Movements visible to organization"
  on public.stock_movements for select
  to authenticated
  using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Movements create by authorized"
  on public.stock_movements for insert
  to authenticated
  with check (organization_id = (select organization_id from public.profiles where id = auth.uid()));


-- Function: Process Stock when PO is Received
create or replace function process_purchase_receipt(p_po_id uuid, p_user_id uuid)
returns void as $$
declare
  r_item record;
  v_org_id uuid;
begin
  -- Get Org ID
  select organization_id into v_org_id from public.purchase_orders where id = p_po_id;
  
  -- Update Status
  update public.purchase_orders set status = 'received' where id = p_po_id;

  -- Loop items
  for r_item in select * from public.purchase_order_items where po_id = p_po_id
  loop
    -- Add to Stock
    update public.products 
    set current_stock = current_stock + r_item.quantity 
    where id = r_item.product_id;

    -- Create Movement Log
    insert into public.stock_movements (organization_id, product_id, type, quantity, reference_id, notes, user_id)
    values (v_org_id, r_item.product_id, 'in', r_item.quantity, p_po_id, 'Compra recibida', p_user_id);
    
    -- Mark received quantity (simple version assumes full receipt)
    update public.purchase_order_items set received_quantity = quantity where id = r_item.id;
  end loop;
end;
$$ language plpgsql;
