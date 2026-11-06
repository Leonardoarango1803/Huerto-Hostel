package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.ConsumoAnulado;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.OrigenTareaLimpieza;
import pe.edu.utp.huertohostel.entity.EstadoComanda;
import pe.edu.utp.huertohostel.entity.EstadoSolicitud;
import pe.edu.utp.huertohostel.repository.ComandaRepository;
import pe.edu.utp.huertohostel.repository.MovimientoCajaRepository;
import pe.edu.utp.huertohostel.repository.SolicitudServicioRepository;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.repository.ConsumoAnuladoRepository;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.ProductoRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;

@Service
@Transactional(readOnly = true)
public class EstadiaService {

    private final EstadiaRepository estadiaRepository;
    private final ConsumoEstadiaRepository consumoEstadiaRepository;
    private final PagoRepository pagoRepository;
    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final LimpiezaService limpiezaService;
    private final PagoService pagoService;
    private final CajaService cajaService;
    private final InventarioService inventarioService;
    private final BloqueoPorIncidencia bloqueoPorIncidencia;
    private final UsuarioActualService usuarioActualService;
    private final ProductoRepository productoRepository;
    private final ConsumoAnuladoRepository consumoAnuladoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final ComandaRepository comandaRepository;
    private final SolicitudServicioRepository solicitudRepository;
    private final AuditoriaGestionService auditoriaService;

    /** Tope de unidades por linea de consumo y de lineas por registro: evita errores de tecleo. */
    static final int MAXIMO_CANTIDAD = 99;
    static final int MAXIMO_LINEAS = 30;
    private static final int LARGO_MOTIVO = 200;

    public record ItemConsumo(Integer idProducto, Integer cantidad) {
    }

    /**
     * Decisiones de quien hace la salida. {@code ajustarNoches}: cobrar las noches realmente usadas (menos si se va antes,
     * mas si se quedo de mas). {@code devolverSaldo}: devolver en efectivo el saldo a favor del huesped. {@code forzar}: solo el
     * administrador, salir con saldo pendiente (queda como deuda registrada) y con {@code motivo} obligatorio.
     */
    public record OpcionesCheckout(boolean ajustarNoches, boolean devolverSaldo, boolean forzar, String motivo) {
        public static final OpcionesCheckout NINGUNA = new OpcionesCheckout(false, false, false, null);
    }

    /** Cuentas del folio: lo que se cobra (alojamiento + consumos) contra lo que se recibio, menos lo ya devuelto. */
    private record Folio(BigDecimal alojamiento, BigDecimal consumos, BigDecimal pagos, BigDecimal devuelto) {
        BigDecimal saldo() {
            return alojamiento.add(consumos).subtract(pagos).add(devuelto);
        }
    }

    /** Lo registrado y los avisos (por ejemplo, stock que no alcanzo para la receta). */
    public record ResultadoConsumos(List<ConsumoEstadia> consumos, List<String> advertencias) {
    }

    public EstadiaService(EstadiaRepository estadiaRepository,
                          ConsumoEstadiaRepository consumoEstadiaRepository,
                          PagoRepository pagoRepository,
                          HabitacionRepository habitacionRepository,
                          ReservaRepository reservaRepository,
                          LimpiezaService limpiezaService,
                          PagoService pagoService,
                          CajaService cajaService,
                          InventarioService inventarioService,
                          UsuarioActualService usuarioActualService,
                          BloqueoPorIncidencia bloqueoPorIncidencia,
                          ProductoRepository productoRepository,
                          ConsumoAnuladoRepository consumoAnuladoRepository,
                          MovimientoCajaRepository movimientoCajaRepository,
                          ComandaRepository comandaRepository,
                          SolicitudServicioRepository solicitudRepository,
                          AuditoriaGestionService auditoriaService) {
        this.movimientoCajaRepository = movimientoCajaRepository;
        this.comandaRepository = comandaRepository;
        this.solicitudRepository = solicitudRepository;
        this.auditoriaService = auditoriaService;
        this.productoRepository = productoRepository;
        this.consumoAnuladoRepository = consumoAnuladoRepository;
        this.bloqueoPorIncidencia = bloqueoPorIncidencia;
        this.inventarioService = inventarioService;
        this.usuarioActualService = usuarioActualService;
        this.estadiaRepository = estadiaRepository;
        this.consumoEstadiaRepository = consumoEstadiaRepository;
        this.pagoRepository = pagoRepository;
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
        this.limpiezaService = limpiezaService;
        this.pagoService = pagoService;
        this.cajaService = cajaService;
    }

