-- El turno se sembro como "Manana" (sin la ñ). Idempotente: si ya se renombro desde la pantalla de Turnos, no hace nada.
UPDATE turno SET nombre = 'Mañana' WHERE nombre = 'Manana';
