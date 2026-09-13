WITH general_colors(color_name, ord) AS (
  VALUES
    ('Noir', 1), ('Blanc', 2), ('Rouge', 3), ('Bleu', 4), ('Vert', 5), ('Jaune', 6),
    ('Rose', 7), ('Gris', 8), ('Marron', 9), ('Beige', 10), ('Doré', 11), ('Argenté', 12)
),
products_needing_colors AS (
  SELECT p.id AS product_id
  FROM public.products p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id = p.id AND pv.kind = 'color'
  )
)
INSERT INTO public.product_variants (product_id, kind, value, extra_price, sort_order)
SELECT pnc.product_id, 'color', gc.color_name, 0, gc.ord
FROM products_needing_colors pnc
CROSS JOIN general_colors gc;

WITH hair_colors(color_name, ord) AS (
  VALUES
    ('Noir naturel', 13), ('Brun', 14), ('Châtain', 15), ('Blond', 16),
    ('Roux', 17), ('Gris/Grisonnant', 18), ('Ombré', 19), ('Bordeaux', 20)
),
cheveux_products AS (
  SELECT p.id AS product_id
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id AND c.slug = 'cheveux'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id = p.id AND pv.kind = 'color' AND pv.value IN (
      SELECT hc.color_name FROM hair_colors hc
    )
  )
)
INSERT INTO public.product_variants (product_id, kind, value, extra_price, sort_order)
SELECT cp.product_id, 'color', hc.color_name, 0, hc.ord
FROM cheveux_products cp
CROSS JOIN hair_colors hc;