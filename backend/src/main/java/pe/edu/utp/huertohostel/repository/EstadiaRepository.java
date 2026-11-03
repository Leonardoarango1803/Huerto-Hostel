package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;

import java.util.List;
import java.util.Optional;

public interface EstadiaRepository extends JpaRepository<Estadia, Integer> {
    Optional<Estadia> findByReservaIdReserva(Integer idReserva);
    List<Estadia> findByEstadoEstadia(EstadoEstadia estadoEstadia);
    Optional<Estadia> findByHabitacionIdHabitacionAndEstadoEstadia(Integer idHabitacion, EstadoEstadia estadoEstadia);

    /** Estadias de un cliente en un estado dado; usado por el portal del huesped. */
    @Query("""
            SELECT e FROM Estadia e
            WHERE e.estadoEstadia = :estado
              AND e.reserva IS NOT NULL
              AND e.reserva.cliente.idCliente = :idCliente
            ORDER BY e.fechaCheckinReal DESC
            """)
    List<Estadia> findByClienteAndEstado(@Param("idCliente") Integer idCliente,
                                         @Param("estado") EstadoEstadia estado);
}
