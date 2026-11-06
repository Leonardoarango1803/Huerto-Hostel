-- V19: Reportes y dashboard (aditivo; no se toca ninguna columna existente).
--  * La comanda guarda cuando cambio de estado: sin esto no se puede medir cuanto tarda cocina o bar.
--  * Indices por fecha para que los reportes por rango no recorran las tablas completas.

ALTER TABLE comanda
    ADD COLUMN fecha_en_preparacion TIMESTAMP,
    ADD COLUMN fecha_preparada TIMESTAMP,
    ADD COLUMN fecha_entregada TIMESTAMP,
    ADD COLUMN fecha_cancelada TIMESTAMP;

CREATE INDEX idx_pago_fecha ON pago (fecha_pago);
CREATE INDEX idx_reserva_fecha_registro ON reserva (fecha_registro);
CREATE INDEX idx_reserva_checkin_previsto ON reserva (fecha_checkin_previsto);
CREATE INDEX idx_estadia_checkin_real ON estadia (fecha_checkin_real);
CREATE INDEX idx_estadia_checkout_real ON estadia (fecha_checkout_real);
CREATE INDEX idx_consumo_fecha ON consumo_estadia (fecha_registro);
CREATE INDEX idx_comanda_fecha ON comanda (fecha_registro);
CREATE INDEX idx_incidencia_fecha_reporte ON incidencia_mantenimiento (fecha_reporte);
CREATE INDEX idx_tarea_limpieza_fecha ON tarea_limpieza (fecha_creacion);
CREATE INDEX idx_solicitud_fecha ON solicitud_servicio (fecha_solicitud);
