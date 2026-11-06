package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.PoliticaClaves;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Lo que cada persona hace con SU cuenta: registrar el ingreso y cambiar su propia contrasena. Cambiarla (o que
 * el administrador la restablezca) invalida las sesiones abiertas: el token lleva la fecha de la ultima clave.
 */
@Service
@Transactional(readOnly = true)
public class CuentaService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final CacheManager cacheManager;

    public CuentaService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
                         CacheManager cacheManager) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.cacheManager = cacheManager;
    }

    @Transactional
    public void registrarAcceso(String username) {
        usuarioRepository.findByUsername(username).ifPresent(u -> {
            u.setUltimoAcceso(LocalDateTime.now());
            usuarioRepository.save(u);
        });
    }

    /** Cambia la clave propia. Pide la actual (si alguien deja la sesion abierta no puede cambiarla sin saberla). */
    @Transactional
    public Usuario cambiarPasswordPropia(String username, String actual, String nueva) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado: " + username));
        if (actual == null || !passwordEncoder.matches(actual, usuario.getPasswordHash())) {
            throw new IllegalStateException("La contrasena actual no es correcta.");
        }
        PoliticaClaves.validar(nueva, usuario.getUsername());
        if (passwordEncoder.matches(nueva, usuario.getPasswordHash())) {
            throw new IllegalStateException("La contrasena nueva debe ser distinta de la actual.");
        }
        usuario.setPasswordHash(passwordEncoder.encode(nueva));
        usuario.setDebeCambiarPassword(false);
        usuario.setPasswordActualizada(LocalDateTime.now());
        Usuario guardado = usuarioRepository.save(usuario);
        invalidarCache(username);
        return guardado;
    }

    /** UserDetailsServiceImpl cachea por username: sin esto la clave o el estado viejos seguirian valiendo. */
    public void invalidarCache(String username) {
        Optional.ofNullable(cacheManager.getCache("userDetails")).ifPresent(c -> c.evict(username));
    }
}
