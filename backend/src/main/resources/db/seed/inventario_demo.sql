-- Datos de ejemplo del almacen: insumos, stock inicial y recetas de los productos de cocina y bar.
-- NO es una migracion de Flyway (esta fuera de db/migration): se ejecuta a mano, una vez, en el entorno
-- que se quiera poblar. Es idempotente: no pisa insumos ni recetas que ya existan.
-- Los costos son referenciales (soles por gramo, mililitro o unidad).

WITH datos(nombre, unidad, area, stock, minimo, costo) AS (VALUES
    ('Pan de molde',                  'UND', 'COCINA',    60, 15, 0.3500),
    ('Jamon',                         'GR',  'COCINA',  3000, 500, 0.0280),
    ('Queso',                         'GR',  'COCINA',  3000, 500, 0.0320),
    ('Huevos',                        'UND', 'COCINA',    90, 24, 0.5500),
    ('Verduras surtidas',             'GR',  'COCINA',  6000,1000, 0.0060),
    ('Lechuga y tomate',              'GR',  'COCINA',  4000, 800, 0.0080),
    ('Base para sopa',                'ML',  'COCINA',  8000,2000, 0.0030),
    ('Mermelada',                     'GR',  'COCINA',  2000, 400, 0.0120),
    ('Fresas',                        'GR',  'COCINA',  2000, 400, 0.0150),
    ('Mezcla para cheesecake',        'GR',  'COCINA',  3000, 600, 0.0200),
    ('Cafe molido',                   'GR',  'BAR',     2000, 400, 0.0450),
    ('Agua mineral botella 500ml',    'UND', 'BAR',       96,  24, 0.9000),
    ('Cerveza artesanal botella',     'UND', 'BAR',       48,  12, 4.5000),
    ('Vino de la casa',               'ML',  'BAR',     6000,1500, 0.0250),
    ('Frutas para jugo',              'GR',  'BAR',     5000,1000, 0.0070),
    ('Azucar',                        'GR',  'GENERAL', 3000, 500, 0.0040),
    ('Detergente multiuso',           'ML',  'LIMPIEZA',10000,2000,0.0040),
    ('Jabon de tocador',              'UND', 'LIMPIEZA', 120,  30, 0.6000),
    ('Papel higienico',               'UND', 'LIMPIEZA', 150,  40, 0.5000),
    ('Shampoo sachet',                'UND', 'LIMPIEZA', 100,  30, 0.4000)
),
nuevos AS (
    INSERT INTO insumo (nombre, unidad_medida, stock_actual, stock_minimo, estado, area, costo_unitario)
    SELECT nombre, unidad::unidad_medida_enum, stock, minimo, TRUE, area, costo FROM datos
    ON CONFLICT DO NOTHING
    RETURNING id_insumo, stock_actual, costo_unitario
)
-- fecha_hora en hora de Lima, como la guarda la aplicacion (el NOW() de la BD esta en UTC y desordenaria el kardex).
INSERT INTO movimiento_inventario (id_insumo, tipo_movimiento, cantidad, stock_resultante, referencia_origen, costo_unitario, fecha_hora)
SELECT id_insumo, 'ENTRADA', stock_actual, stock_actual, 'Stock inicial (datos de ejemplo)', costo_unitario,
       NOW() AT TIME ZONE 'America/Lima'
FROM nuevos;

-- Una receta solo se carga si el producto aun no tiene ninguna.
INSERT INTO receta_detalle (id_producto, id_insumo, cantidad)
SELECT p.id_producto, i.id_insumo, r.cantidad
FROM (VALUES
    ('Chessecacke de fresa',  'Mezcla para cheesecake',      120),
    ('Chessecacke de fresa',  'Fresas',                       40),
    ('Ensalada fresca',       'Lechuga y tomate',            220),
    ('Omelet de verduras',    'Huevos',                        3),
    ('Omelet de verduras',    'Verduras surtidas',            80),
    ('Omelet de verduras',    'Queso',                        30),
    ('Sandwich Mixto',        'Pan de molde',                  2),
    ('Sandwich Mixto',        'Jamon',                        50),
    ('Sandwich Mixto',        'Queso',                        40),
    ('Sopa del dia',          'Base para sopa',              350),
    ('Sopa del dia',          'Verduras surtidas',           100),
    ('Tostadas con mermelada','Pan de molde',                  3),
    ('Tostadas con mermelada','Mermelada',                    30),
    ('Agua mineral 500ml',    'Agua mineral botella 500ml',    1),
    ('Cafe americano',        'Cafe molido',                  12),
    ('Cafe americano',        'Azucar',                        5),
    ('Cerveza artesanal',     'Cerveza artesanal botella',     1),
    ('Jugo de frutas natural','Frutas para jugo',            200),
    ('Jugo de frutas natural','Azucar',                       10),
    ('Vino de la casa (copa)','Vino de la casa',             150),
    ('Aseo kit',              'Jabon de tocador',              1),
    ('Aseo kit',              'Shampoo sachet',                1)
) AS r(producto, insumo, cantidad)
JOIN producto p ON LOWER(p.nombre) = LOWER(r.producto)
JOIN insumo i ON LOWER(i.nombre) = LOWER(r.insumo)
WHERE NOT EXISTS (SELECT 1 FROM receta_detalle d WHERE d.id_producto = p.id_producto)
ON CONFLICT DO NOTHING;
