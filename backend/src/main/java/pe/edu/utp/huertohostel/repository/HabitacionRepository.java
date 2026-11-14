package pe.edu.utp.huertohostel.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;

import java.util.List;
import java.util.Optional;

public interface HabitacionRepository extends JpaRepository<Habitacion, Integer> {
    Optional<Habitacion> findByNumero(String numero);
    boolean existsByNumero(String numero);
    List<Habitacion> findByEstadoOperativo(EstadoOperativoHab estadoOperativo);
    long countByEstadoOperativo(EstadoOperativoHab estadoOperativo);

    /** Habitaciones activas de un tipo, en orden de numero (la web asigna la primera libre). */
    List<Habitacion> findByTipoHabitacionIdTipoHabitacionAndEstadoTrueOrderByNumeroAsc(Integer idTipoHabitacion);

    /**
     * Bloquea la fila de la habitacion hasta el fin de la transaccion: dos reservas web simultaneas
     * por la misma habitacion se atienden una tras otra y la segunda ve el conflicto de fechas.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Habitacion h WHERE h.idHabitacion = :id")
    Optional<Habitacion> findByIdParaActualizar(Integer id);
}
