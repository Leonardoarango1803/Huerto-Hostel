package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoSolicitud;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.SolicitudServicio;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.ProductoRepository;
import pe.edu.utp.huertohostel.repository.SolicitudServicioRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Autoservicio del huesped (RF32). Todos los metodos resuelven la estadia activa
 * del CLIENTE autenticado: el huesped nunca indica el id de estadia, de modo que
 * no puede consultar el folio de otra habitacion.
 */
@Service
@Transactional(readOnly = true)
public class PortalService {

    private final EstadiaRepository estadiaRepository;
    private final SolicitudServicioRepository solicitudRepository;
    private final ProductoRepository productoRepository;
    private final EstadiaService estadiaService;
    private final UsuarioActualService usuarioActualService;

    public PortalService(EstadiaRepository estadiaRepository,
                         SolicitudServicioRepository solicitudRepository,
                         ProductoRepository productoRepository,
                         EstadiaService estadiaService,
                         UsuarioActualService usuarioActualService) {
        this.estadiaRepository = estadiaRepository;
        this.solicitudRepository = solicitudRepository;
        this.productoRepository = productoRepository;
        this.estadiaService = estadiaService;
        this.usuarioActualService = usuarioActualService;
    }

    public Estadia estadiaActiva() {
        Cliente cliente = usuarioActualService.obtenerCliente();
        List<Estadia> activas = estadiaRepository.findByClienteAndEstado(
                cliente.getIdCliente(), EstadoEstadia.EN_CURSO);
        if (activas.isEmpty()) {
            throw new EntityNotFoundException("No tienes una estadia en curso.");
        }
        return activas.get(0);
    }

    /** Folio del huesped: alojamiento, consumos, pagos y saldo pendiente. */
    public Map<String, Object> miFolio() {
        Estadia estadia = estadiaActiva();
        Integer idEstadia = Objects.requireNonNull(estadia.getIdEstadia());

        Map<String, Object> folio = new HashMap<>(estadiaService.obtenerSaldoDetallado(idEstadia));
        folio.put("habitacion", estadia.getHabitacion() != null
                ? estadia.getHabitacion().getNumero() : null);
        folio.put("fechaCheckin", estadia.getFechaCheckinReal());
        if (estadia.getReserva() != null) {
            folio.put("fechaCheckoutPrevisto", estadia.getReserva().getFechaCheckoutPrevisto());
        }
        return folio;
    }

    public List<ConsumoEstadia> misConsumos() {
        Estadia estadia = estadiaActiva();
        return estadiaService.listarConsumos(Objects.requireNonNull(estadia.getIdEstadia()));
    }

    public List<SolicitudServicio> misSolicitudes() {
        Estadia estadia = estadiaActiva();
        return solicitudRepository.findByEstadiaIdEstadiaOrderByFechaSolicitudDesc(
                estadia.getIdEstadia());
    }

    @Transactional
    public SolicitudServicio solicitarServicio(String descripcion, Integer idProducto, Short cantidad) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new IllegalStateException("Describe el servicio que necesitas.");
        }
        Estadia estadia = estadiaActiva();

        SolicitudServicio solicitud = new SolicitudServicio();
        solicitud.setEstadia(estadia);
        solicitud.setDescripcion(descripcion);
        solicitud.setCantidad(cantidad != null && cantidad > 0 ? cantidad : (short) 1);
        solicitud.setEstado(EstadoSolicitud.PENDIENTE);
        solicitud.setFechaSolicitud(LocalDateTime.now());

        // Si el huesped pide un producto del catalogo, la solicitud nace cobrable
        // con el precio vigente; recepcion decide si la carga al folio al atenderla.
        if (idProducto != null) {
            Producto producto = productoRepository.findById(idProducto)
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Producto no encontrado con id: " + idProducto));
            solicitud.setProducto(producto);
            solicitud.setEsCobrable(true);
            solicitud.setMontoUnidad(producto.getPrecioVenta() != null
                    ? producto.getPrecioVenta() : BigDecimal.ZERO);
        } else {
            solicitud.setEsCobrable(false);
            solicitud.setMontoUnidad(BigDecimal.ZERO);
        }

        return solicitudRepository.save(solicitud);
    }

    // ---------- Bandeja del personal ----------

    private static final List<EstadoSolicitud> ABIERTAS = List.of(
            EstadoSolicitud.PENDIENTE, EstadoSolicitud.ASIGNADA, EstadoSolicitud.EN_ATENCION);

    public List<SolicitudServicio> listarParaPersonal(EstadoSolicitud estado) {
        return estado != null
                ? solicitudRepository.findByEstadoOrderByFechaSolicitudAsc(estado)
                : solicitudRepository.findByEstadoInOrderByFechaSolicitudAsc(ABIERTAS);
    }

    @Transactional
    public SolicitudServicio cambiarEstado(@NonNull Integer idSolicitud, EstadoSolicitud nuevo) {
        if (nuevo == null) {
            throw new IllegalStateException("Debe indicar el nuevo estado de la solicitud.");
        }
        SolicitudServicio solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Solicitud no encontrada con id: " + idSolicitud));

        solicitud.setEstado(nuevo);
        if (nuevo == EstadoSolicitud.ASIGNADA || nuevo == EstadoSolicitud.EN_ATENCION) {
            solicitud.setEmpleadoAsignado(usuarioActualService.obtenerEmpleado());
        } else if (nuevo == EstadoSolicitud.ATENDIDA) {
            solicitud.setFechaAtencion(LocalDateTime.now());
            if (solicitud.getEmpleadoAsignado() == null) {
                solicitud.setEmpleadoAsignado(usuarioActualService.obtenerEmpleado());
            }
        }
        return solicitudRepository.save(solicitud);
    }

    /** Carga al folio una solicitud cobrable ya atendida. */
    @Transactional
    public ConsumoEstadia cargarAlFolio(@NonNull Integer idSolicitud) {
        SolicitudServicio solicitud = solicitudRepository.findById(idSolicitud)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Solicitud no encontrada con id: " + idSolicitud));

        if (!Boolean.TRUE.equals(solicitud.getEsCobrable()) || solicitud.getProducto() == null) {
            throw new IllegalStateException("La solicitud no es cobrable o no tiene producto asociado.");
        }

        ConsumoEstadia consumo = new ConsumoEstadia();
        consumo.setProducto(solicitud.getProducto());
        consumo.setCantidad(solicitud.getCantidad());
        consumo.setPrecioUnitario(solicitud.getMontoUnidad());

        Estadia estadia = Objects.requireNonNull(solicitud.getEstadia());
        return estadiaService.registrarConsumo(
                Objects.requireNonNull(estadia.getIdEstadia()), consumo);
    }
}
