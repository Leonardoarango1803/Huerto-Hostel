package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.NuevaReservaRequest;
import pe.edu.utp.huertohostel.dto.ReservaWebRequest;
import pe.edu.utp.huertohostel.entity.CanalReserva;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.exception.PagoRechazadoException;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.PoliticaClaves;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Reserva del huesped desde la web publica (y desde su portal, con sesion).
 *
 * <p>Reglas acordadas para el canal web:
 * <ul>
 *   <li>La reserva se confirma solo si se paga el adelanto en el mismo paso: si la pasarela rechaza,
 *   la transaccion entera se deshace (no queda cuenta, reserva ni pago).</li>
 *   <li>El huesped elige el TIPO de habitacion; el sistema asigna la primera habitacion libre de ese
 *   tipo en esas fechas (activa, sin mantenimiento ni incidencia que la bloquee, sin cruce de fechas).</li>
 *   <li>El usuario del portal es el correo. Si el documento o el correo ya tienen cuenta, se pide
 *   iniciar sesion en vez de crear otra.</li>
 *   <li>El adelanto web es {@code app.reservas.adelanto-web-porcentaje} (30 % por defecto), y nunca
 *   menos que el adelanto minimo general si este esta encendido.</li>
 *   <li>El pago web no entra a la caja: lo hace el huesped, como en el portal.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class ReservaWebService {

    static final int MAX_NOCHES = 30;
    static final int MAX_DIAS_ANTICIPACION = 365;
    private static final List<EstadoReserva> NO_OCUPAN = List.of(EstadoReserva.CANCELADA, EstadoReserva.COMPLETADA);
    private static final Pattern CORREO = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern CODIGO_YAPE = Pattern.compile("^[0-9A-Za-z-]{4,30}$");

    private final TipoHabitacionRepository tipoRepository;
    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final PagoRepository pagoRepository;
    private final ReservaService reservaService;
    private final PagoService pagoService;
    private final AccesoPortalService accesoPortalService;
    private final UsuarioActualService usuarioActualService;
    private final BloqueoPorIncidencia bloqueoPorIncidencia;
    private final Clock clock;
    private final int adelantoWebPorcentaje;

    public ReservaWebService(TipoHabitacionRepository tipoRepository,
                             HabitacionRepository habitacionRepository,
                             ReservaRepository reservaRepository,
                             ClienteRepository clienteRepository,
                             UsuarioRepository usuarioRepository,
                             PagoRepository pagoRepository,
                             ReservaService reservaService,
                             PagoService pagoService,
                             AccesoPortalService accesoPortalService,
                             UsuarioActualService usuarioActualService,
                             BloqueoPorIncidencia bloqueoPorIncidencia,
                             Clock clock,
                             @Value("${app.reservas.adelanto-web-porcentaje:30}") int adelantoWebPorcentaje,
                             @Value("${app.reservas.adelanto-minimo-porcentaje:0}") int adelantoMinimoPorcentaje) {
        this.tipoRepository = tipoRepository;
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.pagoRepository = pagoRepository;
        this.reservaService = reservaService;
        this.pagoService = pagoService;
        this.accesoPortalService = accesoPortalService;
        this.usuarioActualService = usuarioActualService;
        this.bloqueoPorIncidencia = bloqueoPorIncidencia;
        this.clock = clock;
        this.adelantoWebPorcentaje = Math.min(100, Math.max(Math.max(adelantoWebPorcentaje, adelantoMinimoPorcentaje), 1));
    }

    // ---------------------------------------------------------------- Consultas publicas

    /** Tipos de habitacion que se ofrecen en la web (activos y con al menos una habitacion activa). */
    public List<Map<String, Object>> tiposPublicos() {
        Map<Integer, List<Habitacion>> porTipo = habitacionesActivasPorTipo();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (TipoHabitacion t : tiposActivos()) {
            int habitaciones = porTipo.getOrDefault(t.getIdTipoHabitacion(), List.of()).size();
            if (habitaciones == 0) {
                continue;
            }
            Map<String, Object> m = datosTipo(t);
            m.put("habitaciones", habitaciones);
            lista.add(m);
        }
        return lista;
    }

    /**
     * Que tipos tienen habitaciones libres en esas fechas, con el precio total y el adelanto.
     * Son 4 consultas sin importar cuantas habitaciones haya (la base esta en otra region: una consulta por
     * habitacion tardaba varios segundos).
     */
    public Map<String, Object> disponibilidad(LocalDate llegada, LocalDate salida, Integer huespedes) {
        long noches = validarFechas(llegada, salida);
        int personas = huespedes == null || huespedes < 1 ? 1 : huespedes;

        Map<Integer, List<Habitacion>> porTipo = habitacionesActivasPorTipo();
        java.util.Set<Integer> conCruce = new java.util.HashSet<>(reservaRepository.findHabitacionesConCruce(llegada, salida, NO_OCUPAN));
        java.util.Set<Integer> bloqueadas = bloqueoPorIncidencia.habitacionesBloqueadas();

        List<Map<String, Object>> tipos = new ArrayList<>();
        for (TipoHabitacion t : tiposActivos()) {
            List<Habitacion> activas = porTipo.getOrDefault(t.getIdTipoHabitacion(), List.of());
            if (activas.isEmpty()) {
                continue;
            }
            long libres = activas.stream()
                    .filter(h -> h.getEstadoOperativo() != EstadoOperativoHab.MANTENIMIENTO)
                    .filter(h -> !bloqueadas.contains(h.getIdHabitacion()) && !conCruce.contains(h.getIdHabitacion()))
                    .count();
            BigDecimal total = t.getPrecioNoche().multiply(BigDecimal.valueOf(noches));
            BigDecimal adelanto = adelantoDe(total);

            Map<String, Object> m = datosTipo(t);
            m.put("disponibles", libres);
            m.put("cabe", t.getCapacidadPersonas() == null || t.getCapacidadPersonas() >= personas);
            m.put("total", total);
            m.put("adelanto", adelanto);
            m.put("saldo", total.subtract(adelanto));
            tipos.add(m);
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("llegada", llegada);
        r.put("salida", salida);
        r.put("noches", noches);
        r.put("huespedes", personas);
        r.put("adelantoPorcentaje", adelantoWebPorcentaje);
        r.put("tipos", tipos);
        return r;
    }

    // ---------------------------------------------------------------- Reservar

    /** Web publica: crea (o reutiliza) el cliente, su cuenta del portal, la reserva y el pago del adelanto. */
    @Transactional
    public Map<String, Object> reservarComoNuevo(ReservaWebRequest req) {
        validarDatosPersonales(req);
        String correo = req.getCorreo().trim().toLowerCase(Locale.ROOT);
        String documento = req.getNumeroDocumento().trim();
        PoliticaClaves.validar(req.getPassword(), correo);

        if (usuarioRepository.existsByUsername(correo)) {
            throw new IllegalStateException("Ese correo ya tiene una cuenta. Inicia sesión para reservar desde tu portal.");
        }

        Cliente cliente = clienteRepository.findByNumeroDocumento(documento).orElse(null);
        if (cliente != null) {
            if (usuarioRepository.findByClienteIdCliente(cliente.getIdCliente()).isPresent()) {
                throw new IllegalStateException("Ya tienes una cuenta con este documento. Inicia sesión para reservar desde tu portal.");
            }
            // Huesped que ya vino antes (recepcion lo registro): se reutiliza y se completan sus datos de contacto.
            if (cliente.getCorreo() == null || cliente.getCorreo().isBlank()) {
                exigirCorreoLibre(correo);
                cliente.setCorreo(correo);
            } else if (!cliente.getCorreo().equalsIgnoreCase(correo)) {
                exigirCorreoLibre(correo);
                cliente.setCorreo(correo);
            }
            if (req.getTelefono() != null && !req.getTelefono().isBlank()) {
                cliente.setTelefono(req.getTelefono().trim());
            }
        } else {
            exigirCorreoLibre(correo);
            cliente = new Cliente();
            cliente.setTipoDocumento(normalizarTipoDocumento(req.getTipoDocumento()));
            cliente.setNumeroDocumento(documento);
            cliente.setNombres(req.getNombres().trim());
            cliente.setApellidos(req.getApellidos().trim());
            cliente.setCorreo(correo);
            cliente.setTelefono(req.getTelefono() == null ? null : req.getTelefono().trim());
            cliente.setEstado(true);
            cliente.setFechaRegistro(LocalDateTime.now(clock));
        }
        cliente = clienteRepository.save(cliente);

        accesoPortalService.crear(cliente.getIdCliente(), correo, req.getPassword());

        Map<String, Object> r = reservar(cliente, req);
        r.put("usuario", correo);
        return r;
    }

    /** Portal: el huesped con sesion reserva otra vez sin volver a registrarse. */
    @Transactional
    public Map<String, Object> reservarComoCliente(ReservaWebRequest req) {
        Cliente cliente = usuarioActualService.obtenerCliente();
        return reservar(cliente, req);
    }

    /** Portal: las reservas del huesped, de la mas reciente a la mas antigua, con lo pagado y el saldo. */
    public List<Map<String, Object>> misReservas() {
        Cliente cliente = usuarioActualService.obtenerCliente();
        List<Reserva> reservas = new ArrayList<>(reservaRepository.findByClienteIdCliente(cliente.getIdCliente()));
        reservas.sort(Comparator.comparing(Reserva::getFechaCheckinPrevisto, Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        List<Map<String, Object>> lista = new ArrayList<>();
        for (Reserva r : reservas) {
            BigDecimal pagado = pagoRepository.findDeReservaOSuEstadia(r.getIdReserva()).stream()
                    .map(Pago::getMonto).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal total = Optional.ofNullable(r.getMontoAlojamientoTotal()).orElse(BigDecimal.ZERO);
            Habitacion h = r.getHabitacion();

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idReserva", r.getIdReserva());
            m.put("codigo", codigo(r));
            m.put("estado", r.getEstadoReserva());
            m.put("canal", r.getCanalReserva());
            m.put("llegada", r.getFechaCheckinPrevisto());
            m.put("salida", r.getFechaCheckoutPrevisto());
            m.put("noches", r.getNumNoches());
            m.put("habitacion", h != null ? h.getNumero() : null);
            m.put("tipo", h != null && h.getTipoHabitacion() != null ? h.getTipoHabitacion().getNombre() : null);
            m.put("total", total);
            m.put("pagado", pagado);
            m.put("saldo", total.subtract(pagado).max(BigDecimal.ZERO));
            lista.add(m);
        }
        return lista;
    }

    // ---------------------------------------------------------------- Interno

    private Map<String, Object> reservar(Cliente cliente, ReservaWebRequest req) {
        if (req.getIdTipoHabitacion() == null) {
            throw new IllegalArgumentException("Elige un tipo de habitación.");
        }
        long noches = validarFechas(req.getLlegada(), req.getSalida());
        TipoHabitacion tipo = tipoRepository.findById(req.getIdTipoHabitacion())
                .filter(t -> !Boolean.FALSE.equals(t.getEstado()))
                .orElseThrow(() -> new EntityNotFoundException("Ese tipo de habitación no está disponible."));
        int personas = req.getHuespedes() == null || req.getHuespedes() < 1 ? 1 : req.getHuespedes();
        if (tipo.getCapacidadPersonas() != null && personas > tipo.getCapacidadPersonas()) {
            throw new IllegalStateException("Esta habitación es para hasta " + tipo.getCapacidadPersonas()
                    + " personas. Elige otra o divide el grupo en dos habitaciones.");
        }
        String metodo = req.getMetodoPago() == null ? "" : req.getMetodoPago().trim().toUpperCase(Locale.ROOT);
        if (!metodo.equals("TARJETA") && !metodo.equals("YAPE")) {
            throw new IllegalArgumentException("Elige cómo pagar el adelanto: tarjeta o Yape/Plin.");
        }
        if (metodo.equals("YAPE") && (req.getCodigoOperacion() == null
                || !CODIGO_YAPE.matcher(req.getCodigoOperacion().trim()).matches())) {
            throw new IllegalArgumentException("Ingresa el código de operación que te muestra la app de Yape o Plin.");
        }

        Habitacion habitacion = asignarHabitacion(tipo, req.getLlegada(), req.getSalida());

        // La pasarela responde antes de escribir la reserva: si rechaza, no queda nada (y lo ya escrito se deshace).
        String codigoOperacion = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        if (req.isSimularRechazo()) {
            throw new PagoRechazadoException("Tu banco no aprobó el pago. No se cobró nada.", codigoOperacion);
        }

        NuevaReservaRequest nr = new NuevaReservaRequest();
        nr.setIdCliente(cliente.getIdCliente());
        nr.setIdHabitacion(habitacion.getIdHabitacion());
        nr.setFechaCheckinPrevisto(req.getLlegada());
        nr.setFechaCheckoutPrevisto(req.getSalida());
        nr.setCanalReserva(CanalReserva.ONLINE);
        nr.setObservaciones(observaciones(personas, req.getHoraLlegada()));
        Reserva reserva = reservaService.registrar(nr);

        BigDecimal total = reserva.getMontoAlojamientoTotal();
        BigDecimal adelanto = adelantoDe(total);

        Pago pago = new Pago();
        pago.setReserva(reserva);
        pago.setMonto(adelanto);
        pago.setConcepto(ConceptoPago.ADELANTO_RESERVA);
        if (metodo.equals("TARJETA")) {
            pago.setMetodoPago(MetodoPago.PASARELA_ONLINE);
            pago.setNumTransaccionComprobante(codigoOperacion);
        } else {
            pago.setMetodoPago(MetodoPago.TRANSFERENCIA);
            pago.setNumTransaccionComprobante("YAPE-" + req.getCodigoOperacion().trim());
        }
        pagoService.registrarPagoWeb(pago);

        reserva.setEstadoReserva(EstadoReserva.CONFIRMADA);
        reservaRepository.save(reserva);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("idReserva", reserva.getIdReserva());
        r.put("codigo", codigo(reserva));
        r.put("estado", reserva.getEstadoReserva());
        r.put("tipo", tipo.getNombre());
        r.put("habitacion", habitacion.getNumero());
        r.put("llegada", reserva.getFechaCheckinPrevisto());
        r.put("salida", reserva.getFechaCheckoutPrevisto());
        r.put("noches", noches);
        r.put("total", total);
        r.put("adelanto", adelanto);
        r.put("saldo", total.subtract(adelanto));
        r.put("codigoOperacion", pago.getNumTransaccionComprobante());
        r.put("correo", cliente.getCorreo());
        return r;
    }

    /** Primera habitacion libre del tipo, con su fila bloqueada y el cruce de fechas revisado otra vez. */
    private Habitacion asignarHabitacion(TipoHabitacion tipo, LocalDate llegada, LocalDate salida) {
        List<Habitacion> candidatas = habitacionRepository
                .findByTipoHabitacionIdTipoHabitacionAndEstadoTrueOrderByNumeroAsc(tipo.getIdTipoHabitacion());
        for (Habitacion h : candidatas) {
            if (!estaLibre(h, llegada, salida)) {
                continue;
            }
            Habitacion bloqueada = habitacionRepository.findByIdParaActualizar(h.getIdHabitacion()).orElse(null);
            if (bloqueada != null && estaLibre(bloqueada, llegada, salida)) {
                return bloqueada;
            }
        }
        throw new IllegalStateException("Ya no quedan habitaciones " + tipo.getNombre()
                + " libres en esas fechas. Prueba otras fechas u otro tipo.");
    }

    boolean estaLibre(Habitacion h, LocalDate llegada, LocalDate salida) {
        if (Boolean.FALSE.equals(h.getEstado()) || h.getEstadoOperativo() == EstadoOperativoHab.MANTENIMIENTO) {
            return false;
        }
        if (bloqueoPorIncidencia.hayBloqueo(h.getIdHabitacion())) {
            return false;
        }
        return reservaRepository.findConflictos(h.getIdHabitacion(), llegada, salida, NO_OCUPAN).isEmpty();
    }

    long validarFechas(LocalDate llegada, LocalDate salida) {
        if (llegada == null || salida == null) {
            throw new IllegalArgumentException("Indica las fechas de llegada y salida.");
        }
        LocalDate hoy = LocalDate.now(clock);
        if (llegada.isBefore(hoy)) {
            throw new IllegalArgumentException("La fecha de llegada no puede ser anterior a hoy.");
        }
        if (llegada.isAfter(hoy.plusDays(MAX_DIAS_ANTICIPACION))) {
            throw new IllegalArgumentException("Solo se puede reservar con hasta un año de anticipación.");
        }
        long noches = ChronoUnit.DAYS.between(llegada, salida);
        if (noches <= 0) {
            throw new IllegalArgumentException("La salida debe ser al menos un día después de la llegada.");
        }
        if (noches > MAX_NOCHES) {
            throw new IllegalArgumentException("Por la web se puede reservar hasta " + MAX_NOCHES
                    + " noches. Para estadías más largas escríbenos.");
        }
        return noches;
    }

    BigDecimal adelantoDe(BigDecimal total) {
        return total.multiply(BigDecimal.valueOf(adelantoWebPorcentaje))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private void validarDatosPersonales(ReservaWebRequest req) {
        if (vacio(req.getNumeroDocumento()) || vacio(req.getNombres()) || vacio(req.getApellidos())) {
            throw new IllegalArgumentException("Completa tu documento, nombres y apellidos.");
        }
        String doc = req.getNumeroDocumento().trim();
        String tipo = normalizarTipoDocumento(req.getTipoDocumento());
        if (tipo.equals("DNI") && !doc.matches("\\d{8}")) {
            throw new IllegalArgumentException("El DNI debe tener 8 dígitos.");
        }
        if (!doc.matches("[0-9A-Za-z]{6,20}")) {
            throw new IllegalArgumentException("Revisa el número de documento.");
        }
        if (vacio(req.getCorreo()) || !CORREO.matcher(req.getCorreo().trim()).matches()) {
            throw new IllegalArgumentException("Ingresa un correo válido: será tu usuario del portal.");
        }
    }

    private void exigirCorreoLibre(String correo) {
        if (clienteRepository.existsByCorreoIgnoreCase(correo)) {
            throw new IllegalStateException("Ese correo ya está registrado con otro documento. Usa otro correo o escríbenos.");
        }
    }

    private static String normalizarTipoDocumento(String tipo) {
        if (tipo == null || tipo.isBlank()) return "DNI";
        String t = tipo.trim().toUpperCase(Locale.ROOT);
        return switch (t) {
            case "DNI", "CE", "PASAPORTE" -> t;
            case "CARNE DE EXTRANJERIA", "CARNÉ DE EXTRANJERÍA" -> "CE";
            default -> t.length() > 20 ? t.substring(0, 20) : t;
        };
    }

    private static String observaciones(int personas, String horaLlegada) {
        String texto = "Reserva web · " + personas + (personas == 1 ? " huésped" : " huéspedes");
        if (horaLlegada != null && !horaLlegada.isBlank()) {
            String hora = horaLlegada.trim();
            texto += " · llegada aprox.: " + (hora.length() > 60 ? hora.substring(0, 60) : hora);
        }
        return texto;
    }

    private static String codigo(Reserva r) {
        return String.format("RES-%06d", r.getIdReserva());
    }

    private static boolean vacio(String s) {
        return s == null || s.isBlank();
    }

    private Map<Integer, List<Habitacion>> habitacionesActivasPorTipo() {
        Map<Integer, List<Habitacion>> porTipo = new java.util.HashMap<>();
        for (Habitacion h : habitacionRepository.findAll()) {
            if (Boolean.FALSE.equals(h.getEstado()) || h.getTipoHabitacion() == null) {
                continue;
            }
            porTipo.computeIfAbsent(h.getTipoHabitacion().getIdTipoHabitacion(), k -> new ArrayList<>()).add(h);
        }
        return porTipo;
    }

    private List<TipoHabitacion> tiposActivos() {
        List<TipoHabitacion> tipos = new ArrayList<>(tipoRepository.findAll());
        tipos.removeIf(t -> Boolean.FALSE.equals(t.getEstado()) || t.getPrecioNoche() == null);
        tipos.sort(Comparator.comparing(TipoHabitacion::getPrecioNoche));
        return tipos;
    }

    private static Map<String, Object> datosTipo(TipoHabitacion t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idTipoHabitacion", t.getIdTipoHabitacion());
        m.put("nombre", t.getNombre());
        m.put("descripcion", t.getDescripcion());
        m.put("capacidad", t.getCapacidadPersonas());
        m.put("precioNoche", t.getPrecioNoche());
        return m;
    }
}
