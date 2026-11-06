package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.IncidenciaMantenimiento;

import java.util.List;

public interface IncidenciaMantenimientoRepository
        extends JpaRepository<IncidenciaMantenimiento, Integer> {

    List<IncidenciaMantenimiento> findByEstadoOrderByFechaReporteDesc(EstadoIncidencia estado);

    List<IncidenciaMantenimiento> findAllByOrderByFechaReporteDesc();

    List<IncidenciaMantenimiento> findByEstadoInOrderByFechaReporteAsc(List<EstadoIncidencia> estados);

    boolean existsByHabitacionIdHabitacionAndEstadoIn(
            Integer idHabitacion, List<EstadoIncidencia> estados);

    /** Hay una incidencia abierta que impide usar la habitacion. */
    boolean existsByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoIn(
            Integer idHabitacion, List<EstadoIncidencia> estados);

    /** Otras incidencias abiertas que tambien bloquean la habitacion (para no liberarla mientras queden). */
    long countByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoInAndIdIncidenciaNot(
            Integer idHabitacion, List<EstadoIncidencia> estados, Integer idIncidencia);
}
