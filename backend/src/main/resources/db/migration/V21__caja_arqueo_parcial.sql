-- Arqueo parcial: conteo del efectivo a mitad de turno, sin cerrar la caja. Guarda lo esperado y la diferencia
-- solo para el administrador; quien cuenta ve unicamente si cuadra, falta o sobra.
CREATE TABLE arqueo_parcial (
    id_arqueo SERIAL PRIMARY KEY,
    id_turno_caja INT NOT NULL REFERENCES turno_caja(id_turno_caja),
    id_empleado INT REFERENCES empleado(id_empleado),
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW(),
    efectivo_contado NUMERIC(10,2) NOT NULL CHECK (efectivo_contado >= 0),
    efectivo_esperado NUMERIC(10,2) NOT NULL,
    diferencia NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_arqueo_parcial_turno ON arqueo_parcial (id_turno_caja, fecha_hora);
