package pe.edu.utp.huertohostel.exception;

/**
 * La clave es correcta pero la cuenta no entra por este sitio: los huespedes entran por la web y el personal por el
 * portal administrativo (403).
 */
public class SitioIncorrectoException extends RuntimeException {

    public SitioIncorrectoException(String mensaje) {
        super(mensaje);
    }
}
