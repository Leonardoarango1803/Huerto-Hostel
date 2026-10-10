-- Tipos de habitacion
INSERT INTO tipo_habitacion (nombre, descripcion, capacidad_personas, precio_noche) VALUES
('Matrimonial', 'Habitacion doble con cama queen, ideal para parejas', 2, 140.00),
('Matrimonial Premium', 'Habitacion doble con vista al jardin y balcon', 2, 165.00),
('Doble Simple', 'Habitacion con dos camas individuales', 2, 120.00),
('Familiar', 'Habitacion amplia con cama queen y dos individuales', 4, 220.00),
('Compartida', 'Cama en habitacion compartida tipo hostel', 1, 45.00);

-- Habitaciones Piso 1
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '101', 1, 'Vista al huerto interior', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '102', 1, 'Vista Huacachina', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '103', 1, 'Ala Poniente', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Doble Simple';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '104', 1, 'Ala Oriente', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Doble Simple';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '105', 1, 'Frente a piscina del huerto', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Familiar';

-- Habitaciones Piso 2
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '201', 2, 'Lockers personales y A/C', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Compartida';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '202', 2, 'Vista vinedos y dunas', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial Premium';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '203', 2, 'Cama king size', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial Premium';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '204', 2, 'Balcon privado interior', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '205', 2, 'Terraza compartida', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Compartida';

-- Habitaciones Piso 3
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '301', 3, 'Suite con jacuzzi', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial Premium';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '302', 3, 'Vista 360 dunas', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Matrimonial';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '303', 3, 'Habitacion familiar panoramica', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Familiar';
INSERT INTO habitacion (id_tipo_habitacion, numero, piso, descripcion, estado_operativo)
SELECT id_tipo_habitacion, '304', 3, 'Ala norte - silenciosa', 'DISPONIBLE' FROM tipo_habitacion WHERE nombre = 'Doble Simple';
