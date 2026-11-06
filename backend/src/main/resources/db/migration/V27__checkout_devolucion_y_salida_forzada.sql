-- V27: Check-out completo (aditivo).
--  * movimiento_caja admite DEVOLUCION: efectivo que sale de la caja para devolver al huesped un saldo a favor (queda ligada
--    a la estadia y baja el efectivo que espera el arqueo, igual que un retiro o un gasto).
--  * estadia: marca las salidas autorizadas por el administrador con saldo pendiente (con su motivo y lo que quedo debiendo),
--    para que esa deuda no desaparezca de la vista cuando la estadia se cierra.

ALTER TABLE movimiento_caja DROP CONSTRAINT IF EXISTS movimiento_caja_tipo_check;
ALTER TABLE movimiento_caja
    ADD CONSTRAINT movimiento_caja_tipo_check CHECK (tipo IN ('RETIRO', 'GASTO', 'DEVOLUCION'));
ALTER TABLE movimiento_caja ADD COLUMN id_estadia INT REFERENCES estadia(id_estadia);
CREATE INDEX idx_movimiento_caja_estadia ON movimiento_caja (id_estadia) WHERE id_estadia IS NOT NULL;

ALTER TABLE estadia
    ADD COLUMN salida_forzada BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN motivo_salida_forzada VARCHAR(200),
    ADD COLUMN saldo_al_salir NUMERIC(10,2);
CREATE INDEX idx_estadia_salida_forzada ON estadia (salida_forzada) WHERE salida_forzada;
