package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoTareaLimpieza;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.OrigenTareaLimpieza;
import pe.edu.utp.huertohostel.entity.TareaLimpieza;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.TareaLimpiezaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class LimpiezaService {

    private static final List<EstadoTareaLimpieza> ABIERTAS =
            List.of(EstadoTareaLimpieza.PENDIENTE, EstadoTareaLimpieza.EN_PROCESO);

    private final TareaLimpiezaRepository tareaRepository;
    private final HabitacionRepository habitacionRepository;
    private final UsuarioActualService usuarioActualService;

    public LimpiezaService(TareaLimpiezaRepository tareaRepository,
                           HabitacionRepository habitacionRepository,
                           UsuarioActualService usuarioActualService) {
        this.tareaRepository = tareaRepository;
        this.habitacionRepository = habitacionRepository;
        this.usuarioActualService = usuarioActualService;
    }

    /** Sin filtro devuelve las tareas abiertas (pendientes y en proceso). */
    public List<TareaLimpieza> listar(EstadoTareaLimpieza estado) {
        return estado != null
                ? tareaRepository.findByEstadoOrderByFechaCreacionAsc(estado)
                : tareaRepository.findByEstadoInOrderByFechaCreacionAsc(ABIERTAS);
    }

    public TareaLimpieza obtenerPorId(@NonNull Integer id) {
        return tareaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tarea de limpieza no encontrada con id: " + id));
    }

    @Transactional
    public TareaLimpieza crear(@NonNull Integer idHabitacion, OrigenTareaLimpieza origen, String observaciones) {
        Habitacion habitacion = habitacionRepository.findById(idHabitacion)
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada con id: " + idHabitacion));
        return crearPara(habitacion, origen != null ? origen : OrigenTareaLimpieza.PROGRAMADO, observaciones);
    }

    /**
     * Crea la tarea evitando duplicados: si la habitacion ya tiene una tarea abierta
     * se devuelve esa. Lo usa el check-out para no generar dos tareas por la misma salida.
     */
    @Transactional
    public TareaLimpieza crearPara(Habitacion habitacion, OrigenTareaLimpieza origen, String observaciones) {
        Integer idHabitacion = habitacion.getIdHabitacion();
        if (idHabitacion != null) {
            Optional<TareaLimpieza> abierta = tareaRepository
                    .findByHabitacionIdHabitacionOrderByFechaCreacionDesc(idHabitacion)
                    .stream()
                    .filter(t -> ABIERTAS.contains(t.getEstado()))
                    .findFirst();
            if (abierta.isPresent()) {
                return abierta.get();
            }
        }

        TareaLimpieza tarea = new TareaLimpieza();
        tarea.setHabitacion(habitacion);
        tarea.setOrigen(origen);
        tarea.setEstado(EstadoTareaLimpieza.PENDIENTE);
        tarea.setObservaciones(observaciones);
        tarea.setFechaCreacion(LocalDateTime.now());
        return tareaRepository.save(tarea);
    }

    /**
     * Avanza la tarea y sincroniza el estado operativo de la habitacion:
     * EN_PROCESO -> EN_LIMPIEZA, COMPLETADA -> DISPONIBLE.
     */
    @Transactional
    public TareaLimpieza cambiarEstado(@NonNull Integer idTarea, EstadoTareaLimpieza nuevo) {
        if (nuevo == null) {
            throw new IllegalStateException("Debe indicar el nuevo estado de la tarea.");
        }
        TareaLimpieza tarea = obtenerPorId(idTarea);
        if (tarea.getEstado() == EstadoTareaLimpieza.COMPLETADA) {
            throw new IllegalStateException("La tarea ya fue completada.");
        }

        tarea.setEstado(nuevo);
        Habitacion habitacion = tarea.getHabitacion();

        if (nuevo == EstadoTareaLimpieza.EN_PROCESO) {
            tarea.setFechaInicio(LocalDateTime.now());
            tarea.setEmpleadoAsignado(usuarioActualService.obtenerEmpleado());
            if (habitacion != null) {
                habitacion.setEstadoOperativo(EstadoOperativoHab.EN_LIMPIEZA);
                habitacionRepository.save(habitacion);
            }
        } else if (nuevo == EstadoTareaLimpieza.COMPLETADA) {
            tarea.setFechaFin(LocalDateTime.now());
            if (tarea.getEmpleadoAsignado() == null) {
                tarea.setEmpleadoAsignado(usuarioActualService.obtenerEmpleado());
            }
            if (habitacion != null) {
                habitacion.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
                habitacionRepository.save(habitacion);
            }
        }

        return tareaRepository.save(tarea);
    }
}
