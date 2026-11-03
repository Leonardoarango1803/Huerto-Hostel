package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.IncidenciaMantenimiento;
import pe.edu.utp.huertohostel.entity.TipoIncidencia;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class IncidenciaService {

    private final IncidenciaMantenimientoRepository incidenciaRepository;
    private final HabitacionRepository habitacionRepository;
    private final UsuarioActualService usuarioActualService;

    public IncidenciaService(IncidenciaMantenimientoRepository incidenciaRepository,
                             HabitacionRepository habitacionRepository,
                             UsuarioActualService usuarioActualService) {
        this.incidenciaRepository = incidenciaRepository;
        this.habitacionRepository = habitacionRepository;
        this.usuarioActualService = usuarioActualService;
    }

    public List<IncidenciaMantenimiento> listar(EstadoIncidencia estado) {
        return estado != null
                ? incidenciaRepository.findByEstadoOrderByFechaReporteDesc(estado)
                : incidenciaRepository.findAllByOrderByFechaReporteDesc();
    }

    public IncidenciaMantenimiento obtenerPorId(@NonNull Integer id) {
        return incidenciaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Incidencia no encontrada con id: " + id));
    }

    @Transactional
    public IncidenciaMantenimiento reportar(@NonNull Integer idHabitacion,
                                            TipoIncidencia tipo,
                                            String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new IllegalStateException("La incidencia necesita una descripcion.");
        }
        Habitacion habitacion = habitacionRepository.findById(idHabitacion)
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada con id: " + idHabitacion));

        IncidenciaMantenimiento incidencia = new IncidenciaMantenimiento();
        incidencia.setHabitacion(habitacion);
        incidencia.setTipoIncidencia(tipo != null ? tipo : TipoIncidencia.OTRO);
        incidencia.setDescripcion(descripcion);
        incidencia.setEstado(EstadoIncidencia.PENDIENTE);
        incidencia.setEmpleadoReporta(usuarioActualService.obtenerEmpleado());
        incidencia.setFechaReporte(LocalDateTime.now());
        return incidenciaRepository.save(incidencia);
    }

    /**
     * EN_REPARACION bloquea la habitacion en MANTENIMIENTO; al resolverla se libera
     * a PENDIENTE_LIMPIEZA para que housekeeping la revise antes de venderla.
     */
    @Transactional
    public IncidenciaMantenimiento cambiarEstado(@NonNull Integer id,
                                                 EstadoIncidencia nuevo,
                                                 String observaciones) {
        if (nuevo == null) {
            throw new IllegalStateException("Debe indicar el nuevo estado de la incidencia.");
        }
        IncidenciaMantenimiento incidencia = obtenerPorId(id);
        if (incidencia.getEstado() == EstadoIncidencia.RESUELTO) {
            throw new IllegalStateException("La incidencia ya fue resuelta.");
        }

        incidencia.setEstado(nuevo);
        if (observaciones != null && !observaciones.isBlank()) {
            incidencia.setObservaciones(observaciones);
        }

        Habitacion habitacion = incidencia.getHabitacion();

        if (nuevo == EstadoIncidencia.EN_REPARACION) {
            incidencia.setEmpleadoResponsable(usuarioActualService.obtenerEmpleado());
            if (habitacion != null && habitacion.getEstadoOperativo() != EstadoOperativoHab.OCUPADA) {
                habitacion.setEstadoOperativo(EstadoOperativoHab.MANTENIMIENTO);
                habitacionRepository.save(habitacion);
            }
        } else if (nuevo == EstadoIncidencia.RESUELTO) {
            incidencia.setFechaResolucion(LocalDateTime.now());
            if (incidencia.getEmpleadoResponsable() == null) {
                incidencia.setEmpleadoResponsable(usuarioActualService.obtenerEmpleado());
            }
            if (habitacion != null && habitacion.getEstadoOperativo() == EstadoOperativoHab.MANTENIMIENTO) {
                habitacion.setEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
                habitacionRepository.save(habitacion);
            }
        }

        return incidenciaRepository.save(incidencia);
    }
}
