-- Corregir password del admin con hash BCrypt valido para 'admin123'
UPDATE usuario
SET password_hash = '$2a$12$z4GoNyMzyVuCqhrfgKeBOeEAMyhBHG2bM.4ZdO.BKHeGOq8n2/r0C'
WHERE username = 'admin';

-- Empleado recepcionista de prueba
INSERT INTO empleado (id_rol, id_area, id_turno, tipo_documento, numero_documento, nombres, apellidos, correo, estado)
SELECT r.id_rol, a.id_area, t.id_turno, 'DNI', '12345678', 'Maria', 'Recepcionista', 'recep1@huertohostel.pe', TRUE
FROM rol r, area a, turno t
WHERE r.nombre = 'RECEPCIONISTA' AND a.nombre = 'RECEPCION' AND t.nombre = 'Tarde'
  AND NOT EXISTS (SELECT 1 FROM empleado WHERE numero_documento = '12345678');

-- Usuario recepcionista de prueba  (username: recep1 / password: recep123)
INSERT INTO usuario (id_empleado, username, password_hash, tipo_usuario, estado)
SELECT e.id_empleado, 'recep1', '$2a$12$Rmd71odHqB.snoe9UUiQfeSPSpRIFcwC5XlGroylb/IPdn7mvHBeS', 'EMPLEADO', TRUE
FROM empleado e
WHERE e.numero_documento = '12345678'
  AND NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'recep1');
