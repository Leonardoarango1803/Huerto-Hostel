package pe.edu.utp.huertohostel.security;

import org.junit.jupiter.api.Test;
import pe.edu.utp.huertohostel.exception.AccesoBloqueadoException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Bloqueo por intentos fallidos: por cuenta, por conexion, ventana de tiempo y desbloqueo. */
class ProteccionLoginServiceTest {

    /** Reloj que se puede adelantar a mano. */
    static final class RelojManual extends Clock {
        private Instant ahora = Instant.parse("2026-11-13T15:00:00Z");

        void avanzar(Duration d) {
            ahora = ahora.plus(d);
        }

        @Override public ZoneId getZone() { return ZoneId.of("America/Lima"); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    private final RelojManual reloj = new RelojManual();
    private final ProteccionLoginService proteccion = new ProteccionLoginService(reloj);

    private void fallar(String usuario, String ip, int veces) {
        for (int i = 0; i < veces; i++) {
            proteccion.registrarFallo(usuario, ip, null);
        }
    }

    @Test
    void cuatroFallosNoBloquean() {
        fallar("ana", "1.1.1.1", 4);
        assertDoesNotThrow(() -> proteccion.verificar("ana", "1.1.1.1"));
        assertTrue(proteccion.bloqueadaHasta("ana").isEmpty());
    }

    @Test
    void elQuintoFalloBloqueaLaCuentaYAvisaUnaVez() {
        fallar("ana", "1.1.1.1", 4);
        AtomicInteger avisos = new AtomicInteger();
        AccesoBloqueadoException e = assertThrows(AccesoBloqueadoException.class,
                () -> proteccion.registrarFallo("ana", "1.1.1.1", avisos::incrementAndGet));
        assertEquals(1, avisos.get());
        assertEquals(15 * 60, e.getSegundosRestantes());
        assertTrue(e.getMessage().contains("15 minutos"));

        // Ya bloqueada: aunque escriba la clave correcta no pasa, y otro fallo no vuelve a avisar ni alarga el bloqueo.
        assertThrows(AccesoBloqueadoException.class, () -> proteccion.verificar("ana", "2.2.2.2"));
        reloj.avanzar(Duration.ofMinutes(5));
        AccesoBloqueadoException otra = assertThrows(AccesoBloqueadoException.class,
                () -> proteccion.registrarFallo("ana", "1.1.1.1", avisos::incrementAndGet));
        assertEquals(1, avisos.get());
        assertEquals(10 * 60, otra.getSegundosRestantes());
        assertTrue(proteccion.bloqueadaHasta("ana").isPresent());
    }

    @Test
    void elBloqueoSeLevantaSoloA15Minutos() {
        assertThrows(AccesoBloqueadoException.class, () -> fallar("ana", "1.1.1.1", 5));
        reloj.avanzar(Duration.ofMinutes(15));
        assertDoesNotThrow(() -> proteccion.verificar("ana", "1.1.1.1"));
        assertTrue(proteccion.bloqueadaHasta("ana").isEmpty());
        // Empieza de cero: un fallo mas no la vuelve a bloquear.
        assertDoesNotThrow(() -> proteccion.registrarFallo("ana", "1.1.1.1", null));
    }

    @Test
    void losFallosViejosNoSeAcumulan() {
        fallar("ana", "1.1.1.1", 4);
        reloj.avanzar(Duration.ofMinutes(16));
        fallar("ana", "1.1.1.1", 4);
        assertDoesNotThrow(() -> proteccion.verificar("ana", "1.1.1.1"));
    }

    @Test
    void unIngresoCorrectoBorraLosFallosDeLaCuenta() {
        fallar("ana", "1.1.1.1", 4);
        proteccion.registrarExito("ana");
        fallar("ana", "1.1.1.1", 4);
        assertDoesNotThrow(() -> proteccion.verificar("ana", "1.1.1.1"));
    }

    @Test
    void elUsuarioNoDistingueMayusculasNiEspacios() {
        fallar("Ana", "1.1.1.1", 2);
        fallar(" ana ", "1.1.1.1", 2);
        assertThrows(AccesoBloqueadoException.class, () -> proteccion.registrarFallo("ANA", "1.1.1.1", null));
    }

    @Test
    void desbloquearPermiteEntrarDeInmediato() {
        assertThrows(AccesoBloqueadoException.class, () -> fallar("ana", "1.1.1.1", 5));
        proteccion.desbloquear("ana");
        assertDoesNotThrow(() -> proteccion.verificar("ana", "1.1.1.1"));
    }

    @Test
    void muchosUsuariosDesdeLaMismaConexionBloqueanLaIp() {
        // 30 usuarios distintos, una clave cada uno: ninguna cuenta llega a 5, pero la conexion si llega a 30.
        for (int i = 1; i < ProteccionLoginService.MAX_FALLOS_IP; i++) {
            proteccion.registrarFallo("usuario" + i, "9.9.9.9", null);
        }
        AccesoBloqueadoException e = assertThrows(AccesoBloqueadoException.class,
                () -> proteccion.registrarFallo("usuario30", "9.9.9.9", null));
        assertTrue(e.getMessage().contains("conexión"));
        assertThrows(AccesoBloqueadoException.class, () -> proteccion.verificar("otro", "9.9.9.9"));
        // Desde otra conexion esas cuentas siguen pudiendo entrar.
        assertDoesNotThrow(() -> proteccion.verificar("usuario1", "8.8.8.8"));
        assertFalse(proteccion.bloqueadaHasta("usuario1").isPresent());
    }
}
