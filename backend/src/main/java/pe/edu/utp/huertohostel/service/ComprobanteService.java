package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.MovimientoCaja;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.MovimientoCajaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Datos del comprobante de una estadia: lo que se le entrega al huesped como constancia de lo que uso y de lo que pago
 * (alojamiento, consumos y pagos). Con la estadia en curso es una PRE_CUENTA (el huesped la pide antes de pagar); con la
 * estadia finalizada es el COMPROBANTE del pago.
 *
 * <p>No es un comprobante tributario (boleta o factura electronica): el texto legal lo deja claro, y el numero se deriva del
 * id de la estadia. La impresion, el PDF y la imagen se generan en la pantalla a partir de estos datos.
 */
@Service
@Transactional(readOnly = true)
public class ComprobanteService {

    public static final String TIPO_PRE_CUENTA = "PRE_CUENTA";
    public static final String TIPO_COMPROBANTE = "COMPROBANTE";

    private final EstadiaRepository estadiaRepository;
    private final ConsumoEstadiaRepository consumoRepository;
    private final PagoRepository pagoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final UsuarioActualService usuarioActualService;
    private final String hotelNombre;
    private final String hotelRuc;
    private final String hotelDireccion;
    private final String hotelTelefono;
    private final String hotelCorreo;
    private final String mensajePie;

    public ComprobanteService(EstadiaRepository estadiaRepository,
                              ConsumoEstadiaRepository consumoRepository,
                              PagoRepository pagoRepository,
                              MovimientoCajaRepository movimientoCajaRepository,
                              UsuarioActualService usuarioActualService,
                              @Value("${app.hotel.nombre:El Huerto Hostel}") String hotelNombre,
                              @Value("${app.hotel.ruc:}") String hotelRuc,
                              @Value("${app.hotel.direccion:}") String hotelDireccion,
                              @Value("${app.hotel.telefono:}") String hotelTelefono,
                              @Value("${app.hotel.correo:}") String hotelCorreo,
                              @Value("${app.hotel.mensaje-pie:Gracias por su visita}") String mensajePie) {
        this.estadiaRepository = estadiaRepository;
        this.consumoRepository = consumoRepository;
        this.pagoRepository = pagoRepository;
        this.movimientoCajaRepository = movimientoCajaRepository;
        this.usuarioActualService = usuarioActualService;
        this.hotelNombre = hotelNombre;
        this.hotelRuc = hotelRuc;
        this.hotelDireccion = hotelDireccion;
        this.hotelTelefono = hotelTelefono;
        this.hotelCorreo = hotelCorreo;
        this.mensajePie = mensajePie;
    }

    /** Numero visible del comprobante: CE-000044 para la estadia 44. */
    public static String numeroDe(Integer idEstadia) {
        return String.format("CE-%06d", idEstadia);
    }

