package pe.edu.utp.huertohostel.security;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;

@Service
@Transactional(readOnly = true)
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UserDetailsServiceImpl(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Cacheable(value = "userDetails", key = "#username")
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado: " + username));

        if (!Boolean.TRUE.equals(usuario.getEstado())) {
            throw new UsernameNotFoundException("Usuario deshabilitado: " + username);
        }

        String roleName = resolveRole(usuario);
        return new CustomUserDetails(usuario, roleName);
    }

    private String resolveRole(Usuario usuario) {
        if (usuario.getEmpleado() != null
                && usuario.getEmpleado().getRol() != null) {
            return usuario.getEmpleado().getRol().getNombre();
        }
        return "CLIENTE";
    }
}
