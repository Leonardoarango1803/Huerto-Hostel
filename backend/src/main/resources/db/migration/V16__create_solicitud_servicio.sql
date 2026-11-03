-- V16: Solicitudes de servicio del portal del huesped (RF32)
-- Mas general que solicitud_equipaje: cubre amenidades, limpieza a pedido y
-- servicios cobrables que se cargan al folio de la estadia.

CREATE TYPE estado_solicitud_enum AS ENUM (
    'PENDIENTE', 'ASIGNADA', 'EN_ATENCION', 'ATENDIDA', 'CANCELADA'
);

CREATE TABLE solicitud_servicio (
    id_solicitud SERIAL PRIMARY KEY,
    id_estadia INT NOT NULL REFERENCES estadia(id_estadia) ON DELETE CASCADE,
    id_producto INT REFERENCES producto(id_producto),
    descripcion TEXT NOT NULL,
    cantidad SMALLINT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    es_cobrable BOOLEAN NOT NULL DEFAULT FALSE,
    monto_unidad NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_unidad >= 0),
    estado estado_solicitud_enum NOT NULL DEFAULT 'PENDIENTE',
    id_empleado_asignado INT REFERENCES empleado(id_empleado),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_atencion TIMESTAMP
);

CREATE INDEX idx_solicitud_servicio_estado ON solicitud_servicio(estado, id_estadia);
