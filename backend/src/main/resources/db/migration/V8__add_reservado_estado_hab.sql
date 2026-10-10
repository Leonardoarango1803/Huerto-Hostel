-- V8: Agrega el estado RESERVADO al enum de estado operativo de habitacion
-- Necesario para reflejar habitaciones con reservas confirmadas antes del check-in

ALTER TYPE estado_operativo_hab_enum ADD VALUE IF NOT EXISTS 'RESERVADO';
