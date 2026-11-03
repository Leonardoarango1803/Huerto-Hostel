package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.BitacoraTurno;

import java.util.List;

public interface BitacoraTurnoRepository extends JpaRepository<BitacoraTurno, Integer> {
    List<BitacoraTurno> findByTurnoCajaIdTurnoCajaOrderByFechaHoraDesc(Integer idTurnoCaja);
}