    public Map<String, Object> de(@NonNull Integer idEstadia) {
        Estadia estadia = estadiaRepository.findById(idEstadia)
                .orElseThrow(() -> new EntityNotFoundException("Estadia no encontrada con id: " + idEstadia));
        Reserva reserva = estadia.getReserva();
        Cliente cliente = reserva != null ? reserva.getCliente() : null;
        boolean cerrada = estadia.getEstadoEstadia() == EstadoEstadia.FINALIZADA;

        List<ConsumoEstadia> consumos = new ArrayList<>(consumoRepository.findByEstadiaIdEstadia(idEstadia));
        consumos.sort(Comparator.comparing(ConsumoEstadia::getFechaRegistro, Comparator.nullsLast(Comparator.naturalOrder())));
        List<Pago> pagos = reserva != null && reserva.getIdReserva() != null
                ? new ArrayList<>(pagoRepository.findDeReservaOSuEstadia(reserva.getIdReserva())) : new ArrayList<>();

        BigDecimal alojamiento = dinero(reserva != null ? reserva.getMontoAlojamientoTotal() : null);
        BigDecimal totalConsumos = consumos.stream().map(c -> dinero(c.getTotalConsumo())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPagado = pagos.stream().map(p -> dinero(p.getMonto())).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<MovimientoCaja> devueltos = movimientoCajaRepository.findByIdEstadiaAndTipoOrderByFechaHoraAsc(idEstadia, MovimientoCaja.DEVOLUCION);
        BigDecimal totalDevuelto = devueltos == null ? BigDecimal.ZERO
                : devueltos.stream().map(m -> dinero(m.getMonto())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = alojamiento.add(totalConsumos);
        // Lo devuelto en efectivo al huesped le resta a lo que ya pago: cierra un saldo a su favor.
        BigDecimal saldo = total.subtract(totalPagado).add(totalDevuelto);
        int noches = reserva != null && reserva.getNumNoches() != null ? reserva.getNumNoches() : 0;

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("tipo", cerrada ? TIPO_COMPROBANTE : TIPO_PRE_CUENTA);
        r.put("numero", numeroDe(idEstadia));
        r.put("emitidoEn", LocalDateTime.now());
        r.put("atendidoPor", atendidoPor(pagos));
        r.put("hotel", hotel());
        r.put("huesped", huesped(cliente));
        Map<String, Object> hab = new LinkedHashMap<>();
        hab.put("numero", estadia.getHabitacion() != null ? estadia.getHabitacion().getNumero() : null);
        hab.put("tipo", estadia.getHabitacion() != null && estadia.getHabitacion().getTipoHabitacion() != null
                ? estadia.getHabitacion().getTipoHabitacion().getNombre() : null);
        r.put("habitacion", hab);
        r.put("checkin", estadia.getFechaCheckinReal());
        r.put("checkout", cerrada ? estadia.getFechaCheckoutReal() : null);
        r.put("salidaPrevista", reserva != null ? reserva.getFechaCheckoutPrevisto() : null);

        Map<String, Object> aloj = new LinkedHashMap<>();
        aloj.put("noches", noches);
        aloj.put("tarifaPorNoche", noches > 0 ? alojamiento.divide(BigDecimal.valueOf(noches), 2, RoundingMode.HALF_UP) : alojamiento);
        aloj.put("total", alojamiento);
        r.put("alojamiento", aloj);

        List<Map<String, Object>> lineas = new ArrayList<>();
        for (ConsumoEstadia c : consumos) {
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("fecha", c.getFechaRegistro());
            l.put("descripcion", c.getProducto() != null ? c.getProducto().getNombre() : "Consumo");
            l.put("cantidad", c.getCantidad());
            l.put("precioUnitario", dinero(c.getPrecioUnitario()));
            l.put("total", dinero(c.getTotalConsumo()));
            lineas.add(l);
        }
        r.put("consumos", lineas);
        r.put("totalConsumos", totalConsumos);

        List<Map<String, Object>> cobros = new ArrayList<>();
        for (Pago p : pagos) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("fecha", p.getFechaPago());
            c.put("concepto", p.getConcepto() != null ? p.getConcepto().name() : null);
            c.put("metodo", p.getMetodoPago() != null ? p.getMetodoPago().name() : null);
            c.put("monto", dinero(p.getMonto()));
            c.put("referencia", p.getNumTransaccionComprobante());
            cobros.add(c);
        }
        r.put("pagos", cobros);
        r.put("totalPagado", totalPagado);

        List<Map<String, Object>> devoluciones = new ArrayList<>();
        if (devueltos != null) {
            for (MovimientoCaja m : devueltos) {
                Map<String, Object> d = new LinkedHashMap<>();
                d.put("fecha", m.getFechaHora());
                d.put("monto", dinero(m.getMonto()));
                d.put("motivo", m.getMotivo());
                devoluciones.add(d);
            }
        }
        r.put("devoluciones", devoluciones);
        r.put("totalDevuelto", totalDevuelto);
        r.put("salidaConDeuda", estadia.isSalidaForzada());

        r.put("total", total);
        r.put("saldoPendiente", saldo.signum() > 0 ? saldo : BigDecimal.ZERO);
        r.put("saldoAFavor", saldo.signum() < 0 ? saldo.negate() : BigDecimal.ZERO);
        r.put("aviso", "Documento informativo del hostel. No es una boleta ni una factura electronica; "
                + "solicita tu comprobante electronico en recepcion si lo necesitas.");
        return r;
    }

    private Map<String, Object> hotel() {
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("nombre", hotelNombre);
        h.put("ruc", vacioANulo(hotelRuc));
        h.put("direccion", vacioANulo(hotelDireccion));
        h.put("telefono", vacioANulo(hotelTelefono));
        h.put("correo", vacioANulo(hotelCorreo));
        h.put("mensajePie", vacioANulo(mensajePie));
        return h;
    }

    private Map<String, Object> huesped(Cliente c) {
        Map<String, Object> h = new LinkedHashMap<>();
        h.put("nombre", c != null ? (c.getNombres() + " " + c.getApellidos()).trim() : "—");
        h.put("tipoDocumento", c != null ? c.getTipoDocumento() : null);
        h.put("numeroDocumento", c != null ? c.getNumeroDocumento() : null);
        return h;
    }

    /** Quien atendio: quien cobro por ultima vez la estadia; si no hubo cobros, quien emite el documento. */
    private String atendidoPor(List<Pago> pagos) {
        Empleado e = pagos.stream().map(Pago::getEmpleadoRegistra).filter(x -> x != null).reduce((a, b) -> b)
                .orElseGet(usuarioActualService::empleadoOpcional);
        return e == null ? null : (e.getNombres() + " " + e.getApellidos()).trim();
    }

    private static BigDecimal dinero(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String vacioANulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
