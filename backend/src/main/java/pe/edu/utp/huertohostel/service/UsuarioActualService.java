package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.TipoUsuarioEnum;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;

/**
 * Resuelve el usuario autenticado y su empleado/cliente asociado.
 * Lo usan los modulos que necesitan registrar quien ejecuto la accion
 * (comandas, caja, inventario, limpieza, incidencias) y el portal del huesped.
 */
@Service
@Transactional(readOnly = true)
public class UsuarioActualService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioActualService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario obtenerUsuario() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new IllegalStateException("No hay un usuario autenticado en el contexto.");
        }
        return usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Usuario no encontrado: " + auth.getName()));
    }

    /** true si quien llama es personal del hotel (empleado); false si es un huesped (CLIENTE). */
    public boolean esPersonal() {
        return obtenerUsuario().getTipoUsuario() == TipoUsuarioEnum.EMPLEADO;
    }

    /** true si el usuario autenticado tiene ese rol (sin el prefijo ROLE_). */
    public boolean tieneRol(String rol) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> ("ROLE_" + rol).equals(a.getAuthority()));
    }

    /**
     * El empleado autenticado, o null si quien llama no lo es. Para registrar "quien lo hizo" donde su
     * ausencia no debe frenar la operacion (no lanza: una excepcion dentro de una transaccion ya
     * abierta la marcaria para rollback aunque se atrape).
     */
    public Empleado empleadoOpcional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return usuarioRepository.findByUsername(auth.getName()).map(Usuario::getEmpleado).orElse(null);
    }

    public Empleado obtenerEmpleado() {
        Usuario usuario = obtenerUsuario();
        Empleado empleado = usuario.getEmpleado();
        if (empleado == null) {
            throw new IllegalStateException(
                    "El usuario '" + usuario.getUsername() + "' no tiene un empleado asociado.");
        }
        return empleado;
    }

    public Cliente obtenerCliente() {
        Usuario usuario = obtenerUsuario();
        Cliente cliente = usuario.getCliente();
        if (cliente == null) {
            throw new IllegalStateException(
                    "El usuario '" + usuario.getUsername() + "' no tiene un cliente asociado.");
        }
        return cliente;
    }
}
