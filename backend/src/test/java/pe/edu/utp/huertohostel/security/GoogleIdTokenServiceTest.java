package pe.edu.utp.huertohostel.security;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Date;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** El comprobante de Google se acepta solo si lo firmo Google, es para esta app, no vencio y el correo esta verificado. */
class GoogleIdTokenServiceTest {

    private static final String APP = "123-abc.apps.googleusercontent.com";
    private final KeyPair google = par();
    private final KeyPair intruso = par();
    private final GoogleIdTokenService servicio = new GoogleIdTokenService(APP, kid -> "k1".equals(kid) ? google.getPublic() : null);

    private static KeyPair par() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
            g.initialize(2048);
            return g.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String token(KeyPair firma, String kid, String emisor, String app, Object verificado, long venceEnSeg) {
        return Jwts.builder().header().keyId(kid).and()
                .issuer(emisor).audience().add(app).and().subject("google-42")
                .claims(Map.of("email", "Ana@Gmail.com", "email_verified", verificado, "given_name", "Ana", "family_name", "Rojas"))
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + venceEnSeg * 1000))
                .signWith(firma.getPrivate()).compact();
    }

    @Test
    void unComprobanteValidoDevuelveLosDatosConElCorreoEnMinusculas() {
        GoogleIdTokenService.DatosGoogle d = servicio.verificar(token(google, "k1", "https://accounts.google.com", APP, true, 600));
        assertEquals("google-42", d.sub());
        assertEquals("ana@gmail.com", d.correo());
        assertEquals("Ana", d.nombres());
        assertEquals("Rojas", d.apellidos());
    }

    @Test
    void aceptaElEmisorSinHttpsYElVerificadoComoTexto() {
        assertEquals("ana@gmail.com", servicio.verificar(token(google, "k1", "accounts.google.com", APP, "true", 600)).correo());
    }

    @Test
    void rechazaFirmaAjenaOClaveDesconocida() {
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(token(intruso, "k1", "accounts.google.com", APP, true, 600)));
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(token(google, "k9", "accounts.google.com", APP, true, 600)));
    }

    @Test
    void rechazaOtraAppOtroEmisorCorreoSinVerificarYVencido() {
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(token(google, "k1", "accounts.google.com", "otra-app", true, 600)));
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(token(google, "k1", "https://evil.example", APP, true, 600)));
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(token(google, "k1", "accounts.google.com", APP, false, 600)));
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(token(google, "k1", "accounts.google.com", APP, true, -3600)));
    }

    @Test
    void rechazaBasuraYVacio() {
        assertThrows(BadCredentialsException.class, () -> servicio.verificar("no-es-un-token"));
        assertThrows(BadCredentialsException.class, () -> servicio.verificar(" "));
    }

    @Test
    void sinClientIdEstaApagado() {
        GoogleIdTokenService apagado = new GoogleIdTokenService("", kid -> null);
        assertFalse(apagado.activo());
        assertThrows(IllegalStateException.class, () -> apagado.verificar("x"));
    }
}
