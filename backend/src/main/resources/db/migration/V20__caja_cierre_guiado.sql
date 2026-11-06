-- V20: Caja con cierre guiado, recepcion de caja y notas de diferencia (aditivo; no se toca nada existente).
--  * turno_caja: cuantas veces el conteo no cuadro antes de cerrar, si se le mostro lo esperado, el motivo de la
--    diferencia, el desglose de lo contado y como se recibio la caja respecto a lo que dejo el turno anterior.
--  * bitacora_turno: monto (para las notas de diferencia de dinero) y quien/cuando/como se resolvio cada nota.
--  * movimiento_caja: retiros a custodia y gastos menores en efectivo, que descuentan el efectivo esperado.

ALTER TABLE turno_caja
    ADD COLUMN reconteos_cierre SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN esperado_revelado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN motivo_diferencia TEXT,
    ADD COLUMN desglose_cierre TEXT,
    ADD COLUMN efectivo_apertura_esperado NUMERIC(10,2),
    ADD COLUMN diferencia_apertura NUMERIC(10,2),
    ADD COLUMN motivo_diferencia_apertura TEXT;

ALTER TABLE bitacora_turno
    ADD COLUMN monto NUMERIC(10,2),
    ADD COLUMN id_empleado_resolvio INT REFERENCES empleado(id_empleado),
    ADD COLUMN fecha_resolucion TIMESTAMP,
    ADD COLUMN comentario_resolucion TEXT;

CREATE INDEX idx_bitacora_pendientes ON bitacora_turno (resuelto, categoria);

CREATE TABLE movimiento_caja (
    id_movimiento_caja SERIAL PRIMARY KEY,
    id_turno_caja INT NOT NULL REFERENCES turno_caja(id_turno_caja),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('RETIRO', 'GASTO')),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    motivo VARCHAR(200) NOT NULL,
    id_empleado INT REFERENCES empleado(id_empleado),
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimiento_caja_turno ON movimiento_caja (id_turno_caja, fecha_hora);
