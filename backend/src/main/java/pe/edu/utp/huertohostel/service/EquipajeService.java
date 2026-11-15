package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEquipaje;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.SolicitudEquipaje;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.SolicitudEquipajeRepository;
import pe.edu.utp.huertohostel.security.Roles;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Equipaje del huesped (tabla solicitud_equipaje, del diseno original V2, que no se usaba):
 * <ul>
 *   <li><b>SUBIDA / BAJADA</b>: llevar o bajar maletas. La pide el huesped desde su portal o recepcion en el mostrador;
 *   la atiende limpieza o recepcion. PENDIENTE -> ASIGNADA (alguien la toma) -> EN_ATENCION -> ATENDIDA, o CANCELADA.</li>
 *   <li><b>CUSTODIA</b>: el huesped deja maletas guardadas (tipicamente tras el check-out, hasta la hora de su bus). La
 *   registra recepcion y nace EN_ATENCION = "en custodia"; al devolverlas pasa a ATENDIDA = "entregado". Se identifica
 *   con un codigo EQ-00012 que se le da al huesped. Solo recepcion recibe y entrega maletas.</li>
 * </ul>
 * No mueve dinero ni cambia estados de habitacion. Responde mapas planos (sin exponer la estadia completa al portal).
 */
@Service
@Transactional(readOnly = true)
public class EquipajeService {

    public static final String SUBIDA = "SUBIDA";
    public static final String BAJADA = "BAJADA";
    public static final String CUSTODIA = "CUSTODIA";

    static final List<EstadoEquipaje> ABIERTAS = List.of(EstadoEquipaje.PENDIENTE, EstadoEquipaje.ASIGNADA, EstadoEquipaje.EN_ATENCION);
    /** Dias despues del check-out en que aun se reciben maletas en custodia. */
    static final int DIAS_CUSTODIA_TRAS_SALIDA = 2;
    static final int MAX_BULTOS = 20;
    static final int MAX_DESCRIPCION = 300;

    private final SolicitudEquipajeRepository repository;
    private final EstadiaRepository estadiaRepository;
    private final UsuarioActualService usuarioActual;
    private final Clock clock;

