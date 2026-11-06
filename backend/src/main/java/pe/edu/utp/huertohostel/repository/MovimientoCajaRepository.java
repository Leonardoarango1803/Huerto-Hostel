package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.MovimientoCaja;

import java.math.BigDecimal;
import java.util.List;

public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Integer> {

    List<MovimientoCaja> findByTurnoCajaIdTurnoCajaOrderByFechaHoraAsc(Integer idTurnoCaja);

    /** Lo devuelto en efectivo al huesped de una estadia (saldo a favor que se le entrego al salir). */
    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tipo = 'DEVOLUCION' AND m.idEstadia = :idEstadia")
    BigDecimal devueltoDeEstadia(@Param("idEstadia") Integer idEstadia);

    List<MovimientoCaja> findByIdEstadiaAndTipoOrderByFechaHoraAsc(Integer idEstadia, String tipo);

    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.turnoCaja.idTurnoCaja = :idTurno")
    BigDecimal totalDelTurno(@Param("idTurno") Integer idTurno);
}
