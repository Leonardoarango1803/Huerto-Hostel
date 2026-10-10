package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;

import java.math.BigDecimal;
import java.util.List;

public interface ConsumoEstadiaRepository extends JpaRepository<ConsumoEstadia, Integer> {
    List<ConsumoEstadia> findByEstadiaIdEstadia(Integer idEstadia);

    @Query("SELECT COALESCE(SUM(c.totalConsumo), 0) FROM ConsumoEstadia c WHERE c.estadia.idEstadia = :idEstadia")
    BigDecimal sumTotalByEstadia(@Param("idEstadia") Integer idEstadia);
}
