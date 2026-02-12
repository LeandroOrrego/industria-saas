-- AUTO-ASIGNAR ORGANIZATION_ID
-- Para evitar tener que enviar organization_id desde el frontend en cada insert,
-- creamos un trigger que lo rellena automáticamente basándose en el perfil del usuario.

create or replace function public.handle_new_record_organization()
returns trigger as $$
begin
  -- Si no viene organization_id, lo buscamos del perfil del usuario actual
  if NEW.organization_id is null then
    select organization_id into NEW.organization_id
    from public.profiles
    where id = auth.uid();
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Aplicar trigger a Products
drop trigger if exists set_org_id_products on public.products;
create trigger set_org_id_products
before insert on public.products
for each row execute function public.handle_new_record_organization();

-- Aplicar trigger a Clients
drop trigger if exists set_org_id_clients on public.clients;
create trigger set_org_id_clients
before insert on public.clients
for each row execute function public.handle_new_record_organization();

-- Aplicar trigger a Service Orders
drop trigger if exists set_org_id_service_orders on public.service_orders;
create trigger set_org_id_service_orders
before insert on public.service_orders
for each row execute function public.handle_new_record_organization();

-- Aplicar trigger a Invoices
drop trigger if exists set_org_id_invoices on public.invoices;
create trigger set_org_id_invoices
before insert on public.invoices
for each row execute function public.handle_new_record_organization();
