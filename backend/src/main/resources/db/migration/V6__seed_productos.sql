-- Productos de cocina
INSERT INTO producto (nombre, descripcion, categoria, precio_venta) VALUES
('Sandwich Mixto', 'Sandwich de jamon y queso con vegetales', 'COCINA', 12.00),
('Omelet de verduras', 'Omelet con pimiento, cebolla y tomate', 'COCINA', 15.00),
('Tostadas con mermelada', 'Pan tostado artesanal con mermelada casera', 'COCINA', 8.00),
('Ensalada fresca', 'Ensalada de estacion con aderezo vinagreta', 'COCINA', 14.00),
('Sopa del dia', 'Sopa casera segun disponibilidad', 'COCINA', 12.00);

-- Productos de bar
INSERT INTO producto (nombre, descripcion, categoria, precio_venta) VALUES
('Cafe americano', 'Cafe filtrado de la casa', 'BAR', 6.00),
('Jugo de frutas natural', 'Jugo de temporada sin azucar anadida', 'BAR', 8.00),
('Cerveza artesanal', 'Cerveza artesanal local 330ml', 'BAR', 12.00),
('Agua mineral 500ml', 'Agua mineral embotellada', 'BAR', 4.00),
('Vino de la casa (copa)', 'Vino tinto o blanco de la carta', 'BAR', 18.00);

-- Productos directos (sin cocina, sin bar)
INSERT INTO producto (nombre, descripcion, categoria, precio_venta) VALUES
('Amenities kit', 'Kit de aseo personal (shampoo, jabon, acondicionador)', 'DIRECTO', 10.00),
('Toalla extra', 'Toalla adicional de bano', 'DIRECTO', 5.00),
('Late check-out (1h)', 'Extension de hora de salida por 1 hora', 'DIRECTO', 20.00),
('Servicio de lavanderia', 'Lavado y planchado de ropa por kilo', 'DIRECTO', 15.00),
('Transfer al aeropuerto', 'Traslado al aeropuerto de Ica', 'DIRECTO', 50.00);
