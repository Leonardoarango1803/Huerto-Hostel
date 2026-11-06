-- Incidencias: decidir si bloquean la habitacion, cerrarlas sin resolver (duplicada / no procede), reabrirlas,
-- mas tipos de averia y tiempos de respuesta.
ALTER TYPE estado_incidencia_enum ADD VALUE IF NOT EXISTS 'DUPLICADA';
ALTER TYPE estado_incidencia_enum ADD VALUE IF NOT EXISTS 'NO_PROCEDE';

ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'PLOMERIA';
ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'MOBILIARIO';
ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'CAMA_COLCHON';
ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'TV_ELECTRONICA';
ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'WIFI_INTERNET';
ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'PINTURA_PAREDES';
ALTER TYPE tipo_incidencia_enum ADD VALUE IF NOT EXISTS 'PLAGAS';

ALTER TABLE incidencia_mantenimiento
    ADD COLUMN bloquea_habitacion BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN fecha_inicio_reparacion TIMESTAMP,
    ADD COLUMN veces_reabierta SMALLINT NOT NULL DEFAULT 0;

-- Antes, una reparacion en curso siempre bloqueaba la habitacion: lo que ya estaba asi sigue bloqueando.
UPDATE incidencia_mantenimiento SET bloquea_habitacion = TRUE, fecha_inicio_reparacion = fecha_reporte
WHERE estado = 'EN_REPARACION';

CREATE INDEX idx_incidencia_bloqueantes ON incidencia_mantenimiento (id_habitacion) WHERE bloquea_habitacion;
