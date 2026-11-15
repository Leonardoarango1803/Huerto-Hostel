-- V28: Inicio de sesion con Google para huespedes y origen de cada cliente (aditivo).
--  * usuario.google_sub: identificador de la cuenta de Google ligada (solo huespedes). Unico cuando existe.
--  * cliente.origen: donde se creo la ficha (RECEPCION, WEB o GOOGLE). Es informativo para el personal.
--    Las fichas existentes quedan como RECEPCION, salvo las que nacieron con una reserva ONLINE (web).

ALTER TABLE usuario ADD COLUMN google_sub VARCHAR(64);
CREATE UNIQUE INDEX uq_usuario_google_sub ON usuario (google_sub) WHERE google_sub IS NOT NULL;

ALTER TABLE cliente
    ADD COLUMN origen VARCHAR(10) NOT NULL DEFAULT 'RECEPCION'
        CONSTRAINT chk_cliente_origen CHECK (origen IN ('RECEPCION', 'WEB', 'GOOGLE'));

UPDATE cliente c
SET origen = 'WEB'
WHERE (SELECT r.canal_reserva::text
       FROM reserva r
       WHERE r.id_cliente = c.id_cliente
       ORDER BY r.fecha_registro NULLS LAST, r.id_reserva
       LIMIT 1) = 'ONLINE';
