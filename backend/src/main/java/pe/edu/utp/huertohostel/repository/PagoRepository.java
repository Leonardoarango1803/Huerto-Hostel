package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.Pago;

import java.math.BigDecimal;
import java.util.List;

public interface PagoRepository extends JpaRepository<Pago, Integer> {
    List<Pago> findByReservaIdReserva(Integer idReserva);
    List<Pago> findByEstadiaIdEstadia(Integer idEstadia);

    // Chequeos explícitos de null para evitar navegación de FK nullable en JPQL
    @Query("""
            SELECT COALESCE(SUM(p.monto), 0) FROM Pago p
            WHERE (p.estadia IS NOT NULL AND p.estadia.idEstadia = :idEstadia)
               OR (p.reserva IS NOT NULL AND p.reserva.idReserva = :idReserva)
            """)
    BigDecimal sumMontoByReservaOrEstadia(@Param("idEstadia") Integer idEstadia,
                                          @Param("idReserva") Integer idReserva);
}