    public List<Estadia> listarTodas() {
        return estadiaRepository.findAll();
    }

    public List<Estadia> listarPorEstado(EstadoEstadia estado) {
        return estadiaRepository.findByEstadoEstadia(estado);
    }

    public Estadia obtenerPorId(@NonNull Integer id) {
        return estadiaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Estadia no encontrada con id: " + id));
    }

    public List<ConsumoEstadia> listarConsumos(@NonNull Integer idEstadia) {
        obtenerPorId(idEstadia);
        return consumoEstadiaRepository.findByEstadiaIdEstadia(idEstadia);
    }

    /**
     * Numeros de la pantalla de salidas. Todo sale de consultas agregadas (no se recorre estadia por estadia ni se cargan
     * todos los pagos): {@code saldos} trae el saldo de cada estadia en curso para pintar la lista de una vez.
     */
    public Map<String, Object> resumenCheckout() {
        LocalDate hoy = LocalDate.now();
        List<Estadia> activas = estadiaRepository.findByEstadoEstadia(EstadoEstadia.EN_CURSO);

        long salidaHoy = activas.stream()
                .filter(e -> hoy.equals(e.getReserva().getFechaCheckoutPrevisto()))
                .count();
        long vencidas = activas.stream()
                .filter(e -> e.getReserva().getFechaCheckoutPrevisto() != null
                        && e.getReserva().getFechaCheckoutPrevisto().isBefore(hoy))
                .count();

        Map<Integer, BigDecimal> saldos = new HashMap<>();
        BigDecimal pendienteCobro = BigDecimal.ZERO;
        for (Object[] fila : estadiaRepository.saldosPorEstado(EstadoEstadia.EN_CURSO)) {
            BigDecimal saldo = ((BigDecimal) fila[1]).setScale(2, RoundingMode.HALF_UP);
            saldos.put((Integer) fila[0], saldo);
            if (saldo.signum() > 0) {
                pendienteCobro = pendienteCobro.add(saldo);
            }
        }

        BigDecimal liquidadoHoy = pagoRepository.sumConceptoEntre(pe.edu.utp.huertohostel.entity.ConceptoPago.LIQUIDACION_CHECKOUT,
                hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay());

        long aCuartoLimpieza = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);

        long salidasConDeuda = 0;
        BigDecimal deuda = BigDecimal.ZERO;
        List<Object[]> forzadas = estadiaRepository.deudaPorSalidasForzadas();
        if (forzadas != null && !forzadas.isEmpty()) {
            salidasConDeuda = ((Number) forzadas.get(0)[0]).longValue();
            deuda = (BigDecimal) forzadas.get(0)[1];
        }

        Map<String, Object> result = new HashMap<>();
        result.put("salidaHoy", salidaHoy);
        result.put("vencidas", vencidas);
        result.put("pendienteCobro", pendienteCobro);
        result.put("liquidadoHoy", liquidadoHoy != null ? liquidadoHoy : BigDecimal.ZERO);
        result.put("aCuartoLimpieza", aCuartoLimpieza);
        result.put("salidasConDeuda", salidasConDeuda);
        result.put("deudaSalidasForzadas", deuda);
        result.put("saldos", saldos);
        return result;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private Folio folioDe(Estadia estadia) {
        Reserva reserva = Objects.requireNonNull(estadia.getReserva());
        Integer idEstadia = estadia.getIdEstadia();
        return new Folio(
                nz(reserva.getMontoAlojamientoTotal()),
                nz(consumoEstadiaRepository.sumTotalByEstadia(idEstadia)),
                nz(pagoRepository.sumMontoByReservaOrEstadia(idEstadia, reserva.getIdReserva())),
                nz(movimientoCajaRepository.devueltoDeEstadia(idEstadia)));
    }

