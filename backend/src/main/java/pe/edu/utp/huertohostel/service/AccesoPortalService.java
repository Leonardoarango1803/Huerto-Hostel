package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.CacheManager;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.AccesoPortalResponse;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.TipoUsuarioEnum;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

/**
 * Alta y mantenimiento del acceso de un huesped al Portal (RF32).
 * Crea un `usuario` de tipo CLIENTE ligado a su `cliente`; el rol CLIENTE lo
 * deduce UserDetailsServiceImpl al no haber empleado asociado.
 */
@Service
@Transactional(readOnly = true)
public class AccesoPortalService {

    /** Sin caracteres ambiguos (0/O, 1/l/I) para poder dictarla en recepcion. */
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int LARGO_TEMPORAL = 10;
    private static final int MIN_PASSWORD = 8;

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final CacheManager cacheManager;
    private final SecureRandom random = new SecureRandom();

    public AccesoPortalService(UsuarioRepository usuarioRepository,
                               ClienteRepository clienteRepository,
                               PasswordEncoder passwordEncoder,
                               CacheManager cacheManager) {
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.passwordEncoder = passwordEncoder;
        this.cacheManager = cacheManager;
    }

    public AccesoPortalResponse consultar(@NonNull Integer idCliente) {
        return usuarioRepository.findByClienteIdCliente(idCliente)
                .map(u -> AccesoPortalResponse.de(u.getUsername(), u.getEstado(), null))
                .orElseGet(AccesoPortalResponse::sinAcceso);
    }

    @Transactional
    public AccesoPortalResponse crear(@NonNull Integer idCliente, String username, String password) {
        Cliente cliente = clienteRepository.findById(idCliente)
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado con id: " + idCliente));

        if (usuarioRepository.findByClienteIdCliente(idCliente).isPresent()) {
            throw new IllegalStateException("Este huesped ya tiene un acceso al portal.");
        }

        String user = (username == null || username.isBlank())
                ? sugerirUsername(cliente)
                : username.trim().toLowerCase(Locale.ROOT);

        if (usuarioRepository.existsByUsername(user)) {
            throw new IllegalStateException("El usuario '" + user + "' ya esta en uso.");
        }

        boolean generada = password == null || password.isBlank();
        String plano = generada ? generarPassword() : password;
        if (!generada && plano.length() < MIN_PASSWORD) {
            throw new IllegalStateException(
                    "La contrasena debe tener al menos " + MIN_PASSWORD + " caracteres.");
        }

        Usuario usuario = new Usuario();
        usuario.setCliente(cliente);
        usuario.setEmpleado(null); // lo exige el CHECK chk_usuario_tipo
        usuario.setUsername(user);
        usuario.setPasswordHash(passwordEncoder.encode(plano));
        usuario.setTipoUsuario(TipoUsuarioEnum.CLIENTE);
        usuario.setEstado(true);
        usuario.setFechaCreacion(LocalDateTime.now());
        usuarioRepository.save(usuario);

        // Solo devolvemos la clave si la generamos nosotros.
        return AccesoPortalResponse.de(user, true, generada ? plano : null);
    }

    @Transactional
    public AccesoPortalResponse cambiarEstado(@NonNull Integer idCliente, boolean activo) {
        Usuario usuario = buscarAcceso(idCliente);
        usuario.setEstado(activo);
        usuarioRepository.save(usuario);
        invalidarCache(usuario.getUsername());
        return AccesoPortalResponse.de(usuario.getUsername(), activo, null);
    }

    @Transactional
    public AccesoPortalResponse restablecerPassword(@NonNull Integer idCliente, String password) {
        Usuario usuario = buscarAcceso(idCliente);

        boolean generada = password == null || password.isBlank();
        String plano = generada ? generarPassword() : password;
        if (!generada && plano.length() < MIN_PASSWORD) {
            throw new IllegalStateException(
                    "La contrasena debe tener al menos " + MIN_PASSWORD + " caracteres.");
        }

        usuario.setPasswordHash(passwordEncoder.encode(plano));
        usuarioRepository.save(usuario);
        invalidarCache(usuario.getUsername());

        return AccesoPortalResponse.de(usuario.getUsername(), usuario.getEstado(),
                generada ? plano : null);
    }

    private Usuario buscarAcceso(Integer idCliente) {
        return usuarioRepository.findByClienteIdCliente(idCliente)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Este huesped no tiene acceso al portal."));
    }

    /**
     * UserDetailsServiceImpl cachea por username; sin esto, una cuenta
     * deshabilitada o con clave nueva seguiria validando con los datos viejos.
     */
    private void invalidarCache(String username) {
        Optional.ofNullable(cacheManager.getCache("userDetails"))
                .ifPresent(c -> c.evict(username));
    }

    /** Propone algo como "jperez.41885213" a partir del nombre y el documento. */
    private String sugerirUsername(Cliente cliente) {
        String inicial = limpiar(cliente.getNombres());
        String apellido = limpiar(cliente.getApellidos());
        String doc = cliente.getNumeroDocumento() == null ? "" : cliente.getNumeroDocumento();

        String base = (inicial.isEmpty() ? "" : inicial.substring(0, 1)) + apellido;
        if (base.isBlank()) base = "huesped";

        String candidato = base + "." + doc;
        int n = 1;
        while (usuarioRepository.existsByUsername(candidato)) {
            candidato = base + "." + doc + n++;
        }
        return candidato;
    }

    private String limpiar(String texto) {
        if (texto == null) return "";
        String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private String generarPassword() {
        StringBuilder sb = new StringBuilder(LARGO_TEMPORAL);
        for (int i = 0; i < LARGO_TEMPORAL; i++) {
            sb.append(ALFABETO.charAt(random.nextInt(ALFABETO.length())));
        }
        return sb.toString();
    }
}
