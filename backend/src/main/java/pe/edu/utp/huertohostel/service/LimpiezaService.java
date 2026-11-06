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
    private final BloqueoPorIncidencia bloqueoPorIncidencia;

    public LimpiezaService(TareaLimpiezaRepository tareaRepository,
                           HabitacionRepository habitacionRepository,
                           UsuarioActualService usuarioActualService,
                           BloqueoPorIncidencia bloqueoPorIncidencia) {
        this.tareaRepository = tareaRepository;
        this.habitacionRepository = habitacionRepository;
        this.usuarioActualService = usuarioActualService;
        this.bloqueoPorIncidencia = bloqueoPorIncidencia;
    }

    /**
     * Sin filtro devuelve las tareas abiertas (pendientes y en proceso). Antes de mostrarlas se revisa que ninguna habitacion
     * este "en limpieza" sin su tarea (por ejemplo si se cambio el estado a mano): asi Limpieza y Habitaciones no se contradicen.
     */
    @Transactional
    public List<TareaLimpieza> listar(EstadoTareaLimpieza estado) {
        if (estado == null) {
            repararHabitacionesSinTarea();
        }
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

    /** Crea la tarea que falta de las habitaciones PENDIENTE_LIMPIEZA o EN_LIMPIEZA que nadie tiene en su bandeja. */
    private void repararHabitacionesSinTarea() {
        for (EstadoOperativoHab estado : List.of(EstadoOperativoHab.PENDIENTE_LIMPIEZA, EstadoOperativoHab.EN_LIMPIEZA)) {
            for (Habitacion h : habitacionRepository.findByEstadoOperativo(estado)) {
                boolean tiene = tareaRepository.existsByHabitacionIdHabitacionAndEstadoIn(h.getIdHabitacion(), ABIERTAS);
                if (!tiene) {
                    TareaLimpieza t = crearPara(h, OrigenTareaLimpieza.PROGRAMADO, "Creada al detectar la habitacion en limpieza sin tarea");
                    if (estado == EstadoOperativoHab.EN_LIMPIEZA) {
                        t.setEstado(EstadoTareaLimpieza.EN_PROCESO); // ya la estaban limpiando; no se asigna a quien abre la pantalla
                        t.setFechaInicio(LocalDateTime.now());
                        tareaRepository.save(t);
                    }
                }
            }
        }
    }

    /**
     * Mantiene la tarea alineada cuando el estado de la habitacion se cambia desde Habitaciones (sin pasar por Limpieza):
     * PENDIENTE_LIMPIEZA crea la tarea, EN_LIMPIEZA la pone en proceso y DISPONIBLE cierra las que sigan abiertas.
     */
    @Transactional
    public void sincronizarConEstado(Habitacion habitacion, EstadoOperativoHab nuevo, String detalle) {
        if (nuevo == EstadoOperativoHab.PENDIENTE_LIMPIEZA) {
            crearPara(habitacion, OrigenTareaLimpieza.PROGRAMADO, detalle);
        } else if (nuevo == EstadoOperativoHab.EN_LIMPIEZA) {
            TareaLimpieza tarea = crearPara(habitacion, OrigenTareaLimpieza.PROGRAMADO, detalle);
            if (tarea.getEstado() == EstadoTareaLimpieza.PENDIENTE) {
                tarea.setEstado(EstadoTareaLimpieza.EN_PROCESO);
                tarea.setFechaInicio(LocalDateTime.now());
                tarea.setEmpleadoAsignado(usuarioActualService.empleadoOpcional());
                tareaRepository.save(tarea);
            }
        } else if (nuevo == EstadoOperativoHab.DISPONIBLE && habitacion.getIdHabitacion() != null) {
            for (TareaLimpieza t : tareaRepository.findByHabitacionIdHabitacionOrderByFechaCreacionDesc(habitacion.getIdHabitacion())) {
                if (ABIERTAS.contains(t.getEstado())) {
                    t.setEstado(EstadoTareaLimpieza.COMPLETADA);
                    t.setFechaFin(LocalDateTime.now());
                    if (t.getEmpleadoAsignado() == null) {
                        t.setEmpleadoAsignado(usuarioActualService.empleadoOpcional());
                    }
                    tareaRepository.save(t);
                }
            }
        }
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
                // Si una incidencia abierta la bloquea, limpiarla no la devuelve al uso: sigue en MANTENIMIENTO.
                habitacion.setEstadoOperativo(bloqueoPorIncidencia.estadoAlLiberar(habitacion, EstadoOperativoHab.DISPONIBLE));
                habitacionRepository.save(habitacion);
            }
        }

        return tareaRepository.save(tarea);
    }
}
