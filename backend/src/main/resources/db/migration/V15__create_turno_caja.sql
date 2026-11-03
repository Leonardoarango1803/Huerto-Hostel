-- V15: Turno de caja, arqueo ciego y bitacora de relevo (RF28-RF31, RF34)
-- Nota: la tabla `turno` existente es el catalogo de horarios del personal.
-- `turno_caja` es la sesion de caja de un recepcionista, con su arqueo.

CREATE TYPE estado_turno_enum AS ENUM ('ABIERTO', 'CERRADO', 'AUDITADO');

CREATE TABLE turno_caja (
    id_turno_caja SERIAL PRIMARY KEY,
    id_empleado INT NOT NULL REFERENCES empleado(id_empleado),
    fondo_inicial_efectivo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fondo_inicial_efectivo >= 0),
    efectivo_sistema_esperado NUMERIC(10,2),
    efectivo_real_declarado NUMERIC(10,2),
    diferencia_cuadre NUMERIC(10,2),
    estado estado_turno_enum NOT NULL DEFAULT 'ABIERTO',
    observaciones_cierre TEXT,
    fecha_apertura TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMP
);

CREATE INDEX idx_turno_caja_estado ON turno_caja(estado, id_empleado);

CREATE TABLE bitacora_turno (
    id_bitacora SERIAL PRIMARY KEY,
    id_turno_caja INT NOT NULL REFERENCES turno_caja(id_turno_caja) ON DELETE CASCADE,
    prioridad VARCHAR(10) NOT NULL DEFAULT 'MEDIA',
    categoria VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    resuelto BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bitacora_turno ON bitacora_turno(id_turno_caja);

-- Cada cobro queda ligado al turno de caja en que se registro (nullable: los pagos
-- historicos y los del portal del huesped no pertenecen a ningun turno).
ALTER TABLE pago ADD COLUMN id_turno_caja INT REFERENCES turno_caja(id_turno_caja);

CREATE INDEX idx_pago_turno_caja ON pago(id_turno_caja);
