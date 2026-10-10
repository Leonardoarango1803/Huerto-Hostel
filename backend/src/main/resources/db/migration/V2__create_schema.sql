-- Grupo A: tablas sin dependencias externas
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE area (
    id_area SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE turno (
    id_turno SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    descripcion VARCHAR(200),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    nacionalidad VARCHAR(60),
    fecha_nacimiento DATE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tipo_habitacion (
    id_tipo_habitacion SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(300),
    capacidad_personas SMALLINT NOT NULL CHECK (capacidad_personas > 0),
    precio_noche NUMERIC(10,2) NOT NULL CHECK (precio_noche > 0),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

-- Grupo B: dependen de Grupo A
CREATE TABLE empleado (
    id_empleado SERIAL PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES rol(id_rol),
    id_area INT NOT NULL REFERENCES area(id_area),
    id_turno INT NOT NULL REFERENCES turno(id_turno),
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE habitacion (
    id_habitacion SERIAL PRIMARY KEY,
    id_tipo_habitacion INT NOT NULL REFERENCES tipo_habitacion(id_tipo_habitacion),
    numero VARCHAR(10) NOT NULL UNIQUE,
    piso SMALLINT NOT NULL,
    descripcion VARCHAR(200),
    estado_operativo estado_operativo_hab_enum NOT NULL DEFAULT 'DISPONIBLE',
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE insumo (
    id_insumo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    unidad_medida unidad_medida_enum NOT NULL,
    stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(300),
    categoria categoria_producto_enum NOT NULL,
    precio_venta NUMERIC(10,2) NOT NULL CHECK (precio_venta >= 0),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

-- Grupo C: dependen de Grupo B
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_empleado INT UNIQUE REFERENCES empleado(id_empleado),
    id_cliente INT UNIQUE REFERENCES cliente(id_cliente),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tipo_usuario tipo_usuario_enum NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usuario_tipo CHECK (
        (tipo_usuario = 'EMPLEADO' AND id_empleado IS NOT NULL AND id_cliente IS NULL) OR
        (tipo_usuario = 'CLIENTE' AND id_cliente IS NOT NULL AND id_empleado IS NULL)
    )
);

CREATE TABLE receta_detalle (
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_insumo INT NOT NULL REFERENCES insumo(id_insumo),
    cantidad NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    PRIMARY KEY (id_producto, id_insumo)
);

CREATE TABLE reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cliente(id_cliente),
    id_habitacion INT NOT NULL REFERENCES habitacion(id_habitacion),
    fecha_checkin_previsto DATE NOT NULL,
    fecha_checkout_previsto DATE NOT NULL,
    num_noches SMALLINT NOT NULL CHECK (num_noches > 0),
    monto_alojamiento_total NUMERIC(10,2) NOT NULL CHECK (monto_alojamiento_total > 0),
    canal_reserva canal_reserva_enum NOT NULL DEFAULT 'PRESENCIAL',
    estado_reserva estado_reserva_enum NOT NULL DEFAULT 'PENDIENTE_ADELANTO',
    observaciones TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fechas_reserva CHECK (fecha_checkout_previsto > fecha_checkin_previsto)
);

-- Grupo D: dependen de Grupo C
CREATE TABLE estadia (
    id_estadia SERIAL PRIMARY KEY,
    id_reserva INT NOT NULL UNIQUE REFERENCES reserva(id_reserva),
    id_habitacion INT NOT NULL REFERENCES habitacion(id_habitacion),
    fecha_checkin_real TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_checkout_real TIMESTAMP,
    estado_estadia estado_estadia_enum NOT NULL DEFAULT 'EN_CURSO'
);

-- Grupo E: dependen de Grupo D
CREATE TABLE comanda (
    id_comanda SERIAL PRIMARY KEY,
    id_estadia INT NOT NULL REFERENCES estadia(id_estadia),
    id_empleado INT NOT NULL REFERENCES empleado(id_empleado),
    area_destino area_destino_enum NOT NULL,
    estado_comanda estado_comanda_enum NOT NULL DEFAULT 'PENDIENTE',
    observaciones TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE solicitud_equipaje (
    id_solicitud SERIAL PRIMARY KEY,
    id_estadia INT NOT NULL REFERENCES estadia(id_estadia),
    id_empleado_asignado INT REFERENCES empleado(id_empleado),
    tipo_solicitud VARCHAR(20) NOT NULL CHECK (tipo_solicitud IN ('SUBIDA','BAJADA','CUSTODIA')),
    descripcion TEXT,
    estado estado_equipaje_enum NOT NULL DEFAULT 'PENDIENTE',
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_atencion TIMESTAMP
);

CREATE TABLE consumo_estadia (
    id_consumo SERIAL PRIMARY KEY,
    id_estadia INT NOT NULL REFERENCES estadia(id_estadia),
    id_comanda INT UNIQUE REFERENCES comanda(id_comanda),
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad SMALLINT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
    total_consumo NUMERIC(10,2) NOT NULL CHECK (total_consumo >= 0),
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pago (
    id_pago SERIAL PRIMARY KEY,
    id_reserva INT REFERENCES reserva(id_reserva),
    id_estadia INT REFERENCES estadia(id_estadia),
    id_empleado_registra INT REFERENCES empleado(id_empleado),
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    metodo_pago metodo_pago_enum NOT NULL,
    concepto concepto_pago_enum NOT NULL,
    num_transaccion_comprobante VARCHAR(100),
    fecha_pago TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pago_referencia CHECK (id_reserva IS NOT NULL OR id_estadia IS NOT NULL)
);
