package pe.edu.utp.huertohostel.security;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import pe.edu.utp.huertohostel.exception.CaptchaInvalidoException;

/**
 * Verificacion anti-robots del login del personal con Cloudflare Turnstile. La pantalla obtiene un token del widget y el
 * servidor lo confirma con Cloudflare usando la clave secreta ({@code app.turnstile.secret}). Sin clave secreta queda
 * apagado (para trabajar en local sin internet).
 *
 * <p>Si Cloudflare no responde, se deja pasar (y se registra un aviso): el bloqueo por intentos fallidos sigue
 * protegiendo el acceso y la recepcion no queda sin poder entrar por una caida ajena.
 */
@Service
public class CaptchaService {

    private static final Logger log = LoggerFactory.getLogger(CaptchaService.class);
    private static final String URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final String secreto;
    private final RestClient http;

    public CaptchaService(@Value("${app.turnstile.secret:}") String secreto) {
        this.secreto = secreto == null ? "" : secreto.trim();
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5000);
        f.setReadTimeout(5000);
        this.http = RestClient.builder().requestFactory(f).build();
    }

    public boolean activo() {
        return !secreto.isEmpty();
    }

    /** Lanza CaptchaInvalidoException si el token falta o Cloudflare lo rechaza. */
    public void exigir(String token, String ip) {
        if (!activo()) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new CaptchaInvalidoException("Completa la verificación de seguridad antes de ingresar.");
        }
        JsonNode r;
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secreto);
            form.add("response", token.trim());
            if (ip != null && !ip.isBlank()) {
                form.add("remoteip", ip);
            }
            r = http.post().uri(URL).contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().body(JsonNode.class);
        } catch (RuntimeException e) {
            log.warn("Turnstile no respondio ({}); se deja pasar el login, el bloqueo por intentos sigue activo.", e.getMessage());
            return;
        }
        if (r == null || !r.path("success").asBoolean(false)) {
            throw new CaptchaInvalidoException("La verificación de seguridad venció o no es válida. Vuelve a marcarla.");
        }
    }
}
