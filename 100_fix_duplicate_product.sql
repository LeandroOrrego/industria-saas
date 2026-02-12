-- Delete the specific duplicate product with negative stock
DELETE FROM products 
WHERE name = 'Chapa de Hierro Negra 1/8"' 
AND current_stock < 0;

-- Optional: If you want to be safer, verify first:
-- SELECT * FROM products WHERE name = 'Chapa de Hierro Negra 1/8"' AND current_stock < 0;
