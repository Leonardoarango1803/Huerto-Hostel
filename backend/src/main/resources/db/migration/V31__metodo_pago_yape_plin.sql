-- V31: Yape/Plin como metodo de pago propio (RF23). Hasta ahora la web guardaba Yape como TRANSFERENCIA y recepcion
-- no podia elegirlo, asi que los reportes por metodo lo mezclaban con las transferencias bancarias.
-- Va sola en su migracion: PostgreSQL no deja usar un valor de enum recien creado en la misma transaccion (V8/V10).
-- Los pagos web anteriores quedan como TRANSFERENCIA (su comprobante empieza con "YAPE-"); no se reclasifican para
-- no romper a un backend desplegado con codigo anterior que lea esas filas.

ALTER TYPE metodo_pago_enum ADD VALUE IF NOT EXISTS 'YAPE_PLIN';
