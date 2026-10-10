-- Roles
INSERT INTO rol (nombre, descripcion) VALUES
('ADMINISTRADOR', 'Acceso completo al sistema'),
('RECEPCIONISTA', 'Operaciones de recepcion y atencion al huesped'),
('CAJERO', 'Gestion de cobros y pagos'),
('HOUSEKEEPING', 'Limpieza y mantenimiento de habitaciones'),
('COCINA', 'Preparacion de alimentos'),
('BAR', 'Atencion de bar y bebidas');

-- Areas
INSERT INTO area (nombre, descripcion) VALUES
('RECEPCION', 'Area de recepcion y atencion al publico'),
('COCINA', 'Area de cocina y preparacion de alimentos'),
('BAR', 'Area de bar y bebidas'),
('HOUSEKEEPING', 'Area de limpieza y mantenimiento');

-- Turnos (catalogo de horarios)
INSERT INTO turno (nombre, hora_inicio, hora_fin, descripcion) VALUES
('Manana', '06:00', '14:00', 'Turno de manana - recepcion'),
('Tarde', '14:00', '22:00', 'Turno de tarde - recepcion'),
('Noche', '22:00', '06:00', 'Turno de noche - seguridad');