    public BigDecimal calcularSaldo(@NonNull Integer idEstadia) {
        return folioDe(obtenerPorId(idEstadia)).saldo();
    }

    /** Noches que de verdad lleva el huesped: desde el dia que ingreso hasta hoy, con un minimo de una. */
    private static int nochesReales(Estadia estadia, LocalDate hoy) {
        Reserva reserva = estadia.getReserva();
        LocalDate ingreso = estadia.getFechaCheckinReal() != null
                ? estadia.getFechaCheckinReal().toLocalDate() : reserva.getFechaCheckinPrevisto();
        if (ingreso == null) {
            return reserva.getNumNoches() != null ? reserva.getNumNoches() : 1;
        }
        return (int) Math.max(1, ChronoUnit.DAYS.between(ingreso, hoy));
    }

    private static BigDecimal tarifaPorNoche(Reserva reserva) {
        int noches = reserva.getNumNoches() != null ? reserva.getNumNoches() : 0;
        return noches > 0 ? nz(reserva.getMontoAlojamientoTotal()).divide(BigDecimal.valueOf(noches), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
    }

    private static final java.util.List<EstadoComanda> COMANDAS_EN_CURSO =
            java.util.List.of(EstadoComanda.PENDIENTE, EstadoComanda.EN_PREPARACION, EstadoComanda.PREPARADA);
    private static final java.util.List<EstadoSolicitud> SOLICITUDES_SIN_ATENDER =
            java.util.List.of(EstadoSolicitud.PENDIENTE, EstadoSolicitud.ASIGNADA, EstadoSolicitud.EN_ATENCION);

    /**
     * Folio de la estadia para la pantalla de salida: lo cobrado, el saldo, las noches (reservadas y reales, con lo que
     * cambiaria el total si se ajustan) y lo que sigue abierto (comandas y solicitudes) por si conviene resolverlo antes
     * de que el huesped se vaya.
     */
    public Map<String, Object> obtenerSaldoDetallado(@NonNull Integer idEstadia) {
        Estadia estadia = obtenerPorId(idEstadia);
        Reserva reserva = Objects.requireNonNull(estadia.getReserva());
        Folio folio = folioDe(estadia);
        LocalDate hoy = LocalDate.now();

        int noches = reserva.getNumNoches() != null ? reserva.getNumNoches() : 0;
        int reales = nochesReales(estadia, hoy);
        BigDecimal tarifa = tarifaPorNoche(reserva);
        BigDecimal ajuste = noches > 0 ? tarifa.multiply(BigDecimal.valueOf((long) reales - noches)) : BigDecimal.ZERO;
        LocalDate prevista = reserva.getFechaCheckoutPrevisto();

        Map<String, Object> result = new HashMap<>();
        result.put("idEstadia", idEstadia);
        result.put("totalAlojamiento", folio.alojamiento());
        result.put("totalConsumos", folio.consumos());
        result.put("totalPagos", folio.pagos());
        result.put("totalDevuelto", folio.devuelto());
        result.put("saldoPendiente", folio.saldo());
        result.put("noches", noches);
        result.put("nochesReales", reales);
        result.put("tarifaPorNoche", tarifa);
        result.put("ajusteNoches", ajuste);
        result.put("salidaPrevista", prevista);
        // Negativo: se va antes de lo previsto; positivo: ya paso su dia de salida.
        result.put("diasDeDiferencia", prevista != null ? ChronoUnit.DAYS.between(prevista, hoy) : 0L);
        result.put("comandasActivas", comandaRepository.countByEstadiaIdEstadiaAndEstadoComandaIn(idEstadia, COMANDAS_EN_CURSO));
        result.put("solicitudesPendientes", solicitudRepository.countByEstadiaIdEstadiaAndEstadoIn(idEstadia, SOLICITUDES_SIN_ATENDER));
        result.put("solicitudesCobrablesPendientes",
                solicitudRepository.countByEstadiaIdEstadiaAndEstadoInAndEsCobrableTrue(idEstadia, SOLICITUDES_SIN_ATENDER));
        return result;
    }

    private Estadia exigirEnCurso(Integer idEstadia, String accion) {
        Estadia estadia = obtenerPorId(idEstadia);
        if (estadia.getEstadoEstadia() != EstadoEstadia.EN_CURSO) {
            throw new IllegalStateException("La estadia ya no esta en curso: no se puede " + accion
                    + ". El folio quedo cerrado con el check-out.");
        }
        return estadia;
    }

    private Producto productoVendible(Integer idProducto) {
        if (idProducto == null) {
            throw new IllegalStateException("Elige el producto o servicio.");
        }
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + idProducto));
        if (!Boolean.TRUE.equals(producto.getEstado())) {
            throw new IllegalStateException("\"" + producto.getNombre() + "\" esta desactivado: no se puede cargar al folio.");
        }
        return producto;
    }

    private static short cantidadValida(Integer cantidad) {
        if (cantidad == null || cantidad < 1 || cantidad > MAXIMO_CANTIDAD) {
            throw new IllegalStateException("La cantidad debe estar entre 1 y " + MAXIMO_CANTIDAD + ".");
        }
        return cantidad.shortValue();
    }

    /**
     * Carga consumos hechos en recepcion. El precio es SIEMPRE el del catalogo (no el que mande la pantalla), la estadia
     * debe estar en curso, el producto activo y la cantidad razonable. Todo o nada: si una linea falla no se guarda ninguna.
     * Devuelve tambien los avisos de stock (la venta no se frena, pero quien vende se entera).
     */
    @Transactional
    public ResultadoConsumos registrarDirectos(@NonNull Integer idEstadia, List<ItemConsumo> items) {
        Estadia estadia = exigirEnCurso(idEstadia, "cargar consumos");
        if (items == null || items.isEmpty()) {
            throw new IllegalStateException("Agrega al menos un producto o servicio.");
        }
        if (items.size() > MAXIMO_LINEAS) {
            throw new IllegalStateException("Maximo " + MAXIMO_LINEAS + " lineas por registro.");
        }
        // Primero se valida TODO: si una linea esta mal no se guarda ninguna.
        List<ConsumoEstadia> pendientes = new ArrayList<>();
        for (ItemConsumo item : items) {
            Producto producto = productoVendible(item.idProducto());
            ConsumoEstadia consumo = new ConsumoEstadia();
            consumo.setProducto(producto);
            consumo.setCantidad(cantidadValida(item.cantidad()));
            consumo.setPrecioUnitario(producto.getPrecioVenta());
            consumo.setOrigen("DIRECTO");
            pendientes.add(consumo);
        }
        List<ConsumoEstadia> creados = new ArrayList<>();
        List<String> advertencias = new ArrayList<>();
        for (ConsumoEstadia consumo : pendientes) {
            creados.add(guardarConsumo(estadia, consumo, advertencias));
        }
        return new ResultadoConsumos(creados, advertencias);
    }

    /**
     * Carga al folio un consumo que ya trae su precio (el pedido cobrable de un huesped: el monto se acordo al solicitarlo).
     * Mismas reglas de estadia en curso, producto activo y cantidad.
     */
    @Transactional
    public ConsumoEstadia registrarConsumo(@NonNull Integer idEstadia, ConsumoEstadia consumo) {
        Estadia estadia = exigirEnCurso(idEstadia, "cargar consumos");
        Producto producto = productoVendible(consumo.getProducto() != null ? consumo.getProducto().getIdProducto() : null);
        consumo.setProducto(producto);
        consumo.setCantidad(cantidadValida(consumo.getCantidad() != null ? Integer.valueOf(consumo.getCantidad()) : null));
        if (consumo.getPrecioUnitario() == null || consumo.getPrecioUnitario().signum() < 0) {
            consumo.setPrecioUnitario(producto.getPrecioVenta());
        }
        consumo.setOrigen("SOLICITUD");
        return guardarConsumo(estadia, consumo, new ArrayList<>());
    }

    private ConsumoEstadia guardarConsumo(Estadia estadia, ConsumoEstadia consumo, List<String> advertencias) {
        consumo.setEstadia(estadia);
        consumo.setTotalConsumo(consumo.getPrecioUnitario().multiply(BigDecimal.valueOf(consumo.getCantidad())));
        consumo.setFechaRegistro(LocalDateTime.now());
        Empleado quien = usuarioActualService.empleadoOpcional();
        consumo.setEmpleadoRegistra(quien);
        ConsumoEstadia saved = consumoEstadiaRepository.save(consumo);

        // Lo vendido sin pasar por una comanda (recepcion, solicitud del portal) tambien consume insumos:
        // las comandas descuentan al entregarse (ComandaService) y no llegan por este camino.
        List<String> faltantes = inventarioService.descontarPorReceta(saved.getProducto(), saved.getCantidad(),
                "CONSUMO-" + saved.getIdConsumo(), quien);
        if (faltantes != null) {
            advertencias.addAll(faltantes);
        }
        return consumoEstadiaRepository.findById(saved.getIdConsumo()).orElse(saved);
    }

    /**
     * Anula un consumo de recepcion o de una solicitud, con motivo obligatorio. Se borra del folio (el saldo baja), vuelve al
     * almacen lo que habia descontado y queda la constancia de quien lo registro, quien lo anulo y por que. Los que vienen
     * de una comanda se gestionan desde Comandas, y despues del check-out el folio ya no se toca.
     */
    @Transactional
    public ConsumoAnulado anularConsumo(@NonNull Integer idEstadia, @NonNull Integer idConsumo, String motivo) {
        exigirEnCurso(idEstadia, "anular consumos");
        ConsumoEstadia consumo = consumoEstadiaRepository.findById(idConsumo)
                .filter(c -> c.getEstadia() != null && idEstadia.equals(c.getEstadia().getIdEstadia()))
                .orElseThrow(() -> new EntityNotFoundException("Consumo no encontrado en esta estadia: " + idConsumo));
        if (consumo.getComanda() != null || "COMANDA".equals(consumo.getOrigen())) {
            throw new IllegalStateException("Este consumo viene de la comanda #"
                    + (consumo.getComanda() != null ? consumo.getComanda().getIdComanda() : "?")
                    + ": se gestiona desde Comandas, no se anula aqui.");
        }
        String razon = motivo == null ? "" : motivo.trim();
        if (razon.isEmpty()) {
            throw new IllegalStateException("Explica por que se anula el consumo (error de carga, el huesped lo rechazo...).");
        }
        if (razon.length() > LARGO_MOTIVO) {
            throw new IllegalStateException("El motivo no puede pasar de " + LARGO_MOTIVO + " caracteres.");
        }
        Empleado quien = usuarioActualService.empleadoOpcional();

        ConsumoAnulado constancia = new ConsumoAnulado();
        constancia.setIdConsumoOriginal(consumo.getIdConsumo());
        constancia.setEstadia(consumo.getEstadia());
        constancia.setProducto(consumo.getProducto());
        constancia.setCantidad(consumo.getCantidad());
        constancia.setPrecioUnitario(consumo.getPrecioUnitario());
        constancia.setTotalConsumo(consumo.getTotalConsumo());
        constancia.setOrigen(consumo.getOrigen());
        constancia.setFechaRegistroOriginal(consumo.getFechaRegistro());
        constancia.setEmpleadoRegistra(consumo.getEmpleadoRegistra());
        constancia.setEmpleadoAnula(quien);
        constancia.setMotivo(razon);
        constancia.setFechaAnulacion(LocalDateTime.now());
        ConsumoAnulado guardada = consumoAnuladoRepository.save(constancia);

        inventarioService.revertirConsumo("CONSUMO-" + idConsumo, "ANULA-CONSUMO-" + idConsumo, quien);
        consumoEstadiaRepository.delete(consumo);
        return guardada;
    }

    public List<ConsumoAnulado> listarAnulados(@NonNull Integer idEstadia) {
        obtenerPorId(idEstadia);
        return consumoAnuladoRepository.findByEstadiaIdEstadiaOrderByFechaAnulacionDesc(idEstadia);
    }

    /** Ids de los productos activos que mas se cargaron en los ultimos 30 dias (para los accesos rapidos). */
    public List<Integer> productosFrecuentes() {
        List<Integer> ids = new ArrayList<>();
        for (Object[] fila : consumoEstadiaRepository.frecuentes(LocalDateTime.now().minusDays(30),
                org.springframework.data.domain.PageRequest.of(0, 8))) {
            ids.add((Integer) fila[0]);
        }
        return ids;
    }

    @Transactional
    public Estadia realizarCheckout(@NonNull Integer idEstadia, Pago pagoFinal) {
        return realizarCheckout(idEstadia, pagoFinal, OpcionesCheckout.NINGUNA);
    }

    /**
     * Cierra la estadia. Con saldo 0 sale sin tocar la caja. Con saldo pendiente hay que cobrarlo (pago final) o, solo un
     * administrador y con motivo, dejarlo como deuda. Con saldo a favor del huesped hay que devolverlo en efectivo. Antes de
     * calcular el saldo se pueden ajustar las noches a las realmente usadas. Si algo falla no queda nada a medias.
     */
    @Transactional
    public Estadia realizarCheckout(@NonNull Integer idEstadia, Pago pagoFinal, OpcionesCheckout opciones) {
        OpcionesCheckout op = opciones != null ? opciones : OpcionesCheckout.NINGUNA;
        Estadia estadia = exigirEnCurso(idEstadia, "hacer el check-out");
        Reserva reserva = Objects.requireNonNull(estadia.getReserva());

        if (op.forzar()) {
            exigirAdministrador();
        }
        String detalleAjuste = op.ajustarNoches() ? ajustarNoches(estadia, reserva, LocalDate.now()) : null;

        boolean hayPagoFinal = pagoFinal != null && pagoFinal.getMonto() != null
                && pagoFinal.getMonto().compareTo(BigDecimal.ZERO) > 0;
        BigDecimal saldoAntes = calcularSaldo(idEstadia);
        // Con saldo 0 y sin pago final no se toca dinero: el huesped puede salir con la caja cerrada (y una salida
        // autorizada con deuda tampoco mueve dinero, salvo que traiga un pago parcial).
        if (hayPagoFinal || (saldoAntes.signum() > 0 && !op.forzar()) || (saldoAntes.signum() < 0 && op.devolverSaldo())) {
            cajaService.exigirCajaAbiertaSiEsPersonal();
        }

        if (hayPagoFinal) {
            pagoFinal.setEstadia(estadia);
            // Por PagoService para que el cobro entre al turno y al arqueo (antes se guardaba directo).
            pagoService.registrar(pagoFinal);
        }

        BigDecimal saldo = calcularSaldo(idEstadia);
        String motivo = op.motivo() != null ? op.motivo().trim() : "";
        if (saldo.signum() > 0) {
            if (!op.forzar()) {
                throw new IllegalStateException("No se puede realizar el checkout. Saldo pendiente: S/ " + saldo.setScale(2)
                        + ". Cobra el saldo para cerrar la cuenta (un administrador puede autorizar la salida con deuda).");
            }
            if (motivo.isEmpty()) {
                throw new IllegalStateException("Explica por que se autoriza la salida con saldo pendiente.");
            }
            if (motivo.length() > LARGO_MOTIVO) {
                throw new IllegalStateException("El motivo no puede pasar de " + LARGO_MOTIVO + " caracteres.");
            }
            estadia.setSalidaForzada(true);
            estadia.setMotivoSalidaForzada(motivo);
            estadia.setSaldoAlSalir(saldo.setScale(2, RoundingMode.HALF_UP));
        } else if (saldo.signum() < 0) {
            if (!op.devolverSaldo()) {
                throw new IllegalStateException("El huesped tiene un saldo a favor de S/ " + saldo.negate().setScale(2)
                        + ". Devuelvelo en efectivo para cerrar la cuenta.");
            }
            cajaService.registrarDevolucion(idEstadia, saldo.negate(),
                    "Devolucion de saldo a favor al salir (estadia #" + idEstadia + ")");
        }

        estadia.setEstadoEstadia(EstadoEstadia.FINALIZADA);
        estadia.setFechaCheckoutReal(LocalDateTime.now());
        estadiaRepository.save(estadia);

        reserva.setEstadoReserva(EstadoReserva.COMPLETADA);
        reservaRepository.save(reserva);

        Habitacion habitacionCheckout = Objects.requireNonNull(estadia.getHabitacion());
        boolean bloqueada = bloqueoPorIncidencia.hayBloqueo(habitacionCheckout.getIdHabitacion());
        habitacionCheckout.setEstadoOperativo(bloqueada ? EstadoOperativoHab.MANTENIMIENTO : EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        habitacionRepository.save(habitacionCheckout);

        // Housekeeping recoge la habitacion desde su propia bandeja de tareas. Si una incidencia la bloquea queda en
        // mantenimiento y la limpieza se pide al resolverla (la incidencia ofrece mandarla a limpieza).
        if (!bloqueada) {
            limpiezaService.crearPara(habitacionCheckout, OrigenTareaLimpieza.CHECK_OUT,
                    "Generada automaticamente por el check-out de la estadia #" + idEstadia);
        }

        String huesped = reserva.getCliente() != null
                ? (reserva.getCliente().getNombres() + " " + reserva.getCliente().getApellidos()).trim() : "?";
        if (detalleAjuste != null) {
            auditoriaService.registrar("CHECKOUT_NOCHES_AJUSTADAS", null,
                    "Estadia #" + idEstadia + " (" + huesped + "): " + detalleAjuste);
        }
        if (estadia.isSalidaForzada()) {
            auditoriaService.registrar("CHECKOUT_CON_DEUDA", null, "Estadia #" + idEstadia + " (" + huesped
                    + ") salio debiendo S/ " + estadia.getSaldoAlSalir() + ". Motivo: " + estadia.getMotivoSalidaForzada());
        }
        return estadia;
    }

    private void exigirAdministrador() {
        if (!usuarioActualService.tieneRol(Roles.ADMINISTRADOR)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Solo un administrador puede autorizar una salida con saldo pendiente.");
        }
    }

    /**
     * Cobra solo las noches realmente usadas: menos que las reservadas si se va antes, mas si se quedo de mas. Cambia las
     * noches, el monto del alojamiento (a la tarifa por noche de la reserva) y la fecha de salida, y lo deja anotado en la
     * reserva. Devuelve el detalle para la auditoria.
     */
    private String ajustarNoches(Estadia estadia, Reserva reserva, LocalDate hoy) {
        int reservadas = reserva.getNumNoches() != null ? reserva.getNumNoches() : 0;
        if (reservadas <= 0) {
            throw new IllegalStateException("La reserva no tiene noches registradas: no se pueden ajustar.");
        }
        int reales = nochesReales(estadia, hoy);
        if (reales == reservadas) {
            throw new IllegalStateException("No hay noches que ajustar: el huesped usa las " + reservadas + " noches reservadas.");
        }
        BigDecimal antes = nz(reserva.getMontoAlojamientoTotal());
        BigDecimal despues = tarifaPorNoche(reserva).multiply(BigDecimal.valueOf(reales)).setScale(2, RoundingMode.HALF_UP);
        reserva.setNumNoches((short) reales);
        reserva.setMontoAlojamientoTotal(despues);
        // La salida prevista sigue a las noches (la base exige salida > ingreso): ingreso previsto + noches cobradas.
        if (reserva.getFechaCheckinPrevisto() != null) {
            reserva.setFechaCheckoutPrevisto(reserva.getFechaCheckinPrevisto().plusDays(reales));
        }

        String detalle = "ajuste al salir (" + hoy + "): de " + reservadas + " a " + reales + " noche(s), alojamiento de S/ "
                + antes.setScale(2, RoundingMode.HALF_UP) + " a S/ " + despues;
        String previas = reserva.getObservaciones();
        reserva.setObservaciones(previas == null || previas.isBlank() ? detalle : previas + " | " + detalle);
        reservaRepository.save(reserva);
        return detalle;
    }
}
