package pe.edu.utp.huertohostel.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;
import pe.edu.utp.huertohostel.exception.AccesoBloqueadoException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

/**
 * Freno contra quien prueba contrasenas en el login.
 * <ul>
 *   <li><b>Por cuenta:</b> 5 intentos fallidos en 15 minutos bloquean ese usuario 15 minutos (aunque luego
 *   escriba la clave correcta). Un ingreso correcto borra la cuenta de fallos.</li>
 *   <li><b>Por conexion (IP):</b> 30 intentos fallidos en 15 minutos bloquean esa IP 15 minutos, para quien
 *   prueba una clave contra muchos usuarios.</li>
 * </ul>
 * Se cuenta igual para usuarios que existen y que no existen: asi el bloqueo no delata que cuentas hay. Vive en
 * memoria (un reinicio del servidor lo limpia); los bloqueos de cuentas reales quedan en la bitacora de gestion.
 */
@Service
public class ProteccionLoginService {

    public static final int MAX_FALLOS_CUENTA = 5;
    public static final int MAX_FALLOS_IP = 30;
    public static final Duration VENTANA = Duration.ofMinutes(15);
    public static final Duration BLOQUEO = Duration.ofMinutes(15);

    /** Fallos dentro de la ventana que empezo en {@code desde}; {@code hasta} != null mientras esta bloqueado. */
    private record Registro(int fallos, Instant desde, Instant hasta) {
    }

    private final Clock clock;
    private final Cache<String, Registro> cuentas = nuevaCache();
    private final Cache<String, Registro> ips = nuevaCache();

    public ProteccionLoginService(Clock clock) {
        this.clock = clock;
    }

    private static Cache<String, Registro> nuevaCache() {
        // Tope de entradas: quien inventa miles de usuarios no llena la memoria.
        return Caffeine.newBuilder()
                .maximumSize(50_000)
                .expireAfterWrite(VENTANA.plus(BLOQUEO))
                .build();
    }

    /** Lanza AccesoBloqueadoException si la conexion o la cuenta estan bloqueadas. Va antes de revisar la clave. */
    public void verificar(String username, String ip) {
        Instant ahora = clock.instant();
        Registro porIp = ips.getIfPresent(clave(ip));
        if (bloqueado(porIp, ahora)) {
            throw new AccesoBloqueadoException(mensajeIp(segundos(porIp, ahora)), segundos(porIp, ahora));
        }
        Registro porCuenta = cuentas.getIfPresent(clave(username));
        if (bloqueado(porCuenta, ahora)) {
            throw new AccesoBloqueadoException(mensajeCuenta(segundos(porCuenta, ahora)), segundos(porCuenta, ahora));
        }
    }

    /**
     * Anota un intento fallido. Si con este se llega al tope, lanza AccesoBloqueadoException (la persona ve de
     * inmediato que quedo bloqueada). Antes llama a {@code alBloquearCuenta}, una sola vez por bloqueo, para dejar
     * constancia.
     */
    public void registrarFallo(String username, String ip, Runnable alBloquearCuenta) {
        Instant ahora = clock.instant();
        Registro porIp = sumar(ips, clave(ip), MAX_FALLOS_IP, ahora);
        Registro porCuenta = sumar(cuentas, clave(username), MAX_FALLOS_CUENTA, ahora);
        if (bloqueado(porCuenta, ahora)) {
            // Solo el fallo que puso el bloqueo lo avisa: los que llegan con la cuenta ya bloqueada no.
            boolean bloqueoNuevo = porCuenta.hasta().equals(ahora.plus(BLOQUEO));
            if (bloqueoNuevo && alBloquearCuenta != null) {
                alBloquearCuenta.run();
            }
            throw new AccesoBloqueadoException(mensajeCuenta(segundos(porCuenta, ahora)), segundos(porCuenta, ahora));
        }
        if (bloqueado(porIp, ahora)) {
            throw new AccesoBloqueadoException(mensajeIp(segundos(porIp, ahora)), segundos(porIp, ahora));
        }
    }

    /** Ingreso correcto: se olvidan los fallos de la cuenta (los de la conexion siguen contando). */
    public void registrarExito(String username) {
        cuentas.invalidate(clave(username));
    }

    /** El administrador restablecio la clave: la cuenta puede volver a intentar de inmediato. */
    public void desbloquear(String username) {
        cuentas.invalidate(clave(username));
    }

    /** Hasta cuando esta bloqueada la cuenta (para la lista de usuarios), o vacio si no lo esta. */
    public Optional<LocalDateTime> bloqueadaHasta(String username) {
        Instant ahora = clock.instant();
        Registro r = cuentas.getIfPresent(clave(username));
        return bloqueado(r, ahora)
                ? Optional.of(LocalDateTime.ofInstant(r.hasta(), clock.getZone()))
                : Optional.empty();
    }

    private Registro sumar(Cache<String, Registro> cache, String clave, int tope, Instant ahora) {
        return cache.asMap().compute(clave, (k, r) -> {
            boolean empiezaDeNuevo = r == null
                    || (r.hasta() != null && !ahora.isBefore(r.hasta()))          // ya cumplio su bloqueo
                    || (r.hasta() == null && !ahora.isBefore(r.desde().plus(VENTANA))); // fallos viejos
            if (empiezaDeNuevo) {
                return new Registro(1, ahora, tope <= 1 ? ahora.plus(BLOQUEO) : null);
            }
            if (r.hasta() != null) {
                return r; // ya bloqueado: no se alarga el bloqueo
            }
            int fallos = r.fallos() + 1;
            return new Registro(fallos, r.desde(), fallos >= tope ? ahora.plus(BLOQUEO) : null);
        });
    }

    private static boolean bloqueado(Registro r, Instant ahora) {
        return r != null && r.hasta() != null && ahora.isBefore(r.hasta());
    }

    private static long segundos(Registro r, Instant ahora) {
        return Duration.between(ahora, r.hasta()).toSeconds();
    }

    private static String clave(String valor) {
        return valor == null ? "" : valor.trim().toLowerCase(Locale.ROOT);
    }

    private static String minutos(long segundos) {
        long m = Math.max(1, (segundos + 59) / 60);
        return m == 1 ? "1 minuto" : m + " minutos";
    }

    private static String mensajeCuenta(long segundos) {
        return "Demasiados intentos fallidos. Por seguridad, esta cuenta quedó bloqueada: vuelve a intentarlo en "
                + minutos(segundos) + " o pide al administrador que restablezca tu contraseña.";
    }

    private static String mensajeIp(long segundos) {
        return "Demasiados intentos fallidos desde esta conexión. Vuelve a intentarlo en " + minutos(segundos) + ".";
    }
}
