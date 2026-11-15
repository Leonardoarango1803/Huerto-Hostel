package pe.edu.utp.huertohostel.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.security.Jwk;
import io.jsonwebtoken.security.JwkSet;
import io.jsonwebtoken.security.Jwks;
import io.jsonwebtoken.security.PublicJwk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Valida el comprobante ("ID token") que Google entrega al navegador cuando el huesped elige "Continuar con Google".
 * Comprueba la firma con las claves publicas de Google, que el token sea para ESTA aplicacion (client id), que no haya
 * vencido y que Google ya haya verificado el correo. No se usa la clave de Google para nada mas: la sesion del sistema
 * sigue siendo nuestro propio JWT.
 */
@Service
public class GoogleIdTokenService {

    private static final Logger log = LoggerFactory.getLogger(GoogleIdTokenService.class);
    private static final String URL_CLAVES = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> EMISORES = Set.of("accounts.google.com", "https://accounts.google.com");
    private static final Duration VIGENCIA_CLAVES = Duration.ofHours(1);
    private static final Duration ESPERA_RECARGA = Duration.ofMinutes(1);

    /** Lo que el sistema usa de la cuenta de Google. */
    public record DatosGoogle(String sub, String correo, String nombres, String apellidos) {
    }

    private final String clientId;
    private final Function<String, Key> clavePorId;

    // Cache de las claves publicas de Google (rotan cada pocos dias).
    private final Map<String, Key> claves = new HashMap<>();
    private Instant clavesCargadas = Instant.EPOCH;

    @Autowired
    public GoogleIdTokenService(@Value("${app.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.clavePorId = this::claveDeGoogle;
    }

    /** Para pruebas: claves propias en lugar de las de Google. */
    public GoogleIdTokenService(String clientId, Function<String, Key> clavePorId) {
        this.clientId = clientId;
        this.clavePorId = clavePorId;
    }

    /** Si el inicio con Google esta configurado (hay client id). */
    public boolean activo() {
        return !clientId.isEmpty();
    }

    public DatosGoogle verificar(String credencial) {
        if (!activo()) {
            throw new IllegalStateException("El inicio de sesión con Google no está configurado en este servidor.");
        }
        if (credencial == null || credencial.isBlank()) {
            throw new BadCredentialsException("Falta el comprobante de Google.");
        }
        Claims c;
        try {
            c = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        @Override
                        protected Key locate(JwsHeader header) {
                            Key k = clavePorId.apply(header.getKeyId());
                            if (k == null) {
                                throw new BadCredentialsException("Firma de Google desconocida.");
                            }
                            return k;
                        }
                    })
                    .clockSkewSeconds(60)
                    .build()
                    .parseSignedClaims(credencial.trim())
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new BadCredentialsException("No se pudo validar tu cuenta de Google. Intenta de nuevo.");
        }
        if (!EMISORES.contains(c.getIssuer())) {
            throw new BadCredentialsException("El comprobante no viene de Google.");
        }
        Collection<String> audiencia = c.getAudience();
        if (audiencia == null || !audiencia.contains(clientId)) {
            throw new BadCredentialsException("El comprobante de Google es para otra aplicación.");
        }
        Object verificado = c.get("email_verified");
        String correo = c.get("email", String.class);
        if (correo == null || correo.isBlank() || !(Boolean.TRUE.equals(verificado) || "true".equals(String.valueOf(verificado)))) {
            throw new BadCredentialsException("Tu cuenta de Google no tiene un correo verificado.");
        }
        String nombres = c.get("given_name", String.class);
        String apellidos = c.get("family_name", String.class);
        if (nombres == null && apellidos == null) {
            nombres = c.get("name", String.class);
        }
        return new DatosGoogle(c.getSubject(), correo.trim().toLowerCase(Locale.ROOT), nombres, apellidos);
    }

    /** Clave publica de Google por su id; si no esta (Google roto sus claves) se recargan, como mucho una vez por minuto. */
    private synchronized Key claveDeGoogle(String kid) {
        Instant ahora = Instant.now();
        boolean vencidas = ahora.isAfter(clavesCargadas.plus(VIGENCIA_CLAVES));
        boolean desconocida = kid != null && !claves.containsKey(kid) && ahora.isAfter(clavesCargadas.plus(ESPERA_RECARGA));
        if (vencidas || desconocida) {
            try {
                String json = RestClient.create().get().uri(URL_CLAVES).retrieve().body(String.class);
                JwkSet conjunto = Jwks.setParser().build().parse(json);
                Map<String, Key> nuevas = new HashMap<>();
                for (Jwk<?> jwk : conjunto.getKeys()) {
                    if (jwk instanceof PublicJwk<?> publica && jwk.getId() != null) {
                        nuevas.put(jwk.getId(), publica.toKey());
                    }
                }
                claves.clear();
                claves.putAll(nuevas);
                clavesCargadas = ahora;
            } catch (RuntimeException e) {
                log.warn("No se pudieron descargar las claves de Google: {}", e.getMessage());
            }
        }
        return kid == null ? null : claves.get(kid);
    }
}
