package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.Usuario;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByUsername(String username);
    boolean existsByUsername(String username);

    /** Cuenta de ingreso de un empleado (puede no tener). */
    Optional<Usuario> findByEmpleadoIdEmpleado(Integer idEmpleado);

    /** Acceso al portal de un huesped (usuario de tipo CLIENTE). */
    Optional<Usuario> findByClienteIdCliente(Integer idCliente);
}
