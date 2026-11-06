package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.ComandaResponse;
import pe.edu.utp.huertohostel.dto.NuevaComandaRequest;
import pe.edu.utp.huertohostel.entity.AreaDestino;
import pe.edu.utp.huertohostel.entity.CategoriaProducto;
import pe.edu.utp.huertohostel.entity.Comanda;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.DetalleComanda;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoComanda;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.repository.ComandaRepository;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.DetalleComandaRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.ProductoRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ComandaService {

    private final ComandaRepository comandaRepository;
    private final DetalleComandaRepository detalleComandaRepository;
    private final EstadiaRepository estadiaRepository;
    private final ProductoRepository productoRepository;
    private final ConsumoEstadiaRepository consumoEstadiaRepository;
    private final InventarioService inventarioService;
    private final UsuarioActualService usuarioActualService;

    public ComandaService(ComandaRepository comandaRepository,
                          DetalleComandaRepository detalleComandaRepository,
                          EstadiaRepository estadiaRepository,
                          ProductoRepository productoRepository,
                          ConsumoEstadiaRepository consumoEstadiaRepository,
                          InventarioService inventarioService,
                          UsuarioActualService usuarioActualService) {
        this.comandaRepository = comandaRepository;
        this.detalleComandaRepository = detalleComandaRepository;
        this.estadiaRepository = estadiaRepository;
        this.productoRepository = productoRepository;
        this.consumoEstadiaRepository = consumoEstadiaRepository;
        this.inventarioService = inventarioService;
        this.usuarioActualService = usuarioActualService;
    }

    /** Estados que siguen vivos en el tablero KDS. */
    private static final List<EstadoComanda> ESTADOS_ACTIVOS = List.of(
            EstadoComanda.PENDIENTE, EstadoComanda.EN_PREPARACION, EstadoComanda.PREPARADA);

    public List<ComandaResponse> listarTablero(AreaDestino area, EstadoComanda estado) {
        List<Comanda> comandas;
        if (area != null && estado != null) {
            comandas = comandaRepository.findByAreaDestinoAndEstadoComandaOrderByFechaRegistroAsc(area, estado);
        } else if (area != null) {
            comandas = comandaRepository.findByAreaDestinoOrderByFechaRegistroAsc(area);
        } else if (estado != null) {
            comandas = comandaRepository.findByEstadoComandaOrderByFechaRegistroAsc(estado);
        } else {
            comandas = comandaRepository.findByEstadoComandaInOrderByFechaRegistroAsc(ESTADOS_ACTIVOS);
        }
        return mapear(comandas);
    }

    public List<ComandaResponse> listarPorEstadia(@NonNull Integer idEstadia) {
        return mapear(comandaRepository.findByEstadiaIdEstadia(idEstadia));
    }

    public ComandaResponse obtenerPorId(@NonNull Integer idComanda) {
        Comanda comanda = buscar(idComanda);
        return ComandaResponse.de(comanda, detalleComandaRepository.findByComandaIdComanda(idComanda));
    }

    /** Carga los detalles de todas las comandas en una sola consulta para evitar N+1. */
    private List<ComandaResponse> mapear(List<Comanda> comandas) {
        if (comandas.isEmpty()) {
            return List.of();
        }
        List<Integer> ids = comandas.stream()
                .map(Comanda::getIdComanda)
                .filter(Objects::nonNull)
                .toList();
        Map<Integer, List<DetalleComanda>> porComanda = detalleComandaRepository
                .findByComandaIdComandaIn(ids).stream()
                .filter(d -> d.getComanda() != null && d.getComanda().getIdComanda() != null)
                .collect(Collectors.groupingBy(d -> d.getComanda().getIdComanda()));

        return comandas.stream()
                .map(c -> ComandaResponse.de(c,
                        porComanda.getOrDefault(c.getIdComanda(), Collections.emptyList())))
                .toList();
    }

    private Comanda buscar(@NonNull Integer idComanda) {
        return comandaRepository.findById(idComanda)
                .orElseThrow(() -> new EntityNotFoundException("Comanda no encontrada con id: " + idComanda));
    }

    @Transactional
    public ComandaResponse crear(NuevaComandaRequest request) {
        if (request.getIdEstadia() == null) {
            throw new IllegalStateException("La comanda debe indicar la estadia a la que se carga.");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalStateException("La comanda debe tener al menos un item.");
        }
        if (request.getAreaDestino() == null) {
            throw new IllegalStateException("La comanda debe indicar el area de destino.");
        }

        Estadia estadia = estadiaRepository.findById(request.getIdEstadia())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Estadia no encontrada con id: " + request.getIdEstadia()));

        if (estadia.getEstadoEstadia() != EstadoEstadia.EN_CURSO) {
            throw new IllegalStateException("Solo se pueden registrar comandas en estadias en curso.");
        }

        Empleado empleado = usuarioActualService.obtenerEmpleado();

        Comanda comanda = new Comanda();
        comanda.setEstadia(estadia);
        comanda.setEmpleado(empleado);
        comanda.setAreaDestino(request.getAreaDestino());
        comanda.setEstadoComanda(EstadoComanda.PENDIENTE);
        comanda.setObservaciones(request.getObservaciones());
        comanda.setFechaRegistro(LocalDateTime.now());
        Comanda guardada = comandaRepository.save(comanda);

        List<DetalleComanda> detalles = new ArrayList<>();
        for (NuevaComandaRequest.ItemComanda item : request.getItems()) {
            if (item.getIdProducto() == null || item.getCantidad() == null || item.getCantidad() <= 0) {
                throw new IllegalStateException("Cada item debe tener producto y cantidad mayor a cero.");
            }
            Producto producto = productoRepository.findById(item.getIdProducto())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Producto no encontrado con id: " + item.getIdProducto()));

            validarProducto(producto, request.getAreaDestino());

            BigDecimal precio = producto.getPrecioVenta() != null
                    ? producto.getPrecioVenta() : BigDecimal.ZERO;

            DetalleComanda detalle = new DetalleComanda();
            detalle.setComanda(guardada);
            detalle.setProducto(producto);
            detalle.setCantidad(item.getCantidad());
            detalle.setPrecioUnitario(precio);
            detalle.setSubtotal(precio.multiply(BigDecimal.valueOf(item.getCantidad())));
            detalle.setNotas(item.getNotas());
            detalles.add(detalle);
        }
        detalleComandaRepository.saveAll(detalles);

        return ComandaResponse.de(guardada, detalles);
    }

    @Transactional
    public ComandaResponse cambiarEstado(@NonNull Integer idComanda, EstadoComanda nuevoEstado) {
        if (nuevoEstado == null) {
            throw new IllegalStateException("Debe indicar el nuevo estado de la comanda.");
        }
        Comanda comanda = comandaRepository.findByIdParaActualizar(idComanda)
                .orElseThrow(() -> new EntityNotFoundException("Comanda no encontrada con id: " + idComanda));
        EstadoComanda actual = comanda.getEstadoComanda();

        if (actual == nuevoEstado) {
            return obtenerPorId(idComanda);
        }
        validarTransicion(actual, nuevoEstado);

        comanda.setEstadoComanda(nuevoEstado);
        LocalDateTime ahora = LocalDateTime.now();
        switch (nuevoEstado) {
            case EN_PREPARACION -> comanda.setFechaEnPreparacion(ahora);
            case PREPARADA -> comanda.setFechaPreparada(ahora);
            case ENTREGADA -> comanda.setFechaEntregada(ahora);
            case CANCELADA -> comanda.setFechaCancelada(ahora);
            default -> { }
        }
        comandaRepository.save(comanda);

        List<DetalleComanda> detalles = detalleComandaRepository.findByComandaIdComanda(idComanda);

        // Al entregar: se carga al folio de la estadia y se descuentan los insumos por receta.
        if (nuevoEstado == EstadoComanda.ENTREGADA) {
            cargarAlFolio(comanda, detalles);
        }
        // Cancelada cuando ya se estaba preparando: no se cobra, pero el insumo se uso. Queda como merma.
        if (nuevoEstado == EstadoComanda.CANCELADA && actual != EstadoComanda.PENDIENTE) {
            mermarPreparacion(comanda, detalles);
        }

        return ComandaResponse.de(comanda, detalles);
    }

    /** Estadias en curso con solo el numero de habitacion: nada de datos del huesped. */
    public List<Map<String, Object>> estadiasActivas() {
        return estadiaRepository.findByEstadoEstadia(EstadoEstadia.EN_CURSO).stream()
                .map(e -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("idEstadia", e.getIdEstadia());
                    m.put("numeroHabitacion", e.getHabitacion() != null ? e.getHabitacion().getNumero() : null);
                    return m;
                })
                .toList();
    }

    /** Un producto desactivado no se vende, y cocina y bar solo preparan lo suyo (el inventario sale de su receta). */
    private void validarProducto(Producto producto, AreaDestino area) {
        if (!Boolean.TRUE.equals(producto.getEstado())) {
            throw new IllegalStateException("El producto '" + producto.getNombre() + "' esta desactivado.");
        }
        boolean coincide = switch (area) {
            case COCINA -> producto.getCategoria() == CategoriaProducto.COCINA;
            case BAR -> producto.getCategoria() == CategoriaProducto.BAR;
            case VENTA_DIRECTA -> true;
        };
        if (!coincide) {
            throw new IllegalStateException("El producto '" + producto.getNombre() + "' es de "
                    + producto.getCategoria() + " y no se puede pedir a " + area + ".");
        }
    }

    private void validarTransicion(EstadoComanda actual, EstadoComanda nuevo) {
        List<EstadoComanda> permitidos = switch (actual) {
            case PENDIENTE -> List.of(EstadoComanda.EN_PREPARACION, EstadoComanda.CANCELADA);
            case EN_PREPARACION -> List.of(EstadoComanda.PREPARADA, EstadoComanda.CANCELADA);
            case PREPARADA -> List.of(EstadoComanda.ENTREGADA, EstadoComanda.CANCELADA);
            case ENTREGADA, CANCELADA -> List.of();
        };
        if (!permitidos.contains(nuevo)) {
            throw new IllegalStateException(
                    "Transicion no permitida: " + actual + " -> " + nuevo);
        }
    }

    private void mermarPreparacion(Comanda comanda, List<DetalleComanda> detalles) {
        Empleado quienCancela = usuarioActualService.empleadoOpcional();
        String referencia = "MERMA-COMANDA-" + comanda.getIdComanda();
        for (DetalleComanda detalle : detalles) {
            inventarioService.mermarPorReceta(detalle.getProducto(), detalle.getCantidad(), referencia,
                    quienCancela != null ? quienCancela : comanda.getEmpleado());
        }
    }

    /** Genera un consumo por cada linea y descuenta el stock segun receta. */
    private void cargarAlFolio(Comanda comanda, List<DetalleComanda> detalles) {
        Estadia estadia = Objects.requireNonNull(comanda.getEstadia());
        Empleado empleado = comanda.getEmpleado();
        String referencia = "COMANDA-" + comanda.getIdComanda();

        for (DetalleComanda detalle : detalles) {
            ConsumoEstadia consumo = new ConsumoEstadia();
            consumo.setEstadia(estadia);
            consumo.setComanda(comanda);
            consumo.setProducto(detalle.getProducto());
            consumo.setCantidad(detalle.getCantidad());
            consumo.setPrecioUnitario(detalle.getPrecioUnitario());
            consumo.setTotalConsumo(detalle.getSubtotal());
            consumo.setFechaRegistro(LocalDateTime.now());
            consumo.setOrigen("COMANDA");
            consumo.setEmpleadoRegistra(empleado);
            consumoEstadiaRepository.save(consumo);

            inventarioService.descontarPorReceta(
                    detalle.getProducto(), detalle.getCantidad(), referencia, empleado);
        }
    }
}
