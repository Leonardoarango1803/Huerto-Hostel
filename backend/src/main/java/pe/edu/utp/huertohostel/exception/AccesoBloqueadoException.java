package pe.edu.utp.huertohostel.exception;

/** Demasiados intentos fallidos de login: la cuenta o la conexion queda en espera un rato (429). */
public class AccesoBloqueadoException extends RuntimeException {

    private final long segundosRestantes;

    public AccesoBloqueadoException(String mensaje, long segundosRestantes) {
        super(mensaje);
        this.segundosRestantes = Math.max(1, segundosRestantes);
    }

    public long getSegundosRestantes() {
        return segundosRestantes;
    }
}
