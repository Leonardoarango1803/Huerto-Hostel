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

    /**
     * Saldo de todas las estadias de un estado en UNA consulta (alojamiento + consumos - pagos + lo devuelto), como pares
     * [idEstadia, saldo]. Evita preguntar estadia por estadia al armar la pantalla de check-out.
     */
    @Query("""
            SELECT e.idEstadia,
                   COALESCE(r.montoAlojamientoTotal, 0)
                   + COALESCE((SELECT SUM(c.totalConsumo) FROM ConsumoEstadia c WHERE c.estadia = e), 0)
                   - COALESCE((SELECT SUM(p.monto) FROM Pago p
                               WHERE p.estadia = e OR (p.reserva IS NOT NULL AND p.reserva = r)), 0)
                   + COALESCE((SELECT SUM(m.monto) FROM MovimientoCaja m
                               WHERE m.tipo = 'DEVOLUCION' AND m.idEstadia = e.idEstadia), 0)
            FROM Estadia e JOIN e.reserva r
            WHERE e.estadoEstadia = :estado
            """)
    List<Object[]> saldosPorEstado(@Param("estado") EstadoEstadia estado);

    /** Lo que quedo debiendo en las salidas autorizadas con saldo pendiente: [cantidad, suma]. */
    @Query("SELECT COUNT(e), COALESCE(SUM(e.saldoAlSalir), 0) FROM Estadia e WHERE e.salidaForzada = true")
    List<Object[]> deudaPorSalidasForzadas();

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
