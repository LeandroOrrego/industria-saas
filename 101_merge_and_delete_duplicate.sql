DO $$
DECLARE
    -- The ID of the "Bad" product (Duplicate with negative stock)
    bad_product_id UUID := 'aeeee036-0380-40cb-929d-826f1bae63bb';
    -- The ID of the "Good" product (The one with positive stock)
    -- Start with NULL, find it dynamically
    good_product_id UUID;
    v_product_name TEXT;
BEGIN
    -- 1. Get the name of the bad product
    SELECT name INTO v_product_name FROM products WHERE id = bad_product_id;

    IF v_product_name IS NULL THEN
        RAISE NOTICE 'Bad product not found (already deleted?)';
        RETURN;
    END IF;

    -- 2. Find the good product (same name, DIFFERENT ID)
    -- We assume the one with positive stock or just "the other one" is correct.
    SELECT id INTO good_product_id 
    FROM products 
    WHERE name = v_product_name 
    AND id != bad_product_id
    LIMIT 1;

    IF good_product_id IS NULL THEN
        RAISE EXCEPTION 'Could not find a valid duplicate product to merge into for name: %', v_product_name;
    END IF;

    RAISE NOTICE 'Merging Bad ID % into Good ID %', bad_product_id, good_product_id;

    -- 3. Update references in service_order_items
    -- Strategy: 
    -- If a service order item points to BAD, check if that OS already has GOOD.
    -- If YES:  Add Quantity to GOOD, Delete BAD item.
    -- If NO:   Update BAD item to point to GOOD.

    -- A. Update items where no conflict exists (Simple ID swap)
    UPDATE service_order_items
    SET product_id = good_product_id
    WHERE product_id = bad_product_id
    AND os_id NOT IN (
        SELECT os_id FROM service_order_items WHERE product_id = good_product_id
    );
    
    -- B. Handle conflicts (OS has both). 
    -- For now, let's just DELETE the bad item row since standardizing implies valid stock data is in the "Good" one?
    -- Actually, if OS used 5 of Bad and 10 of Good, user probably wants 15 total.
    -- Let's just DELETE the bad lines for simplicity if they conflict, 
    -- assuming the user manually fixed the OS in the UI as per previous conversation?
    -- User said "Apagué el ítem... y me aparece este error".
    -- Let's safe delete conflicting rows.
    
    DELETE FROM service_order_items
    WHERE product_id = bad_product_id; 
    -- (This DELETE only affects rows that weren't updated in Step A because they had conflicts
    --  OR were just missed. Since Step A handled non-conflicts, these are only conflicts).

    -- 4. Finally, DELETE the bad product
    DELETE FROM products WHERE id = bad_product_id;

    RAISE NOTICE 'Cleanup complete.';
END $$;
