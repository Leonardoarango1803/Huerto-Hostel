-- V14: Incidencias de mantenimiento por habitacion
-- Permite reportar averias y seguir su reparacion. Mientras la incidencia esta
-- EN_REPARACION la habitacion puede marcarse en MANTENIMIENTO.

CREATE TYPE estado_incidencia_enum AS ENUM ('PENDIENTE', 'EN_REPARACION', 'RESUELTO');
CREATE TYPE tipo_incidencia_enum AS ENUM (
    'GRIFERIA_DUCHA', 'AIRE_ACONDICIONADO', 'ELECTRICO_FOCO', 'CERRADURA_VENTANA', 'OTRO'
);

CREATE TABLE incidencia_mantenimiento (
    id_incidencia SERIAL PRIMARY KEY,
    id_habitacion INT NOT NULL REFERENCES habitacion(id_habitacion),
    tipo_incidencia tipo_incidencia_enum NOT NULL DEFAULT 'OTRO',
    descripcion TEXT NOT NULL,
    estado estado_incidencia_enum NOT NULL DEFAULT 'PENDIENTE',
    id_empleado_reporta INT REFERENCES empleado(id_empleado),
    id_empleado_responsable INT REFERENCES empleado(id_empleado),
    observaciones TEXT,
    fecha_reporte TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_resolucion TIMESTAMP
);

CREATE INDEX idx_incidencia_estado ON incidencia_mantenimiento(estado, id_habitacion);
