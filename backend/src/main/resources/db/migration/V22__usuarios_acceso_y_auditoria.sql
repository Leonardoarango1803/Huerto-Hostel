-- Gestion de accesos: cambio obligatorio de la clave temporal, invalidacion de sesiones al cambiar la clave
-- (password_actualizada viaja dentro del token) y bitacora de lo sensible que hace el administrador.
ALTER TABLE usuario
    ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN password_actualizada TIMESTAMP,
    ADD COLUMN ultimo_acceso TIMESTAMP;

-- Sin llaves foraneas a proposito: la bitacora debe sobrevivir aunque luego se borre el empleado o el usuario.
CREATE TABLE auditoria_gestion (
    id_auditoria SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    accion VARCHAR(40) NOT NULL,
    actor_username VARCHAR(60),
    id_empleado_objetivo INT,
    objetivo VARCHAR(150),
    detalle TEXT
);

CREATE INDEX idx_auditoria_gestion_fecha ON auditoria_gestion (fecha_hora DESC);
