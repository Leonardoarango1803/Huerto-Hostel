package pe.edu.utp.huertohostel.exception;

/**
 * La pasarela (simulada) no aprobo el cobro. Es una RuntimeException para que la transaccion de la
 * reserva web se deshaga entera: no queda cuenta, reserva ni pago. Se responde 402 con un codigo
 * propio para que la web muestre la pantalla de pago rechazado y no un error generico.
 */
public class PagoRechazadoException extends RuntimeException {

    private final String codigoOperacion;

    public PagoRechazadoException(String mensaje, String codigoOperacion) {
        super(mensaje);
        this.codigoOperacion = codigoOperacion;
    }

    public String getCodigoOperacion() {
        return codigoOperacion;
    }
}
