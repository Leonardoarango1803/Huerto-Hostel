-- Empleado administrador inicial
INSERT INTO empleado (id_rol, id_area, id_turno, tipo_documento, numero_documento, nombres, apellidos, correo, estado)
SELECT r.id_rol, a.id_area, t.id_turno, 'DNI', '00000001', 'Admin', 'Sistema', 'admin@huertohostel.pe', TRUE
FROM rol r, area a, turno t
WHERE r.nombre = 'ADMINISTRADOR' AND a.nombre = 'RECEPCION' AND t.nombre = 'Manana';

-- Usuario admin con password BCrypt para 'admin123' (factor 12)
INSERT INTO usuario (id_empleado, username, password_hash, tipo_usuario, estado)
SELECT e.id_empleado, 'admin', '$2a$12$6K8kMKbKMcqfqgJnf7iXoecHOqVAw7m1b1.MJyGMf1FyeFpZzn7na', 'EMPLEADO', TRUE
FROM empleado e WHERE e.numero_documento = '00000001';
