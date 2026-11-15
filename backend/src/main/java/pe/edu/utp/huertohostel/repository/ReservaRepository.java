package pe.edu.utp.huertohostel.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Reserva;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {
    List<Reserva> findByClienteIdCliente(Integer idCliente);

    /** Bloquea la fila de la reserva hasta el fin de la transaccion (dos pagos simultaneos de la misma cuenta hacen fila). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reserva r WHERE r.idReserva = :id")
    Optional<Reserva> findByIdParaActualizar(@Param("id") Integer id);

    List<Reserva> findByHabitacionIdHabitacionAndEstadoReservaIn(Integer idHabitacion, List<EstadoReserva> estados);

    long countByEstadoReservaNotIn(List<EstadoReserva> estados);

    List<Reserva> findByEstadoReservaIn(List<EstadoReserva> estados);

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

    /** Igual que findConflictos pero sin contar la propia reserva (para editarla sin chocar consigo misma). */
    @Query("""
            SELECT r FROM Reserva r
            WHERE r.habitacion.idHabitacion = :idHabitacion
              AND r.idReserva <> :idReserva
              AND r.estadoReserva NOT IN :estadosExcluidos
              AND r.fechaCheckinPrevisto < :checkout
              AND r.fechaCheckoutPrevisto > :checkin
            """)
    List<Reserva> findConflictosExcepto(
            @Param("idHabitacion") Integer idHabitacion,
            @Param("idReserva") Integer idReserva,
            @Param("checkin") LocalDate checkin,
            @Param("checkout") LocalDate checkout,
            @Param("estadosExcluidos") List<EstadoReserva> estadosExcluidos);

    /** Reservas que tocan el rango [desde, hasta) para el calendario, con cliente y habitacion de una vez. */
    @Query("""
            SELECT r FROM Reserva r
            JOIN FETCH r.cliente
            JOIN FETCH r.habitacion
            WHERE r.estadoReserva NOT IN :estadosExcluidos
              AND r.fechaCheckinPrevisto < :hasta
              AND r.fechaCheckoutPrevisto > :desde
            """)
    List<Reserva> findEnRango(
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("estadosExcluidos") List<EstadoReserva> estadosExcluidos);

    /** Habitaciones con alguna reserva que se cruza con el rango (misma regla que findConflictos, de una vez). */
    @Query("""
            SELECT DISTINCT r.habitacion.idHabitacion FROM Reserva r
            WHERE r.estadoReserva NOT IN :estadosExcluidos
              AND r.fechaCheckinPrevisto < :checkout
              AND r.fechaCheckoutPrevisto > :checkin
            """)
    List<Integer> findHabitacionesConCruce(
            @Param("checkin") LocalDate checkin,
            @Param("checkout") LocalDate checkout,
            @Param("estadosExcluidos") List<EstadoReserva> estadosExcluidos);

    /** Ingreso por alojamiento de las reservas vigentes (excluye canceladas). */
    @Query("""
            SELECT COALESCE(SUM(r.montoAlojamientoTotal), 0) FROM Reserva r
            WHERE r.estadoReserva NOT IN :estadosExcluidos
            """)
    BigDecimal sumAlojamiento(@Param("estadosExcluidos") List<EstadoReserva> estadosExcluidos);
}
