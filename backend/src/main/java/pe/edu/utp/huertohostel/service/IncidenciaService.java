package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.IncidenciaMantenimiento;
import pe.edu.utp.huertohostel.entity.OrigenTareaLimpieza;
import pe.edu.utp.huertohostel.entity.TipoIncidencia;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Incidencias de mantenimiento. Quien reporta decide si la averia IMPIDE usar la habitacion (se bloquea en MANTENIMIENTO
 * y no se vende) o si es menor (sigue disponible, pero con la incidencia a la vista). Una incidencia se resuelve eligiendo
 * si la habitacion se vende ya o pasa antes por limpieza, se puede cerrar como duplicada o sin procedencia, y una cerrada
 * se puede reabrir si la falla vuelve.
 */
@Service
@Transactional(readOnly = true)
public class IncidenciaService {

    /** Destino de la habitacion al resolver una incidencia. */
    public static final String DESTINO_DISPONIBLE = "DISPONIBLE";
    public static final String DESTINO_LIMPIEZA = "LIMPIEZA";

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM HH:mm");

    private final IncidenciaMantenimientoRepository incidenciaRepository;
    private final HabitacionRepository habitacionRepository;
    private final UsuarioActualService usuarioActualService;
    private final LimpiezaService limpiezaService;

    public IncidenciaService(IncidenciaMantenimientoRepository incidenciaRepository,
                             HabitacionRepository habitacionRepository,
                             UsuarioActualService usuarioActualService,
                             LimpiezaService limpiezaService) {
        this.incidenciaRepository = incidenciaRepository;
        this.habitacionRepository = habitacionRepository;
        this.usuarioActualService = usuarioActualService;
        this.limpiezaService = limpiezaService;
    }

    /** Lo que paso con la incidencia y con la habitacion, con un mensaje listo para mostrar. */
    public record ResultadoIncidencia(IncidenciaMantenimiento incidencia, String estadoHabitacion,
                                      Integer idTareaLimpieza, String mensaje) {
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

    /**
     * Incidencias abiertas agrupadas por habitacion, para avisar en Habitaciones y Reservas que una habitacion tiene una
     * averia (y si esa averia la bloquea).
     */
    public List<Map<String, Object>> resumenPorHabitacion() {
        Map<Integer, Map<String, Object>> porHabitacion = new LinkedHashMap<>();
        for (IncidenciaMantenimiento i : incidenciaRepository.findByEstadoInOrderByFechaReporteAsc(EstadoIncidencia.ABIERTAS)) {
            if (i.getHabitacion() == null) {
                continue;
            }
            Map<String, Object> m = porHabitacion.computeIfAbsent(i.getHabitacion().getIdHabitacion(), id -> {
                Map<String, Object> nuevo = new LinkedHashMap<>();
                nuevo.put("idHabitacion", id);
                nuevo.put("numero", i.getHabitacion().getNumero());
                nuevo.put("cantidad", 0);
                nuevo.put("bloquea", false);
                nuevo.put("detalle", new ArrayList<String>());
                return nuevo;
            });
            m.put("cantidad", (Integer) m.get("cantidad") + 1);
            if (Boolean.TRUE.equals(i.getBloqueaHabitacion())) {
                m.put("bloquea", true);
            }
            @SuppressWarnings("unchecked")
            List<String> detalle = (List<String>) m.get("detalle");
            detalle.add(i.getTipoIncidencia().name() + ": " + i.getDescripcion());
        }
        return new ArrayList<>(porHabitacion.values());
    }

    // ---------- Reportar ----------

    @Transactional
    public ResultadoIncidencia reportar(@NonNull Integer idHabitacion, TipoIncidencia tipo, String descripcion,
                                        boolean bloquearHabitacion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new IllegalStateException("La incidencia necesita una descripcion.");
        }
        Habitacion habitacion = habitacionRepository.findById(idHabitacion)
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada con id: " + idHabitacion));

        IncidenciaMantenimiento incidencia = new IncidenciaMantenimiento();
        incidencia.setHabitacion(habitacion);
        incidencia.setTipoIncidencia(tipo != null ? tipo : TipoIncidencia.OTRO);
        incidencia.setDescripcion(descripcion.trim());
        incidencia.setEstado(EstadoIncidencia.PENDIENTE);
        incidencia.setBloqueaHabitacion(bloquearHabitacion);
        incidencia.setEmpleadoReporta(usuarioActualService.obtenerEmpleado());
        incidencia.setFechaReporte(LocalDateTime.now());
        IncidenciaMantenimiento guardada = incidenciaRepository.save(incidencia);

        String mensaje = "Incidencia registrada. " + (bloquearHabitacion
                ? textoDeBloqueo(bloquear(habitacion))
                : "No bloquea la habitacion: sigue " + habitacion.getEstadoOperativo()
                + " y se puede usar. Si despues deja de poder usarse, bloqueala desde la incidencia.");
        return new ResultadoIncidencia(guardada, estadoDe(habitacion), null, mensaje);
    }

