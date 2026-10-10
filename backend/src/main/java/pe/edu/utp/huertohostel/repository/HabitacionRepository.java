package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;

import java.util.List;
import java.util.Optional;

public interface HabitacionRepository extends JpaRepository<Habitacion, Integer> {
    Optional<Habitacion> findByNumero(String numero);
    boolean existsByNumero(String numero);
    List<Habitacion> findByEstadoOperativo(EstadoOperativoHab estadoOperativo);
    long countByEstadoOperativo(EstadoOperativoHab estadoOperativo);
}
