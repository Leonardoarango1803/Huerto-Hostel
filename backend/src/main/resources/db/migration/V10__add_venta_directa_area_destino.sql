-- V10: Agrega VENTA_DIRECTA al enum de area destino de comanda
-- Permite registrar comandas de venta directa que no pasan por preparacion en cocina/bar.
-- Va en su propia migracion: Postgres no permite usar un valor de enum recien agregado
-- dentro de la misma transaccion que lo agrego.

ALTER TYPE area_destino_enum ADD VALUE IF NOT EXISTS 'VENTA_DIRECTA';
