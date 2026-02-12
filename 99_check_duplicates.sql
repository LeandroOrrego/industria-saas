-- Check for products with duplicate names, showing stock and deleted status
SELECT 
    name, 
    count(*) as count,
    array_agg(id) as ids,
    array_agg(current_stock) as stocks,
    array_agg(sale_price) as prices,
    array_agg(deleted_at) as deleted_dates
FROM products 
GROUP BY name 
HAVING count(*) > 1;

-- Also specifically check for 'Chapa de Hierro Negra 1/8'
SELECT * FROM products WHERE name ILIKE '%Chapa de Hierro Negra 1/8%';
