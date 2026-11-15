package pe.edu.utp.huertohostel.service;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.TipoUsuarioEnum;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.exception.SitioIncorrectoException;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.CustomUserDetails;
import pe.edu.utp.huertohostel.security.GoogleIdTokenService;
import pe.edu.utp.huertohostel.security.GoogleIdTokenService.DatosGoogle;
import pe.edu.utp.huertohostel.security.JwtService;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * "Continuar con Google" para huespedes. Busca la cuenta del portal por (1) la cuenta de Google ya ligada, (2) el correo
 * como usuario, (3) la ficha del cliente con ese correo; si la encuentra, la liga a Google. Si no hay nada, crea la
 * cuenta en el acto con el nombre y el correo de Google: el documento del titular se pide en su primera reserva.
 * Siempre termina con la sesion abierta (el JWT de siempre).
 *
 * <p>El personal nunca entra con Google: sus cuentas son internas y llevan su propio control (captcha, bloqueo).
 */
@Service
@Transactional(readOnly = true)
public class LoginGoogleService {

    private final GoogleIdTokenService google;
    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final AccesoPortalService accesoPortalService;
    private final CuentaService cuentaService;
    private final JwtService jwtService;

    public LoginGoogleService(GoogleIdTokenService google, UsuarioRepository usuarioRepository,
                              ClienteRepository clienteRepository, AccesoPortalService accesoPortalService,
                              CuentaService cuentaService, JwtService jwtService) {
        this.google = google;
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.accesoPortalService = accesoPortalService;
        this.cuentaService = cuentaService;
        this.jwtService = jwtService;
    }

    public boolean googleActivo() {
        return google.activo();
    }

    /** Entra con Google; si es la primera vez, crea la cuenta (sin documento todavia). Devuelve la sesion. */
    @Transactional
    public Map<String, Object> entrar(String credencial) {
        DatosGoogle d = google.verificar(credencial);
        Usuario usuario = buscarYLigar(d).orElseGet(() -> crearCuenta(d));
        return sesion(usuario);
    }

    /** Ficha del huesped con lo que da Google (sin documento) y su cuenta del portal ligada a Google. */
    private Usuario crearCuenta(DatosGoogle d) {
        Cliente cliente = new Cliente();
        cliente.setNombres(recortar(textoONulo(d.nombres()) != null ? d.nombres() : d.correo().split("@")[0], 100));
        cliente.setApellidos(recortar(textoONulo(d.apellidos()) != null ? d.apellidos() : "", 100));
        cliente.setCorreo(d.correo());
        cliente.setEstado(true);
        cliente.setFechaRegistro(LocalDateTime.now());
        cliente.setOrigen(Cliente.ORIGEN_GOOGLE);
        cliente = clienteRepository.save(cliente);
        return accesoPortalService.crearConGoogle(cliente.getIdCliente(), d.correo(), d.sub());
    }

    /** Abre la sesion del huesped (misma respuesta que /login). */
    private Map<String, Object> sesion(Usuario usuario) {
        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new BadCredentialsException("Tu cuenta del portal está desactivada. Consulta en recepción.");
        }
        Map<String, Object> r = new LinkedHashMap<>();
        cuentaService.registrarAcceso(usuario.getUsername());
        r.put("token", jwtService.generateToken(usuario.getUsername(), "CLIENTE", usuario.getIdUsuario(),
                CustomUserDetails.selloDe(usuario)));
        r.put("username", usuario.getUsername());
        r.put("role", "CLIENTE");
        r.put("userId", usuario.getIdUsuario());
        r.put("debeCambiarPassword", false);
        return r;
    }

    /** La cuenta de huesped de esa persona de Google, ligandola si hace falta; vacio si todavia no tiene cuenta. */
    @Transactional
    public Optional<Usuario> buscarYLigar(DatosGoogle d) {
        Optional<Usuario> ligada = usuarioRepository.findByGoogleSub(d.sub());
        if (ligada.isPresent()) {
            return ligada.map(this::soloHuesped);
        }
        Usuario porCorreo = usuarioRepository.findByUsername(d.correo()).orElse(null);
        if (porCorreo == null) {
            Cliente cliente = clienteRepository.findFirstByCorreoIgnoreCase(d.correo()).orElse(null);
            if (cliente == null) {
                return Optional.empty();
            }
            porCorreo = usuarioRepository.findByClienteIdCliente(cliente.getIdCliente()).orElse(null);
            if (porCorreo == null) {
                // Ficha de recepcion con ese correo y sin cuenta: Google confirma que el correo es suyo.
                return Optional.of(accesoPortalService.crearConGoogle(cliente.getIdCliente(), d.correo(), d.sub()));
            }
        }
        soloHuesped(porCorreo);
        if (porCorreo.getGoogleSub() != null && !porCorreo.getGoogleSub().equals(d.sub())) {
            throw new BadCredentialsException("Tu cuenta ya está ligada a otra cuenta de Google. Entra con esa o con tu contraseña.");
        }
        porCorreo.setGoogleSub(d.sub());
        return Optional.of(usuarioRepository.save(porCorreo));
    }

    private Usuario soloHuesped(Usuario u) {
        if (u.getTipoUsuario() != TipoUsuarioEnum.CLIENTE) {
            throw new SitioIncorrectoException(
                    "Las cuentas del personal no entran con Google: usa tu usuario y contraseña en el portal administrativo.");
        }
        return u;
    }

    private static String textoONulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String recortar(String s, int max) {
        String t = s == null ? "" : s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