    // ---------- Bloquear o liberar la habitacion ----------

    /** Cambia la decision de bloquear: una averia menor puede volverse grave, o al reves. Solo incidencias abiertas. */
    @Transactional
    public ResultadoIncidencia cambiarBloqueo(@NonNull Integer id, boolean bloquear) {
        IncidenciaMantenimiento incidencia = obtenerPorId(id);
        if (!incidencia.getEstado().abierta()) {
            throw new IllegalStateException("La incidencia ya esta cerrada: no hay nada que bloquear.");
        }
        if (Boolean.TRUE.equals(incidencia.getBloqueaHabitacion()) == bloquear) {
            throw new IllegalStateException(bloquear ? "Esta incidencia ya bloquea la habitacion."
                    : "Esta incidencia ya no bloquea la habitacion.");
        }
        incidencia.setBloqueaHabitacion(bloquear);
        incidenciaRepository.save(incidencia);
        Habitacion habitacion = incidencia.getHabitacion();
        String mensaje;
        if (bloquear) {
            mensaje = textoDeBloqueo(bloquear(habitacion));
        } else {
            mensaje = liberarSiNadaBloquea(habitacion, id);
        }
        return new ResultadoIncidencia(incidencia, estadoDe(habitacion), null, mensaje);
    }

    private enum EfectoBloqueo { BLOQUEADA, YA_BLOQUEADA, DIFERIDA }

    /** Bloquea la habitacion en MANTENIMIENTO si se puede; una ocupada o reservada no se mueve ahora. */
    private EfectoBloqueo bloquear(Habitacion habitacion) {
        if (habitacion == null) {
            return EfectoBloqueo.DIFERIDA;
        }
        EstadoOperativoHab actual = habitacion.getEstadoOperativo();
        if (actual == EstadoOperativoHab.MANTENIMIENTO) {
            return EfectoBloqueo.YA_BLOQUEADA;
        }
        if (actual == EstadoOperativoHab.DISPONIBLE || actual == EstadoOperativoHab.PENDIENTE_LIMPIEZA
                || actual == EstadoOperativoHab.EN_LIMPIEZA) {
            habitacion.setEstadoOperativo(EstadoOperativoHab.MANTENIMIENTO);
            habitacionRepository.save(habitacion);
            return EfectoBloqueo.BLOQUEADA;
        }
        return EfectoBloqueo.DIFERIDA;
    }

    private String textoDeBloqueo(EfectoBloqueo efecto) {
        return switch (efecto) {
            case BLOQUEADA -> "La habitacion quedo en MANTENIMIENTO y no se puede vender.";
            case YA_BLOQUEADA -> "La habitacion ya estaba en MANTENIMIENTO.";
            case DIFERIDA -> "La habitacion esta ocupada o reservada: no se mueve ahora, pero quedara en MANTENIMIENTO "
                    + "cuando salga el huesped o se libere la reserva.";
        };
    }

    private boolean otrasBloqueantes(Habitacion habitacion, Integer excluir) {
        return habitacion != null && incidenciaRepository
                .countByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoInAndIdIncidenciaNot(
                        habitacion.getIdHabitacion(), EstadoIncidencia.ABIERTAS, excluir) > 0;
    }

    /** Devuelve la habitacion al uso si ninguna otra incidencia abierta la bloquea; devuelve el mensaje correspondiente. */
    private String liberarSiNadaBloquea(Habitacion habitacion, Integer excluir) {
        if (habitacion == null) {
            return "Incidencia actualizada.";
        }
        if (otrasBloqueantes(habitacion, excluir)) {
            return "La habitacion sigue en MANTENIMIENTO: otra incidencia abierta la bloquea.";
        }
        if (habitacion.getEstadoOperativo() == EstadoOperativoHab.MANTENIMIENTO) {
            habitacion.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
            habitacionRepository.save(habitacion);
            return "La habitacion se libero: quedo DISPONIBLE para vender.";
        }
        return "La habitacion no estaba bloqueada: sigue " + habitacion.getEstadoOperativo() + ".";
    }

    private static String estadoDe(Habitacion h) {
        return h != null && h.getEstadoOperativo() != null ? h.getEstadoOperativo().name() : null;
    }

    // ---------- Cambiar de estado ----------

