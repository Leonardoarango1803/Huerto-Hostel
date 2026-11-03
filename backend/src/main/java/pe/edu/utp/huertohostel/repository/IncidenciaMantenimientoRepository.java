package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.IncidenciaMantenimiento;

import java.util.List;

public interface IncidenciaMantenimientoRepository
        extends JpaRepository<IncidenciaMantenimiento, Integer> {

    List<IncidenciaMantenimiento> findByEstadoOrderByFechaReporteDesc(EstadoIncidencia estado);

    List<IncidenciaMantenimiento> findAllByOrderByFechaReporteDesc();

    boolean existsByHabitacionIdHabitacionAndEstadoIn(
            Integer idHabitacion, List<EstadoIncidencia> estados);
}
