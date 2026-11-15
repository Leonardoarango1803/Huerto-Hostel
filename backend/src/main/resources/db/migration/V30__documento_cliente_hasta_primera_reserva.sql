-- V30: El huesped que crea su cuenta con Google puede no tener documento todavia: se le pide (como titular) en su
-- primera reserva. Por eso tipo y numero de documento dejan de ser obligatorios. El numero sigue siendo UNICO
-- (PostgreSQL permite varios NULL) y, si hay uno, debe venir con su tipo.

ALTER TABLE cliente ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE cliente ALTER COLUMN numero_documento DROP NOT NULL;
ALTER TABLE cliente
    ADD CONSTRAINT chk_cliente_documento_completo
        CHECK ((numero_documento IS NULL) = (tipo_documento IS NULL));
