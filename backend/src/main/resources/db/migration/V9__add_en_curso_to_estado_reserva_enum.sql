-- Agrega el valor EN_CURSO al enum de estados de reserva
-- Representa una reserva cuyo check-in físico ya fue realizado (huésped en casa)
ALTER TYPE estado_reserva_enum ADD VALUE IF NOT EXISTS 'EN_CURSO';
