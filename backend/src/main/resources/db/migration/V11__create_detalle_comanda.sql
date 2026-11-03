-- V11: Lineas de detalle de comanda (KDS Cocina y Bar)
-- Una comanda agrupa N items. Al marcarse ENTREGADA, cada linea se carga al folio
-- de la estadia como consumo_estadia y descuenta insumos segun receta.

CREATE TABLE detalle_comanda (
    id_detalle SERIAL PRIMARY KEY,
    id_comanda INT NOT NULL REFERENCES comanda(id_comanda) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad SMALLINT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    notas VARCHAR(150)
);

CREATE INDEX idx_detalle_comanda_comanda ON detalle_comanda(id_comanda);

-- Una comanda ahora genera varias lineas de consumo (antes la FK era 1:1)
ALTER TABLE consumo_estadia DROP CONSTRAINT IF EXISTS consumo_estadia_id_comanda_key;

-- Indice del tablero KDS: se consulta por area y estado
CREATE INDEX idx_comanda_kds ON comanda(area_destino, estado_comanda);
