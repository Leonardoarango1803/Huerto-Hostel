-- V29: Dos reservas vigentes de la misma habitacion no pueden cruzarse en fechas.
-- El codigo ya lo revisa (y bloquea la habitacion para que dos peticiones simultaneas hagan fila), pero esta
-- regla es el respaldo en la base: si algun camino futuro olvida el bloqueo, la segunda reserva se rechaza igual.
-- El rango es [llegada, salida): alguien puede llegar el mismo dia en que otro sale. Canceladas y completadas
-- no ocupan (misma regla que ReservaRepository.findConflictos). Al aplicarse no habia cruces vigentes.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reserva
    ADD CONSTRAINT ex_reserva_sin_cruce
    EXCLUDE USING gist (
        id_habitacion WITH =,
        daterange(fecha_checkin_previsto, fecha_checkout_previsto, '[)') WITH &&
    )
    WHERE (estado_reserva NOT IN ('CANCELADA', 'COMPLETADA'));
