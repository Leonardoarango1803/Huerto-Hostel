package pe.edu.utp.huertohostel.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.LoginRequest;
import pe.edu.utp.huertohostel.dto.LoginResponse;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.exception.SitioIncorrectoException;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.CustomUserDetails;
import pe.edu.utp.huertohostel.security.JwtService;
import pe.edu.utp.huertohostel.security.ProteccionLoginService;
import pe.edu.utp.huertohostel.service.AuditoriaGestionService;
import pe.edu.utp.huertohostel.service.CuentaService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    /** Sitios desde los que se inicia sesion: cada uno acepta solo sus cuentas. */
    public static final String SITIO_ADMIN = "admin";
    public static final String SITIO_WEB = "web";

    private static final String CLAVE_INCORRECTA = "Usuario o contraseña incorrectos.";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CuentaService cuentaService;
    private final ProteccionLoginService proteccion;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaGestionService auditoria;
    private final pe.edu.utp.huertohostel.security.CaptchaService captcha;
    private final pe.edu.utp.huertohostel.service.LoginGoogleService loginGoogle;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                          CuentaService cuentaService, ProteccionLoginService proteccion,
                          UsuarioRepository usuarioRepository, AuditoriaGestionService auditoria,
                          pe.edu.utp.huertohostel.security.CaptchaService captcha,
                          pe.edu.utp.huertohostel.service.LoginGoogleService loginGoogle) {
        this.captcha = captcha;
        this.loginGoogle = loginGoogle;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.cuentaService = cuentaService;
        this.proteccion = proteccion;
        this.usuarioRepository = usuarioRepository;
        this.auditoria = auditoria;
    }

    /**
     * Inicia sesion. Con {@code sitio = "admin"} solo entra el personal; con {@code sitio = "web"}, solo huespedes.
     * Sin sitio entra cualquiera (version anterior del frontend): los permisos de cada rol siguen aplicando igual.
     * Intentos fallidos repetidos bloquean la cuenta y la conexion un rato (ver ProteccionLoginService).
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        String sitio = validarSitio(request.getSitio());
        String ip = ipCliente(http);
        String username = request.getUsername();
        proteccion.verificar(username, ip);
        // Captcha en todo inicio de sesion con contrasena (personal y huespedes, en el admin y en la web), antes de
        // revisar la clave. "Continuar con Google" no lo pide: Google ya filtra a los robots.
        captcha.exigir(request.getCaptcha(), ip);

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, request.getPassword()));
        } catch (BadCredentialsException e) {
            // Mismo mensaje si el usuario no existe, esta desactivado o la clave esta mal: no delata cuentas.
            proteccion.registrarFallo(username, ip, () -> dejarConstanciaDelBloqueo(username, ip));
            throw new BadCredentialsException(CLAVE_INCORRECTA);
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        proteccion.registrarExito(username);
        exigirSitio(sitio, userDetails.getRoleName());
        cuentaService.registrarAcceso(userDetails.getUsername());

        String token = jwtService.generateToken(
                userDetails.getUsername(),
                userDetails.getRoleName(),
                userDetails.getIdUsuario(),
                userDetails.getSello()
        );

        return ResponseEntity.ok(new LoginResponse(
                token,
                userDetails.getUsername(),
                userDetails.getRoleName(),
                userDetails.getIdUsuario(),
                userDetails.isDebeCambiarPassword()
        ));
    }

    /**
     * "Continuar con Google" (solo huespedes, solo en la web). Recibe el comprobante que Google dio al navegador y abre
     * sesion (misma respuesta que /login). La primera vez crea la cuenta; el documento se pide en su primera reserva.
     */
    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> loginConGoogle(@RequestBody Map<String, String> body) {
        String sitio = validarSitio(body.get("sitio"));
        if (SITIO_ADMIN.equals(sitio)) {
            throw new SitioIncorrectoException("El personal entra con su usuario y contraseña, no con Google.");
        }
        return ResponseEntity.ok(loginGoogle.entrar(body.get("credential")));
    }

    /** Que opciones de acceso tiene encendidas el servidor (para que la pantalla muestre o no el boton de Google). */
    @GetMapping("/opciones")
    public ResponseEntity<Map<String, Object>> opciones() {
        return ResponseEntity.ok(Map.of("google", loginGoogle.googleActivo(), "captcha", captcha.activo()));
    }

    /**
     * Cambia la clave de quien esta conectado y devuelve una sesion nueva (la anterior deja de valer). Es lo unico
     * que se puede hacer con una clave temporal. Los errores de la clave actual salen como 409, no 401: un 401 haria
     * que la pantalla cierre la sesion.
     */
    @PostMapping("/cambiar-password")
    public ResponseEntity<LoginResponse> cambiarPassword(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Usuario usuario = cuentaService.cambiarPasswordPropia(
                auth.getName(), body.get("passwordActual"), body.get("passwordNueva"));
        String rol = ((CustomUserDetails) auth.getPrincipal()).getRoleName();
        String token = jwtService.generateToken(usuario.getUsername(), rol, usuario.getIdUsuario(),
                CustomUserDetails.selloDe(usuario));
        return ResponseEntity.ok(new LoginResponse(token, usuario.getUsername(), rol, usuario.getIdUsuario(), false));
    }

    private static String validarSitio(String sitio) {
        if (sitio == null || sitio.isBlank()) {
            return null;
        }
        if (!SITIO_ADMIN.equals(sitio) && !SITIO_WEB.equals(sitio)) {
            throw new IllegalArgumentException("Sitio desconocido: " + sitio);
        }
        return sitio;
    }

    static void exigirSitio(String sitio, String rol) {
        boolean esHuesped = "CLIENTE".equals(rol);
        if (SITIO_ADMIN.equals(sitio) && esHuesped) {
            throw new SitioIncorrectoException(
                    "Esta es una cuenta de huésped: entra desde la web del hotel, en «Mi cuenta».");
        }
        if (SITIO_WEB.equals(sitio) && !esHuesped) {
            throw new SitioIncorrectoException(
                    "Las cuentas del personal entran por el portal administrativo, no por la web.");
        }
    }

    private void dejarConstanciaDelBloqueo(String username, String ip) {
        usuarioRepository.findByUsername(username).ifPresent(u -> auditoria.registrar(
                "LOGIN_BLOQUEADO", u.getEmpleado(),
                "Cuenta " + u.getUsername() + ": " + ProteccionLoginService.MAX_FALLOS_CUENTA
                        + " intentos fallidos seguidos desde " + ip + ", bloqueada "
                        + ProteccionLoginService.BLOQUEO.toMinutes() + " min"));
    }

    /**
     * IP de quien llama. Detras del proxy de Render llega en X-Forwarded-For (la primera es la del cliente). Se puede
     * falsificar, pero solo afecta al freno por conexion: el bloqueo por cuenta no depende de la IP.
     */
    static String ipCliente(HttpServletRequest http) {
        String reenviada = http.getHeader("X-Forwarded-For");
        if (reenviada != null && !reenviada.isBlank()) {
            return reenviada.split(",")[0].trim();
        }
        return http.getRemoteAddr();
    }
}
