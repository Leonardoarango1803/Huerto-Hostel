-- V12: Trazabilidad de inventario (RF19, RF20)
-- Cada entrada, salida por consumo o merma queda registrada con el stock resultante.

CREATE TYPE tipo_mov_inventario_enum AS ENUM ('ENTRADA', 'SALIDA_CONSUMO', 'AJUSTE_MERMA');

CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    contacto VARCHAR(80),
    telefono VARCHAR(20),
    email VARCHAR(100),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE insumo ADD COLUMN id_proveedor_habitual INT REFERENCES proveedor(id_proveedor);

CREATE TABLE movimiento_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    id_insumo INT NOT NULL REFERENCES insumo(id_insumo),
    tipo_movimiento tipo_mov_inventario_enum NOT NULL,
    cantidad NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    stock_resultante NUMERIC(10,2) NOT NULL,
    referencia_origen VARCHAR(100),
    id_empleado INT REFERENCES empleado(id_empleado),
    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_inventario_insumo ON movimiento_inventario(id_insumo, fecha_hora);
