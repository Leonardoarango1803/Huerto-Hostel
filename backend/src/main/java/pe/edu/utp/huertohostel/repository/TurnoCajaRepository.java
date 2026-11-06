package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.EstadoTurno;
import pe.edu.utp.huertohostel.entity.TurnoCaja;

import java.util.List;
import java.util.Optional;

public interface TurnoCajaRepository extends JpaRepository<TurnoCaja, Integer> {

    /** El turno abierto del hotel (la caja es unica); un indice parcial garantiza que haya como maximo uno. */
    Optional<TurnoCaja> findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno estado);

    List<TurnoCaja> findByEstadoOrderByFechaAperturaDesc(EstadoTurno estado);

    List<TurnoCaja> findAllByOrderByFechaAperturaDesc();

    /** El ultimo turno ya cerrado: de el recibe la caja quien abre. */
    Optional<TurnoCaja> findFirstByEstadoNotOrderByFechaCierreDesc(EstadoTurno estado);
}