    public EquipajeService(SolicitudEquipajeRepository repository, EstadiaRepository estadiaRepository,
                           UsuarioActualService usuarioActual, Clock clock) {
        this.repository = repository;
        this.estadiaRepository = estadiaRepository;
        this.usuarioActual = usuarioActual;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- personal

    /** Abiertas (por atender y en custodia) o, con historial, las ultimas 60 de todo tipo. */
    public List<Map<String, Object>> listar(boolean historial) {
        List<SolicitudEquipaje> lista = historial
                ? repository.findTop60ByOrderByFechaSolicitudDesc()
                : repository.findByEstadoInOrderByFechaSolicitudAsc(ABIERTAS);
        return lista.stream().map(EquipajeService::vista).toList();
    }

    /** Estadias a las que se les puede registrar equipaje: en curso, o que salieron hace poco (custodia). */
    public List<Map<String, Object>> estadiasDisponibles() {
        LocalDateTime limite = LocalDateTime.now(clock).minusDays(DIAS_CUSTODIA_TRAS_SALIDA);
        List<Estadia> estadias = new ArrayList<>(estadiaRepository.findByEstadoEstadia(EstadoEstadia.EN_CURSO));
        estadiaRepository.findByEstadoEstadia(EstadoEstadia.FINALIZADA).stream()
                .filter(e -> e.getFechaCheckoutReal() != null && e.getFechaCheckoutReal().isAfter(limite))
                .forEach(estadias::add);
        return estadias.stream()
                .sorted(Comparator.comparing((Estadia e) -> e.getHabitacion() != null ? e.getHabitacion().getNumero() : ""))
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("idEstadia", e.getIdEstadia());
                    m.put("habitacion", e.getHabitacion() != null ? e.getHabitacion().getNumero() : null);
                    m.put("huesped", nombre(e));
                    m.put("estado", e.getEstadoEstadia());
                    m.put("fechaCheckoutReal", e.getFechaCheckoutReal());
                    return m;
                })
                .toList();
    }

    /** Recepcion registra en el mostrador una custodia o un pedido de subida/bajada. */
    @Transactional
    public Map<String, Object> registrar(Integer idEstadia, String tipo, Integer bultos, String descripcion) {
        String t = normalizarTipo(tipo, true);
        Estadia estadia = estadiaRepository.findById(idEstadia == null ? -1 : idEstadia)
                .orElseThrow(() -> new EntityNotFoundException("Estadía no encontrada."));
        SolicitudEquipaje s = new SolicitudEquipaje();
        s.setEstadia(estadia);
        s.setTipoSolicitud(t);
        s.setFechaSolicitud(LocalDateTime.now(clock));
        if (CUSTODIA.equals(t)) {
            validarEstadiaParaCustodia(estadia);
            if (bultos == null || bultos < 1 || bultos > MAX_BULTOS) {
                throw new IllegalArgumentException("Indica cuántos bultos se guardan (1 a " + MAX_BULTOS + ").");
            }
            s.setDescripcion(bultos + (bultos == 1 ? " bulto" : " bultos") + textoOpcional(descripcion));
            s.setEstado(EstadoEquipaje.EN_ATENCION); // ya estan guardadas: quien las recibio es el responsable
            s.setEmpleadoAsignado(usuarioActual.obtenerEmpleado());
        } else {
            validarEnCurso(estadia);
            evitarDuplicado(estadia, t);
            s.setDescripcion(textoLimpio(descripcion));
            s.setEstado(EstadoEquipaje.PENDIENTE);
        }
        return vista(repository.save(s));
    }

    @Transactional
    public Map<String, Object> cambiarEstado(@NonNull Integer id, EstadoEquipaje nuevo) {
        if (nuevo == null) {
            throw new IllegalArgumentException("Indica el nuevo estado.");
        }
        SolicitudEquipaje s = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Solicitud de equipaje no encontrada."));
        EstadoEquipaje actual = s.getEstado();
        if (actual == EstadoEquipaje.ATENDIDA || actual == EstadoEquipaje.CANCELADA) {
            throw new IllegalStateException("Esta solicitud ya está cerrada.");
        }
        if (CUSTODIA.equals(s.getTipoSolicitud())) {
            // Equipaje guardado: solo se entrega (o se anula si se registro por error), y solo lo hace recepcion.
            if (nuevo != EstadoEquipaje.ATENDIDA && nuevo != EstadoEquipaje.CANCELADA) {
                throw new IllegalStateException("El equipaje en custodia solo se entrega al huésped.");
            }
            if (!usuarioActual.tieneRol(Roles.ADMINISTRADOR) && !usuarioActual.tieneRol(Roles.RECEPCIONISTA)) {
                throw new AccessDeniedException("Solo recepción entrega el equipaje en custodia.");
            }
        } else if (nuevo.ordinal() < actual.ordinal() && nuevo != EstadoEquipaje.CANCELADA) {
            throw new IllegalStateException("La solicitud ya avanzó; no puede volver atrás.");
        }
        s.setEstado(nuevo);
        if (nuevo == EstadoEquipaje.ASIGNADA || nuevo == EstadoEquipaje.EN_ATENCION) {
            s.setEmpleadoAsignado(usuarioActual.obtenerEmpleado());
        } else if (nuevo == EstadoEquipaje.ATENDIDA) {
            s.setFechaAtencion(LocalDateTime.now(clock));
            // En custodia el responsable sigue siendo quien recibio las maletas; en subida/bajada, quien la atendio.
            if (s.getEmpleadoAsignado() == null) {
                s.setEmpleadoAsignado(usuarioActual.empleadoOpcional());
            }
        }
        return vista(repository.save(s));
    }

    // ---------------------------------------------------------------- portal

    /** Todo el equipaje del huesped, tambien la custodia despues de salir. */
    public List<Map<String, Object>> deHuesped() {
        Cliente c = usuarioActual.obtenerCliente();
        return repository.findByEstadiaReservaClienteIdClienteOrderByFechaSolicitudDesc(c.getIdCliente()).stream()
                .map(EquipajeService::vista).toList();
    }

    /** El huesped alojado pide que le suban o bajen las maletas. La custodia se pide en recepcion. */
    @Transactional
    public Map<String, Object> pedirDesdePortal(String tipo, String descripcion) {
        String t = normalizarTipo(tipo, false);
        Cliente c = usuarioActual.obtenerCliente();
        List<Estadia> activas = estadiaRepository.findByClienteAndEstado(c.getIdCliente(), EstadoEstadia.EN_CURSO);
        if (activas.isEmpty()) {
            throw new IllegalStateException("Necesitas estar alojado para pedir ayuda con tu equipaje.");
        }
        Estadia estadia = activas.get(0);
        evitarDuplicado(estadia, t);
        SolicitudEquipaje s = new SolicitudEquipaje();
        s.setEstadia(estadia);
        s.setTipoSolicitud(t);
        s.setDescripcion(textoLimpio(descripcion));
        s.setEstado(EstadoEquipaje.PENDIENTE);
        s.setFechaSolicitud(LocalDateTime.now(clock));
        return vista(repository.save(s));
    }

    // ---------------------------------------------------------------- reglas

    private static String normalizarTipo(String tipo, boolean permiteCustodia) {
        String t = tipo == null ? "" : tipo.trim().toUpperCase(Locale.ROOT);
        Set<String> validos = permiteCustodia ? Set.of(SUBIDA, BAJADA, CUSTODIA) : Set.of(SUBIDA, BAJADA);
        if (!validos.contains(t)) {
            throw new IllegalArgumentException(permiteCustodia
                    ? "Tipo de solicitud inválido: usa SUBIDA, BAJADA o CUSTODIA."
                    : "Desde el portal puedes pedir que suban o bajen tu equipaje. Para guardarlo, acércate a recepción.");
        }
        return t;
    }

    private static void validarEnCurso(Estadia e) {
        if (e.getEstadoEstadia() != EstadoEstadia.EN_CURSO) {
            throw new IllegalStateException("La estadía ya terminó: solo se puede guardar su equipaje en custodia.");
        }
    }

    private void validarEstadiaParaCustodia(Estadia e) {
        if (e.getEstadoEstadia() == EstadoEstadia.EN_CURSO) return;
        LocalDateTime limite = LocalDateTime.now(clock).minusDays(DIAS_CUSTODIA_TRAS_SALIDA);
        if (e.getFechaCheckoutReal() == null || e.getFechaCheckoutReal().isBefore(limite)) {
            throw new IllegalStateException("Esa estadía terminó hace más de " + DIAS_CUSTODIA_TRAS_SALIDA
                    + " días: no se recibe equipaje en custodia.");
        }
    }

    private void evitarDuplicado(Estadia e, String tipo) {
        if (repository.existsByEstadiaIdEstadiaAndTipoSolicitudAndEstadoIn(e.getIdEstadia(), tipo, ABIERTAS)) {
            throw new IllegalStateException("Ya hay un pedido de " + (SUBIDA.equals(tipo) ? "subida" : "bajada")
                    + " de equipaje en curso para esta habitación.");
        }
    }

    private static String textoLimpio(String s) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        if (t.length() > MAX_DESCRIPCION) {
            throw new IllegalArgumentException("La descripción puede tener hasta " + MAX_DESCRIPCION + " caracteres.");
        }
        return t;
    }

    private static String textoOpcional(String s) {
        String t = textoLimpio(s);
        return t == null ? "" : " · " + t;
    }

    static String codigo(Integer id) {
        return String.format("EQ-%05d", id);
    }

    private static String nombre(Estadia e) {
        if (e.getReserva() == null || e.getReserva().getCliente() == null) return null;
        Cliente c = e.getReserva().getCliente();
        return ((c.getNombres() == null ? "" : c.getNombres()) + " " + (c.getApellidos() == null ? "" : c.getApellidos())).trim();
    }

    static Map<String, Object> vista(SolicitudEquipaje s) {
        Map<String, Object> m = new LinkedHashMap<>();
        Estadia e = s.getEstadia();
        m.put("idSolicitud", s.getIdSolicitud());
        m.put("codigo", s.getIdSolicitud() != null ? codigo(s.getIdSolicitud()) : null);
        m.put("tipo", s.getTipoSolicitud());
        m.put("descripcion", s.getDescripcion());
        m.put("estado", s.getEstado());
        m.put("fechaSolicitud", s.getFechaSolicitud());
        m.put("fechaAtencion", s.getFechaAtencion());
        m.put("idEstadia", e != null ? e.getIdEstadia() : null);
        m.put("estadoEstadia", e != null ? e.getEstadoEstadia() : null);
        m.put("habitacion", e != null && e.getHabitacion() != null ? e.getHabitacion().getNumero() : null);
        m.put("huesped", e != null ? nombre(e) : null);
        Empleado emp = s.getEmpleadoAsignado();
        m.put("responsable", emp != null ? ((emp.getNombres() == null ? "" : emp.getNombres()) + " "
                + (emp.getApellidos() == null ? "" : emp.getApellidos())).trim() : null);
        return m;
    }
}
