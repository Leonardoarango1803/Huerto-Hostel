-- V18: Inventario completo (aditivo; no se toca ninguna columna existente).
--  * area del insumo: permite que Housekeeping vea solo los de limpieza.
--  * costo unitario: valorizacion del stock y costo de cada receta.
--  * movimiento: faltante (lo que la receta pidio y el almacen no tenia), costo y proveedor de la compra.
--  * AJUSTE_INGRESO: sobrante detectado en un conteo fisico (la merma ya existia como AJUSTE_MERMA).

ALTER TYPE tipo_mov_inventario_enum ADD VALUE IF NOT EXISTS 'AJUSTE_INGRESO';

ALTER TABLE insumo
    ADD COLUMN area VARCHAR(20) NOT NULL DEFAULT 'GENERAL'
        CHECK (area IN ('GENERAL', 'COCINA', 'BAR', 'LIMPIEZA')),
    ADD COLUMN costo_unitario NUMERIC(10,4) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0);

ALTER TABLE movimiento_inventario
    ADD COLUMN cantidad_faltante NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (cantidad_faltante >= 0),
    ADD COLUMN costo_unitario NUMERIC(10,4) CHECK (costo_unitario >= 0),
    ADD COLUMN id_proveedor INT REFERENCES proveedor(id_proveedor);

CREATE UNIQUE INDEX uq_insumo_nombre ON insumo (LOWER(nombre));

CREATE INDEX idx_mov_inventario_fecha ON movimiento_inventario (fecha_hora);
