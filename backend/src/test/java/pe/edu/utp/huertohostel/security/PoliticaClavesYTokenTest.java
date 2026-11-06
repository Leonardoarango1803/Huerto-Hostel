package pe.edu.utp.huertohostel.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Rol;
import pe.edu.utp.huertohostel.entity.Usuario;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Reglas de las contrasenas del personal y sello de la clave dentro del token (invalida sesiones al cambiarla). */
class PoliticaClavesYTokenTest {

    private static final String SECRETO = "una-clave-secreta-de-pruebas-con-mas-de-32-bytes!";

    // ------------------------------------------------------------------ politica de claves

    @Test
    void laClaveTemporalGeneradaCumpleSuPropiaPolitica() {
        for (int i = 0; i < 200; i++) {
            String clave = PoliticaClaves.generar();
            assertEquals(10, clave.length());
            assertDoesNotThrow(() -> PoliticaClaves.validar(clave, "usuario"), clave);
            assertTrue(clave.chars().noneMatch(c -> "0O1lI".indexOf(c) >= 0), "sin caracteres ambiguos: " + clave);
        }
    }

    @Test
    void rechazaClavesCortasSinNumeroSinLetraOIgualesAlUsuario() {
        assertThrows(IllegalStateException.class, () -> PoliticaClaves.validar("abc123", "u"));
        assertThrows(IllegalStateException.class, () -> PoliticaClaves.validar(null, "u"));
        assertThrows(IllegalStateException.class, () -> PoliticaClaves.validar("sololetrasaqui", "u"));
        assertThrows(IllegalStateException.class, () -> PoliticaClaves.validar("1234567890", "u"));
        assertThrows(IllegalStateException.class, () -> PoliticaClaves.validar("kflores1234", "KFLORES1234"));
        assertThrows(IllegalStateException.class, () -> PoliticaClaves.validar("a1".repeat(40), "u"));
        assertDoesNotThrow(() -> PoliticaClaves.validar("Hostel2026", "kflores"));
    }

    // ------------------------------------------------------------------ token con sello

    private UserDetails detalles(Usuario u) {
        return new CustomUserDetails(u, "RECEPCIONISTA");
    }

    private Usuario usuario(LocalDateTime clave) {
        Usuario u = new Usuario();
        u.setIdUsuario(7);
        u.setUsername("maria");
        u.setPasswordHash("hash");
        u.setEstado(true);
        u.setPasswordActualizada(clave);
        Empleado e = new Empleado();
        Rol r = new Rol();
        r.setNombre("RECEPCIONISTA");
        e.setRol(r);
        u.setEmpleado(e);
        return u;
    }

    @Test
    void elTokenLlevaElSelloDeLaUltimaClaveYSeLee() {
        JwtService jwt = new JwtService(SECRETO, 3_600_000L);
        Usuario u = usuario(LocalDateTime.of(2026, 11, 5, 10, 0));
        long sello = CustomUserDetails.selloDe(u);
        assertTrue(sello > 0);

        String token = jwt.generateToken("maria", "RECEPCIONISTA", 7, sello);

        assertEquals(sello, jwt.extractSello(token));
        assertEquals(sello, ((CustomUserDetails) detalles(u)).getSello());
    }

    @Test
    void sinClaveCambiadaElSelloEsCeroYLosTokensViejosSinSelloSiguenValiendo() {
        JwtService jwt = new JwtService(SECRETO, 3_600_000L);
        Usuario u = usuario(null);

        assertEquals(0L, CustomUserDetails.selloDe(u));
        // Token emitido antes de existir el sello (sin claim): se lee como 0 y coincide
        assertEquals(0L, jwt.extractSello(jwt.generateToken("maria", "RECEPCIONISTA", 7)));
    }

    @Test
    void cambiarLaClaveCambiaElSelloYElTokenAnteriorYaNoCoincide() {
        JwtService jwt = new JwtService(SECRETO, 3_600_000L);
        Usuario u = usuario(null);
        String tokenViejo = jwt.generateToken("maria", "RECEPCIONISTA", 7, CustomUserDetails.selloDe(u));

        u.setPasswordActualizada(LocalDateTime.of(2026, 11, 6, 9, 30)); // el administrador restablecio la clave

        assertNotEquals(((CustomUserDetails) detalles(u)).getSello(), jwt.extractSello(tokenViejo));
    }

    @Test
    void laBanderaDeCambioObligatorioViajaEnLosDetalles() {
        Usuario u = usuario(null);
        assertEquals(false, ((CustomUserDetails) detalles(u)).isDebeCambiarPassword());
        u.setDebeCambiarPassword(true);
        assertEquals(true, ((CustomUserDetails) detalles(u)).isDebeCambiarPassword());
    }
}