    /**
     * Estados: PENDIENTE -> EN_REPARACION -> RESUELTO, o cerrar sin reparar (DUPLICADA / NO_PROCEDE, con motivo). Una cerrada
     * solo puede volver a PENDIENTE (reabrirla, contando que fallo de nuevo). Al RESOLVER se elige el destino de la
     * habitacion: DISPONIBLE (vuelve a venderse ya) o LIMPIEZA (pasa a PENDIENTE_LIMPIEZA y se crea la tarea para housekeeping).
     */
    @Transactional
    public ResultadoIncidencia cambiarEstado(@NonNull Integer id, EstadoIncidencia nuevo, String observaciones,
                                             String destino) {
        if (nuevo == null) {
            throw new IllegalStateException("Debe indicar el nuevo estado de la incidencia.");
        }
        String dest = destino == null || destino.isBlank() ? null : destino.trim().toUpperCase();
        if (dest != null && !DESTINO_DISPONIBLE.equals(dest) && !DESTINO_LIMPIEZA.equals(dest)) {
            throw new IllegalStateException("El destino de la habitacion debe ser DISPONIBLE o LIMPIEZA.");
        }
        IncidenciaMantenimiento incidencia = obtenerPorId(id);
        EstadoIncidencia actual = incidencia.getEstado();
        String texto = observaciones == null ? "" : observaciones.trim();

        if (!actual.abierta()) {
            if (nuevo != EstadoIncidencia.PENDIENTE) {
                throw new IllegalStateException("La incidencia ya esta cerrada (" + actual
                        + "). Si la falla vuelve, reabrela.");
            }
            return reabrir(incidencia, texto);
        }
        if (nuevo == actual || nuevo == EstadoIncidencia.PENDIENTE) {
            throw new IllegalStateException("La incidencia ya esta " + actual + ": elige el siguiente paso.");
        }

        Habitacion habitacion = incidencia.getHabitacion();
        if (!texto.isEmpty()) {
            incidencia.setObservaciones(texto);
        }
        incidencia.setEstado(nuevo);

        return switch (nuevo) {
            case EN_REPARACION -> iniciarReparacion(incidencia, habitacion);
            case RESUELTO -> resolver(incidencia, habitacion, dest);
            case DUPLICADA, NO_PROCEDE -> cerrarSinReparar(incidencia, habitacion, texto);
            default -> throw new IllegalStateException("Estado no permitido: " + nuevo);
        };
    }

    private ResultadoIncidencia iniciarReparacion(IncidenciaMantenimiento incidencia, Habitacion habitacion) {
        incidencia.setEmpleadoResponsable(usuarioActualService.obtenerEmpleado());
        incidencia.setFechaInicioReparacion(LocalDateTime.now());
        String mensaje;
        if (Boolean.TRUE.equals(incidencia.getBloqueaHabitacion())) {
            mensaje = "Incidencia en reparacion. " + textoDeBloqueo(bloquear(habitacion));
        } else {
            mensaje = "Incidencia en reparacion. No bloquea la habitacion: sigue "
                    + (habitacion != null ? habitacion.getEstadoOperativo() : "—")
                    + ". Si no se puede usar mientras se repara, bloqueala desde la incidencia.";
        }
        IncidenciaMantenimiento g = incidenciaRepository.save(incidencia);
        return new ResultadoIncidencia(g, estadoDe(habitacion), null, mensaje);
    }

    private ResultadoIncidencia resolver(IncidenciaMantenimiento incidencia, Habitacion habitacion, String dest) {
        LocalDateTime ahora = LocalDateTime.now();
        incidencia.setFechaResolucion(ahora);
        if (incidencia.getFechaInicioReparacion() == null) {
            incidencia.setFechaInicioReparacion(ahora); // se arreglo al instante: respuesta = resolucion
        }
        if (incidencia.getEmpleadoResponsable() == null) {
            incidencia.setEmpleadoResponsable(usuarioActualService.obtenerEmpleado());
        }
        incidenciaRepository.save(incidencia);

        String mensaje = "Incidencia resuelta.";
        Integer idTarea = null;
        if (habitacion != null) {
            EstadoOperativoHab actual = habitacion.getEstadoOperativo();
            if (otrasBloqueantes(habitacion, incidencia.getIdIncidencia())) {
                mensaje = "Incidencia resuelta. La habitacion sigue en MANTENIMIENTO: otra incidencia abierta la bloquea.";
            } else if (DESTINO_LIMPIEZA.equals(destinoEfectivo(dest, actual))
                    && (actual == EstadoOperativoHab.MANTENIMIENTO || actual == EstadoOperativoHab.DISPONIBLE
                    || actual == EstadoOperativoHab.PENDIENTE_LIMPIEZA)) {
                if (actual != EstadoOperativoHab.PENDIENTE_LIMPIEZA) {
                    habitacion.setEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
                    habitacionRepository.save(habitacion);
                }
                idTarea = limpiezaService.crearPara(habitacion, OrigenTareaLimpieza.POST_MANTENIMIENTO,
                        "Tras resolver la incidencia #" + incidencia.getIdIncidencia() + " de mantenimiento").getIdTarea();
                mensaje = "Incidencia resuelta. La habitacion paso a limpieza: se creo la tarea #" + idTarea
                        + " para housekeeping y se vendera cuando la completen.";
            } else if (DESTINO_DISPONIBLE.equals(dest) && actual == EstadoOperativoHab.MANTENIMIENTO) {
                habitacion.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
                habitacionRepository.save(habitacion);
                mensaje = "Incidencia resuelta. La habitacion quedo DISPONIBLE para vender.";
            } else {
                mensaje = "Incidencia resuelta. La habitacion no estaba bloqueada: sigue " + actual + ".";
            }
        }
        IncidenciaMantenimiento g = incidenciaRepository.save(incidencia);
        return new ResultadoIncidencia(g, estadoDe(habitacion), idTarea, mensaje);
    }

