package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.ArqueoParcial;

import java.util.List;

public interface ArqueoParcialRepository extends JpaRepository<ArqueoParcial, Integer> {

    List<ArqueoParcial> findByTurnoCajaIdTurnoCajaOrderByFechaHoraAsc(Integer idTurnoCaja);

    long countByTurnoCajaIdTurnoCaja(Integer idTurnoCaja);
}
