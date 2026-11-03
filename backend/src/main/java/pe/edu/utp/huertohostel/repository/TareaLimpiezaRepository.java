package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.EstadoTareaLimpieza;
import pe.edu.utp.huertohostel.entity.TareaLimpieza;

import java.util.List;

public interface TareaLimpiezaRepository extends JpaRepository<TareaLimpieza, Integer> {

    List<TareaLimpieza> findByEstadoOrderByFechaCreacionAsc(EstadoTareaLimpieza estado);

    List<TareaLimpieza> findByEstadoInOrderByFechaCreacionAsc(List<EstadoTareaLimpieza> estados);

    List<TareaLimpieza> findByHabitacionIdHabitacionOrderByFechaCreacionDesc(Integer idHabitacion);

    boolean existsByHabitacionIdHabitacionAndEstadoIn(
            Integer idHabitacion, List<EstadoTareaLimpieza> estados);
}
