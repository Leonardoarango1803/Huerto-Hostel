package pe.edu.utp.huertohostel.exception;

/** El login del personal no paso la verificacion anti-robots (Cloudflare Turnstile): 400 con codigo CAPTCHA_INVALIDO. */
public class CaptchaInvalidoException extends RuntimeException {

    public CaptchaInvalidoException(String mensaje) {
        super(mensaje);
    }
}
