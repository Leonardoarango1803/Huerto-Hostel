-- V17: Caja unica del hotel
-- Hasta ahora cada empleado abria SU turno: lo que abria recepcion no lo veia el cajero.
-- Desde aqui hay un solo turno ABIERTO a la vez para todo el hotel; recepcion, cajero y
-- administrador operan sobre el mismo y cualquiera de ellos puede cerrarlo (relevo).

-- Quien cerro el turno (id_empleado sigue siendo quien lo abrio).
ALTER TABLE turno_caja ADD COLUMN id_empleado_cierre INT REFERENCES empleado(id_empleado);

-- La base garantiza la regla aunque dos personas abran a la vez: el check-then-insert
-- de la aplicacion no es atomico. ((TRUE)) indexa una constante, asi que solo cabe una
-- fila con estado ABIERTO; los turnos CERRADO/AUDITADO no tienen limite.
CREATE UNIQUE INDEX uq_turno_caja_abierto ON turno_caja ((TRUE)) WHERE estado = 'ABIERTO';