    /** Duplicada o sin procedencia: se cierra sin reparar y, si bloqueaba la habitacion, se libera. Exige el motivo. */
    private ResultadoIncidencia cerrarSinReparar(IncidenciaMantenimiento incidencia, Habitacion habitacion, String motivo) {
        if (motivo.isEmpty()) {
            throw new IllegalStateException("Explica el motivo: por que es "
                    + (incidencia.getEstado() == EstadoIncidencia.DUPLICADA ? "duplicada (cual es la otra)" : "que no procede") + ".");
        }
        incidencia.setFechaResolucion(LocalDateTime.now());
        if (incidencia.getEmpleadoResponsable() == null) {
            incidencia.setEmpleadoResponsable(usuarioActualService.obtenerEmpleado());
        }
        String que = incidencia.getEstado() == EstadoIncidencia.DUPLICADA ? "duplicada" : "sin procedencia";
        String mensaje = "Incidencia cerrada como " + que + ". "
                + (Boolean.TRUE.equals(incidencia.getBloqueaHabitacion())
                ? liberarSiNadaBloquea(habitacion, incidencia.getIdIncidencia())
                : "La habitacion no cambia.");
        IncidenciaMantenimiento g = incidenciaRepository.save(incidencia);
        return new ResultadoIncidencia(g, estadoDe(habitacion), null, mensaje);
    }

    /** La falla volvio: la incidencia cerrada vuelve a PENDIENTE (cuenta cuantas veces) y, si bloqueaba, bloquea de nuevo. */
    private ResultadoIncidencia reabrir(IncidenciaMantenimiento incidencia, String motivo) {
        if (motivo.isEmpty()) {
            throw new IllegalStateException("Cuenta que fallo de nuevo para poder reabrir la incidencia.");
        }
        short veces = incidencia.getVecesReabierta() == null ? 0 : incidencia.getVecesReabierta();
        incidencia.setVecesReabierta((short) (veces + 1));
        incidencia.setEstado(EstadoIncidencia.PENDIENTE);
        incidencia.setFechaResolucion(null);
        incidencia.setFechaInicioReparacion(null);
        incidencia.setEmpleadoResponsable(null);
        String previo = incidencia.getObservaciones() == null || incidencia.getObservaciones().isBlank()
                ? "" : incidencia.getObservaciones() + "\n";
        incidencia.setObservaciones(previo + "Reabierta " + LocalDateTime.now().format(FORMATO_FECHA) + ": " + motivo);
        Habitacion habitacion = incidencia.getHabitacion();
        String mensaje = "Incidencia reabierta (" + (veces + 1) + " vez/veces). "
                + (Boolean.TRUE.equals(incidencia.getBloqueaHabitacion())
                ? textoDeBloqueo(bloquear(habitacion))
                : "No bloquea la habitacion: sigue " + (habitacion != null ? habitacion.getEstadoOperativo() : "—") + ".");
        IncidenciaMantenimiento g = incidenciaRepository.save(incidencia);
        return new ResultadoIncidencia(g, estadoDe(habitacion), null, mensaje);
    }

    /** Sin destino elegido, una habitacion bloqueada va a limpieza (lo seguro: una reparacion puede dejar suciedad). */
    private static String destinoEfectivo(String destino, EstadoOperativoHab actual) {
        if (destino != null) {
            return destino;
        }
        return actual == EstadoOperativoHab.MANTENIMIENTO ? DESTINO_LIMPIEZA : "NINGUNO";
    }
}
