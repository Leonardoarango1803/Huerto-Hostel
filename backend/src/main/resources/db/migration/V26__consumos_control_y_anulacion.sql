-- Consumos: de donde viene cada uno, quien lo registro y anulacion con constancia (y devolucion de stock).
ALTER TYPE tipo_mov_inventario_enum ADD VALUE IF NOT EXISTS 'DEVOLUCION_CONSUMO';

ALTER TABLE consumo_estadia
    ADD COLUMN origen VARCHAR(12) NOT NULL DEFAULT 'DIRECTO' CHECK (origen IN ('COMANDA', 'DIRECTO', 'SOLICITUD')),
    ADD COLUMN id_empleado_registra INT REFERENCES empleado(id_empleado);

UPDATE consumo_estadia SET origen = 'COMANDA' WHERE id_comanda IS NOT NULL;

-- El consumo anulado se borra del folio (asi todas las sumas quedan bien) y se guarda aqui con quien y por que.
CREATE TABLE consumo_anulado (
    id_anulacion SERIAL PRIMARY KEY,
    id_consumo_original INT NOT NULL,
    id_estadia INT NOT NULL REFERENCES estadia(id_estadia),
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad SMALLINT NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    total_consumo NUMERIC(10,2) NOT NULL,
    origen VARCHAR(12) NOT NULL,
    fecha_registro_original TIMESTAMP,
    id_empleado_registra INT REFERENCES empleado(id_empleado),
    id_empleado_anula INT REFERENCES empleado(id_empleado),
    motivo VARCHAR(200) NOT NULL,
    fecha_anulacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consumo_anulado_estadia ON consumo_anulado (id_estadia, fecha_anulacion);
CREATE INDEX idx_movimiento_inventario_referencia ON movimiento_inventario (referencia_origen);
