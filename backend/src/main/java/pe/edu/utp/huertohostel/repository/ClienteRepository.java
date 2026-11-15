package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.Cliente;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Integer> {
    Optional<Cliente> findByNumeroDocumento(String numeroDocumento);
    boolean existsByNumeroDocumento(String numeroDocumento);
    /** El correo del cliente es UNIQUE en la base. */
    boolean existsByCorreoIgnoreCase(String correo);

    Optional<Cliente> findFirstByCorreoIgnoreCase(String correo);
}
