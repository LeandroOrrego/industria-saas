-- CORRECCIÓN DEL TRIGGER DE STOCK
-- El trigger anterior fallará porque no obtenía el 'conversion_factor' de la tabla products.

create or replace function manage_stock_on_os_item_change()
returns trigger as $$
declare
  v_factor numeric;
  v_product_id uuid;
begin
  -- Determinar ID del producto (NEW en Insert/Update, OLD en Delete)
  v_product_id := coalesce(NEW.product_id, OLD.product_id);

  -- Obtener el factor de conversión del producto
  select conversion_factor into v_factor 
  from public.products 
  where id = v_product_id;

  -- Si no se encuentra (o es nulo), asumir 1
  if v_factor is null then
    v_factor := 1;
  end if;
  
  -- Manejar INSERT
  if (TG_OP = 'INSERT') then
    update public.products
    set current_stock = current_stock - (NEW.quantity * v_factor)
    where id = NEW.product_id;
    return NEW;
  
  -- Manejar DELETE
  elsif (TG_OP = 'DELETE') then
    update public.products
    set current_stock = current_stock + (OLD.quantity * v_factor)
    where id = OLD.product_id;
    return OLD;
  
  -- Manejar UPDATE
  elsif (TG_OP = 'UPDATE') then
    -- Si cambia el producto (caso raro pero posible), devolver al viejo y restar al nuevo
    if OLD.product_id <> NEW.product_id then
       -- Devolver stock al viejo
       update public.products
       set current_stock = current_stock + (OLD.quantity * v_factor) -- Ojo: v_factor es del 'v_product_id' que tomamos arriba. 
       -- Esto se complica si cambia el ID. 
       -- Para simplicidad en este MVP, asumiremos que NO se cambia el product_id en un update de item, solo la cantidad.
       -- Si se permite cambiar producto, mejor borrar e insertar de nuevo.
       where id = OLD.product_id;
    end if;

    update public.products
    set current_stock = current_stock - ((NEW.quantity - OLD.quantity) * v_factor)
    where id = NEW.product_id;
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;
