package pe.edu.utp.huertohostel.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.ReservaWebRequest;
import pe.edu.utp.huertohostel.service.ReservaWebService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Web publica de El Huerto: sin sesion. Solo expone lo que un visitante necesita para reservar
 * (tipos, precios y cuantas habitaciones quedan libres); nunca datos de otros huespedes ni numeros
 * de habitacion antes de reservar. Abierto en SecurityConfig (/api/v1/publico/**).
 */
@RestController
@RequestMapping("/api/v1/publico")
public class PublicoController {

    private final ReservaWebService reservaWebService;
    private final pe.edu.utp.huertohostel.security.CaptchaService captcha;
    private final pe.edu.utp.huertohostel.repository.UsuarioRepository usuarioRepository;
    private final pe.edu.utp.huertohostel.security.JwtService jwtService;

    public PublicoController(ReservaWebService reservaWebService, pe.edu.utp.huertohostel.security.CaptchaService captcha,
                             pe.edu.utp.huertohostel.repository.UsuarioRepository usuarioRepository,
                             pe.edu.utp.huertohostel.security.JwtService jwtService) {
        this.reservaWebService = reservaWebService;
        this.captcha = captcha;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    @GetMapping("/tipos-habitacion")
    public ResponseEntity<List<Map<String, Object>>> tipos() {
        return ResponseEntity.ok(reservaWebService.tiposPublicos());
    }

    @GetMapping("/disponibilidad")
    public ResponseEntity<Map<String, Object>> disponibilidad(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate llegada,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate salida,
            @RequestParam(required = false) Integer huespedes) {
        return ResponseEntity.ok(reservaWebService.disponibilidad(llegada, salida, huespedes));
    }

    /**
     * Crea la cuenta del huesped, la reserva y cobra el adelanto en un solo paso (todo o nada). Es lo unico que se escribe
     * sin sesion, asi que pide el captcha (si esta configurado): sin el, un robot podria llenar el hotel de reservas.
     */
    @PostMapping("/reservas")
    public ResponseEntity<Map<String, Object>> reservar(@RequestBody ReservaWebRequest req,
                                                        jakarta.servlet.http.HttpServletRequest http) {
        captcha.exigir(req.getCaptcha(), http.getRemoteAddr());
        Map<String, Object> r = new java.util.LinkedHashMap<>(reservaWebService.reservarComoNuevo(req));
        // La cuenta recien creada entra sola: el captcha ya se verifico en esta misma peticion (el login aparte pediria
        // otro, y el token es de un solo uso).
        usuarioRepository.findByUsername(String.valueOf(r.get("usuario"))).ifPresent(u -> {
            Map<String, Object> sesion = new java.util.LinkedHashMap<>();
            sesion.put("token", jwtService.generateToken(u.getUsername(), "CLIENTE", u.getIdUsuario(),
                    pe.edu.utp.huertohostel.security.CustomUserDetails.selloDe(u)));
            sesion.put("username", u.getUsername());
            sesion.put("role", "CLIENTE");
            sesion.put("userId", u.getIdUsuario());
            sesion.put("debeCambiarPassword", false);
            r.put("sesion", sesion);
        });
        return ResponseEntity.status(HttpStatus.CREATED).body(r);
    }
}
