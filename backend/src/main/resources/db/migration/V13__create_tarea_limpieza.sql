-- V13: Tareas de limpieza / housekeeping (RF21)
-- Al hacer check-out se crea automaticamente una tarea de origen CHECK_OUT;
-- al completarla la habitacion vuelve a DISPONIBLE.

CREATE TYPE estado_tarea_limpieza_enum AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA');
CREATE TYPE origen_tarea_limpieza_enum AS ENUM ('CHECK_OUT', 'SOLICITUD_HUESPED', 'PROGRAMADO');

CREATE TABLE tarea_limpieza (
    id_tarea SERIAL PRIMARY KEY,
    id_habitacion INT NOT NULL REFERENCES habitacion(id_habitacion),
    id_empleado_asignado INT REFERENCES empleado(id_empleado),
    origen origen_tarea_limpieza_enum NOT NULL DEFAULT 'CHECK_OUT',
    estado estado_tarea_limpieza_enum NOT NULL DEFAULT 'PENDIENTE',
    observaciones TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP
);

CREATE INDEX idx_tarea_limpieza_estado ON tarea_limpieza(estado, id_habitacion);
