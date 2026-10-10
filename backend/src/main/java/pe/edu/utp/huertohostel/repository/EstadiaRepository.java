package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;

import java.util.List;
import java.util.Optional;

public interface EstadiaRepository extends JpaRepository<Estadia, Integer> {
    Optional<Estadia> findByReservaIdReserva(Integer idReserva);
    List<Estadia> findByEstadoEstadia(EstadoEstadia estadoEstadia);
    Optional<Estadia> findByHabitacionIdHabitacionAndEstadoEstadia(Integer idHabitacion, EstadoEstadia estadoEstadia);
}
