package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.Pago;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PagoRepository extends JpaRepository<Pago, Integer> {
    List<Pago> findByReservaIdReserva(Integer idReserva);

    /**
     * Todos los pagos de una reserva: los ligados a ella y los ligados a su estadia. Un cobro hecho solo con la
     * estadia (la pasarela de recepcion lo hacia) tambien es de la reserva, y el saldo ya lo contaba.
     */
    @Query("""
            SELECT p FROM Pago p LEFT JOIN p.estadia e
            WHERE (p.reserva IS NOT NULL AND p.reserva.idReserva = :idReserva)
               OR (e IS NOT NULL AND e.reserva.idReserva = :idReserva)
            ORDER BY p.fechaPago, p.idPago
            """)
    List<Pago> findDeReservaOSuEstadia(@Param("idReserva") Integer idReserva);
    List<Pago> findByEstadiaIdEstadia(Integer idEstadia);

    // Chequeos explícitos de null para evitar navegación de FK nullable en JPQL
    @Query("""
            SELECT COALESCE(SUM(p.monto), 0) FROM Pago p
            WHERE (p.estadia IS NOT NULL AND p.estadia.idEstadia = :idEstadia)
               OR (p.reserva IS NOT NULL AND p.reserva.idReserva = :idReserva)
            """)
    BigDecimal sumMontoByReservaOrEstadia(@Param("idEstadia") Integer idEstadia,
                                          @Param("idReserva") Integer idReserva);

    List<Pago> findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(Integer idTurnoCaja);

    /** Cobros de liquidacion del check-out entre dos instantes (lo "liquidado hoy" de la pantalla de salidas). */
    @Query("""
            SELECT COALESCE(SUM(p.monto), 0) FROM Pago p
            WHERE p.concepto = :concepto
              AND p.fechaPago >= :desde AND p.fechaPago < :hasta
            """)
    BigDecimal sumConceptoEntre(@Param("concepto") pe.edu.utp.huertohostel.entity.ConceptoPago concepto,
                                @Param("desde") LocalDateTime desde,
                                @Param("hasta") LocalDateTime hasta);

    @Query("""
            SELECT COALESCE(SUM(p.monto), 0) FROM Pago p
            WHERE p.fechaPago >= :desde AND p.fechaPago < :hasta
            """)
    BigDecimal sumMontoEntre(@Param("desde") LocalDateTime desde,
                             @Param("hasta") LocalDateTime hasta);
}
