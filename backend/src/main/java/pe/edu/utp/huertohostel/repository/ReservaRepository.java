package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Reserva;

import java.time.LocalDate;
import java.util.List;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {
    List<Reserva> findByClienteIdCliente(Integer idCliente);

    List<Reserva> findByHabitacionIdHabitacionAndEstadoReservaIn(Integer idHabitacion, List<EstadoReserva> estados);

    long countByEstadoReservaNotIn(List<EstadoReserva> estados);

    // Usa constantes de enum explícitas para evitar comparación con strings en JPQL
    @Query("""
            SELECT r FROM Reserva r
            WHERE r.habitacion.idHabitacion = :idHabitacion
              AND r.estadoReserva NOT IN :estadosExcluidos
              AND r.fechaCheckinPrevisto < :checkout
              AND r.fechaCheckoutPrevisto > :checkin
            """)
    List<Reserva> findConflictos(
            @Param("idHabitacion") Integer idHabitacion,
            @Param("checkin") LocalDate checkin,
            @Param("checkout") LocalDate checkout,
            @Param("estadosExcluidos") List<EstadoReserva> estadosExcluidos);
}
