package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.BitacoraTurno;

import java.util.List;

public interface BitacoraTurnoRepository extends JpaRepository<BitacoraTurno, Integer> {
    List<BitacoraTurno> findByTurnoCajaIdTurnoCajaOrderByFechaHoraDesc(Integer idTurnoCaja);

    /** Notas sin resolver de todos los turnos, las mas recientes primero. */
    List<BitacoraTurno> findByResueltoFalseOrderByFechaHoraDesc();

    long countByResueltoFalse();

    /** Notas de dinero sin resolver (todas), las mas recientes primero. */
    List<BitacoraTurno> findByResueltoFalseAndCategoriaInOrderByFechaHoraDesc(java.util.Collection<String> categorias);

    /** Notas de dinero (diferencias) sin resolver de un turno: mientras existan no se puede auditar. */
    long countByTurnoCajaIdTurnoCajaAndResueltoFalseAndCategoriaIn(Integer idTurnoCaja, java.util.Collection<String> categorias);
}
