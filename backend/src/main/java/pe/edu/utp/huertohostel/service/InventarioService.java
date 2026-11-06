package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.AreaInsumo;
import pe.edu.utp.huertohostel.entity.CategoriaProducto;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Insumo;
import pe.edu.utp.huertohostel.entity.MovimientoInventario;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.Proveedor;
import pe.edu.utp.huertohostel.entity.RecetaDetalle;
import pe.edu.utp.huertohostel.entity.RecetaDetalleId;
import pe.edu.utp.huertohostel.entity.TipoMovInventario;
import pe.edu.utp.huertohostel.repository.InsumoRepository;
import pe.edu.utp.huertohostel.repository.MovimientoInventarioRepository;
import pe.edu.utp.huertohostel.repository.ProductoRepository;
import pe.edu.utp.huertohostel.repository.ProveedorRepository;
import pe.edu.utp.huertohostel.repository.RecetaDetalleRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class InventarioService {

    private static final Logger log = LoggerFactory.getLogger(InventarioService.class);

    private static final int LIMITE_POR_DEFECTO = 200;
    private static final int LIMITE_MAXIMO = 1000;

    private final InsumoRepository insumoRepository;
    private final RecetaDetalleRepository recetaDetalleRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;

    public InventarioService(InsumoRepository insumoRepository,
                             RecetaDetalleRepository recetaDetalleRepository,
                             MovimientoInventarioRepository movimientoRepository,
                             ProveedorRepository proveedorRepository,
                             ProductoRepository productoRepository) {
        this.insumoRepository = insumoRepository;
        this.recetaDetalleRepository = recetaDetalleRepository;
        this.movimientoRepository = movimientoRepository;
        this.proveedorRepository = proveedorRepository;
        this.productoRepository = productoRepository;
    }

    // ---------- Respuestas ----------

    /** Una fila del listado de recetas: cuantos insumos lleva y cuanto cuesta preparar una unidad. */
    public record ResumenReceta(Integer idProducto, String nombre, CategoriaProducto categoria,
                                BigDecimal precioVenta, int lineas, BigDecimal costoReceta,
                                BigDecimal margen, boolean sinReceta) {
    }

    /** Filtros del kardex; todos opcionales. */
    public record FiltroMovimientos(Integer idInsumo, TipoMovInventario tipo, LocalDate desde,
                                    LocalDate hasta, boolean soloFaltantes, Integer limite) {
    }

    public record FilaReporte(Integer idInsumo, String nombre, String unidad, AreaInsumo area,
                              BigDecimal entradas, BigDecimal consumido, BigDecimal merma,
                              BigDecimal sobrante, BigDecimal faltante, BigDecimal costoConsumo,
                              BigDecimal costoMerma) {
    }

    public record ReporteInventario(LocalDate desde, LocalDate hasta, BigDecimal valorizacionStock,
                                    long insumosStockBajo, long insumosAgotados,
                                    BigDecimal costoConsumoTotal, BigDecimal costoMermaTotal,
                                    List<FilaReporte> filas) {
    }

    // ---------- Insumos ----------

    /** {@code areaRestringida} nulo = ve todo; con valor (housekeeping) solo ve los insumos de esa area. */
    public List<Insumo> listarInsumos(AreaInsumo areaRestringida) {
        return areaRestringida == null
                ? insumoRepository.findAll(Sort.by("nombre"))
                : insumoRepository.findByAreaOrderByNombre(areaRestringida);
    }

    public List<Insumo> listarConStockBajo(AreaInsumo areaRestringida) {
        return areaRestringida == null
                ? insumoRepository.findConStockBajo()
                : insumoRepository.findConStockBajoDeArea(areaRestringida);
    }

    public Insumo obtenerInsumo(@NonNull Integer id) {
        return insumoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Insumo no encontrado con id: " + id));
    }

    private Insumo obtenerInsumo(Integer id, AreaInsumo areaRestringida) {
        if (id == null) {
            throw new IllegalArgumentException("Debe indicar el insumo.");
        }
        Insumo insumo = obtenerInsumo(id);
        if (areaRestringida != null && insumo.getArea() != areaRestringida) {
            throw new AccessDeniedException("Este insumo no pertenece a tu area.");
        }
        return insumo;
    }

    /** Un stock inicial mayor a cero entra como un movimiento, para que el kardex cuadre desde el dia uno. */
    @Transactional
    public Insumo crearInsumo(Insumo datos, Empleado empleado) {
        String nombre = nombreLimpio(datos.getNombre(), "El insumo necesita un nombre.");
        if (insumoRepository.existsByNombreIgnoreCase(nombre)) {
            throw new IllegalStateException("Ya existe un insumo llamado '" + nombre + "'.");
        }
        BigDecimal stockInicial = datos.getStockActual() != null ? datos.getStockActual() : BigDecimal.ZERO;
        if (stockInicial.signum() < 0) {
            throw new IllegalArgumentException("El stock inicial no puede ser negativo.");
        }

        Insumo insumo = new Insumo();
        insumo.setNombre(nombre);
        aplicarDatosBasicos(insumo, datos);
        insumo.setEstado(true);
        insumo.setStockActual(BigDecimal.ZERO);
        Insumo guardado = insumoRepository.save(insumo);

        if (stockInicial.signum() > 0) {
            aplicar(guardado, TipoMovInventario.ENTRADA, stockInicial, stockInicial,
                    "Stock inicial", empleado, guardado.getCostoUnitario(), null);
        }
        return guardado;
    }

    /** El stock no se edita aqui: cambia solo por movimientos o por un conteo fisico. */
    @Transactional
    public Insumo actualizarInsumo(@NonNull Integer id, Insumo datos) {
        Insumo insumo = obtenerInsumo(id);
        String nombre = nombreLimpio(datos.getNombre(), "El insumo necesita un nombre.");
        if (insumoRepository.existsByNombreIgnoreCaseAndIdInsumoNot(nombre, id)) {
            throw new IllegalStateException("Ya existe otro insumo llamado '" + nombre + "'.");
        }
        insumo.setNombre(nombre);
        aplicarDatosBasicos(insumo, datos);
        if (datos.getEstado() != null) {
            insumo.setEstado(datos.getEstado());
        }
        return insumoRepository.save(insumo);
    }

    private void aplicarDatosBasicos(Insumo destino, Insumo datos) {
        if (datos.getUnidadMedida() == null) {
            throw new IllegalArgumentException("Indica la unidad de medida del insumo.");
        }
        BigDecimal minimo = datos.getStockMinimo() != null ? datos.getStockMinimo() : BigDecimal.ZERO;
        BigDecimal costo = datos.getCostoUnitario() != null ? datos.getCostoUnitario() : BigDecimal.ZERO;
        if (minimo.signum() < 0) {
            throw new IllegalArgumentException("El stock minimo no puede ser negativo.");
        }
        if (costo.signum() < 0) {
            throw new IllegalArgumentException("El costo unitario no puede ser negativo.");
        }
        destino.setUnidadMedida(datos.getUnidadMedida());
        destino.setStockMinimo(minimo);
        destino.setCostoUnitario(costo);
        destino.setArea(datos.getArea() != null ? datos.getArea() : AreaInsumo.GENERAL);
        destino.setProveedorHabitual(resolverProveedor(datos.getProveedorHabitual() != null
                ? datos.getProveedorHabitual().getIdProveedor() : null));
    }

    private Proveedor resolverProveedor(Integer idProveedor) {
        if (idProveedor == null) {
            return null;
        }
        return proveedorRepository.findById(idProveedor)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + idProveedor));
    }

    private static String nombreLimpio(String nombre, String mensaje) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException(mensaje);
        }
        return nombre.trim();
    }

    // ---------- Recetas ----------

    public List<RecetaDetalle> listarReceta(@NonNull Integer idProducto) {
        return recetaDetalleRepository.findByProductoIdProducto(idProducto);
    }

    /** Todos los productos con cuantos insumos llevan y cuanto cuesta una unidad: de ahi sale "sin receta". */
    public List<ResumenReceta> resumenRecetas() {
        Map<Integer, List<RecetaDetalle>> porProducto = new HashMap<>();
        for (RecetaDetalle linea : recetaDetalleRepository.findAllConInsumo()) {
            porProducto.computeIfAbsent(linea.getId().getIdProducto(), k -> new ArrayList<>()).add(linea);
        }
        List<ResumenReceta> resumen = new ArrayList<>();
        for (Producto p : productoRepository.findAll()) {
            if (!Boolean.TRUE.equals(p.getEstado())) {
                continue;
            }
            List<RecetaDetalle> lineas = porProducto.getOrDefault(p.getIdProducto(), List.of());
            BigDecimal costo = BigDecimal.ZERO;
            for (RecetaDetalle l : lineas) {
                costo = costo.add(l.getCantidad().multiply(costoDe(l.getInsumo())));
            }
            costo = costo.setScale(2, RoundingMode.HALF_UP);
            BigDecimal margen = p.getPrecioVenta() != null ? p.getPrecioVenta().subtract(costo) : null;
            resumen.add(new ResumenReceta(p.getIdProducto(), p.getNombre(), p.getCategoria(),
                    p.getPrecioVenta(), lineas.size(), costo, margen, lineas.isEmpty()));
        }
        resumen.sort(Comparator.comparing((ResumenReceta r) -> r.categoria().name())
                .thenComparing(ResumenReceta::nombre));
        return resumen;
    }

    /** Reemplaza por completo la receta de un producto. */
    @Transactional
    public List<RecetaDetalle> guardarReceta(@NonNull Integer idProducto, List<RecetaDetalle> lineas) {
        Producto producto = productoRepository.findById(idProducto)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + idProducto));

        List<RecetaDetalle> aGuardar = new ArrayList<>();
        java.util.Set<Integer> vistos = new java.util.HashSet<>();
        for (RecetaDetalle linea : lineas == null ? List.<RecetaDetalle>of() : lineas) {
            Integer idInsumo = linea.getInsumo() != null ? linea.getInsumo().getIdInsumo() : null;
            if (idInsumo == null) {
                throw new IllegalArgumentException("Cada linea de receta debe indicar el insumo.");
            }
            if (linea.getCantidad() == null || linea.getCantidad().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("La cantidad de la receta debe ser mayor a cero.");
            }
            if (!vistos.add(idInsumo)) {
                throw new IllegalArgumentException(
                        "Un insumo aparece dos veces en la receta; suma las cantidades en una sola linea.");
            }
            Insumo insumo = obtenerInsumo(idInsumo);
            if (!Boolean.TRUE.equals(insumo.getEstado())) {
                throw new IllegalStateException("El insumo '" + insumo.getNombre() + "' esta inactivo.");
            }
            RecetaDetalle detalle = new RecetaDetalle();
            detalle.setId(new RecetaDetalleId(idProducto, idInsumo));
            detalle.setProducto(producto);
            detalle.setInsumo(insumo);
            detalle.setCantidad(linea.getCantidad());
            aGuardar.add(detalle);
        }

        recetaDetalleRepository.deleteByProductoIdProducto(idProducto);
        // Sin el flush, Hibernate puede ordenar los INSERT antes del DELETE y chocar con la PK.
        recetaDetalleRepository.flush();
        return aGuardar.isEmpty() ? List.of() : recetaDetalleRepository.saveAll(aGuardar);
    }

    // ---------- Movimientos ----------

    public List<MovimientoInventario> listarMovimientos(FiltroMovimientos filtro, AreaInsumo areaRestringida) {
        FiltroMovimientos f = filtro != null ? filtro : new FiltroMovimientos(null, null, null, null, false, null);
        int limite = f.limite() == null ? LIMITE_POR_DEFECTO : Math.min(Math.max(f.limite(), 1), LIMITE_MAXIMO);

        Specification<MovimientoInventario> spec = (root, query, cb) -> cb.conjunction();
        if (f.idInsumo() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("insumo").get("idInsumo"), f.idInsumo()));
        }
        if (f.tipo() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("tipoMovimiento"), f.tipo()));
        }
        if (f.desde() != null) {
            spec = spec.and((root, q, cb) ->
                    cb.greaterThanOrEqualTo(root.get("fechaHora"), f.desde().atStartOfDay()));
        }
        if (f.hasta() != null) {
            spec = spec.and((root, q, cb) ->
                    cb.lessThan(root.get("fechaHora"), f.hasta().plusDays(1).atStartOfDay()));
        }
        if (f.soloFaltantes()) {
            spec = spec.and((root, q, cb) -> cb.greaterThan(root.<BigDecimal>get("cantidadFaltante"), BigDecimal.ZERO));
        }
        if (areaRestringida != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("insumo").get("area"), areaRestringida));
        }
        return movimientoRepository
                .findAll(spec, PageRequest.of(0, limite, Sort.by(Sort.Direction.DESC, "fechaHora", "idMovimiento")))
                .getContent();
    }

    /**
     * Movimiento manual: compra (ENTRADA) o merma. Una merma no puede dejar el stock negativo
     * (a diferencia de la venta, aqui alguien esta mirando el almacen y puede corregir la cifra).
     */
    @Transactional
    public MovimientoInventario registrarMovimiento(Integer idInsumo, TipoMovInventario tipo,
                                                    BigDecimal cantidad, String referencia,
                                                    Empleado empleado, BigDecimal costoUnitario,
                                                    Integer idProveedor, AreaInsumo areaRestringida) {
        if (tipo != TipoMovInventario.ENTRADA && tipo != TipoMovInventario.AJUSTE_MERMA) {
            throw new IllegalArgumentException(
                    "Solo se registran a mano entradas y mermas; los consumos salen de las ventas y los sobrantes de un conteo.");
        }
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("La cantidad del movimiento debe ser mayor a cero.");
        }
        if (costoUnitario != null && costoUnitario.signum() < 0) {
            throw new IllegalArgumentException("El costo unitario no puede ser negativo.");
        }
        Insumo insumo = obtenerInsumo(idInsumo, areaRestringida);
        if (!Boolean.TRUE.equals(insumo.getEstado())) {
            throw new IllegalStateException("El insumo '" + insumo.getNombre() + "' esta inactivo.");
        }

        if (tipo == TipoMovInventario.AJUSTE_MERMA) {
            if (referencia == null || referencia.isBlank()) {
                throw new IllegalArgumentException("Indica el motivo de la merma.");
            }
            BigDecimal disponible = stockDe(insumo);
            if (cantidad.compareTo(disponible) > 0) {
                throw new IllegalStateException("No hay stock suficiente: disponible " + disponible.stripTrailingZeros().toPlainString()
                        + " " + insumo.getUnidadMedida() + ".");
            }
        }
        Proveedor proveedor = tipo == TipoMovInventario.ENTRADA ? resolverProveedor(idProveedor) : null;
        BigDecimal delta = tipo == TipoMovInventario.ENTRADA ? cantidad : cantidad.negate();
        return aplicar(insumo, tipo, cantidad, delta, referencia, empleado,
                tipo == TipoMovInventario.ENTRADA ? costoUnitario : null, proveedor);
    }

    /**
     * Conteo fisico: el stock pasa a ser lo contado. La diferencia queda como sobrante o merma con su
     * motivo. Devuelve null si el conteo coincide con el sistema (no hay nada que ajustar).
     */
    @Transactional
    public MovimientoInventario registrarConteo(Integer idInsumo, BigDecimal stockContado, String motivo,
                                                Empleado empleado, AreaInsumo areaRestringida) {
        if (stockContado == null || stockContado.signum() < 0) {
            throw new IllegalArgumentException("El stock contado no puede ser negativo.");
        }
        Insumo insumo = obtenerInsumo(idInsumo, areaRestringida);
        BigDecimal diferencia = stockContado.subtract(stockDe(insumo));
        if (diferencia.signum() == 0) {
            return null;
        }
        String detalle = "Conteo fisico" + (motivo != null && !motivo.isBlank() ? ": " + motivo.trim() : "");
        TipoMovInventario tipo = diferencia.signum() > 0
                ? TipoMovInventario.AJUSTE_INGRESO : TipoMovInventario.AJUSTE_MERMA;
        return aplicar(insumo, tipo, diferencia.abs(), diferencia, detalle, empleado, null, null);
    }

    /**
     * Descuenta del almacen los insumos de la receta del producto vendido (RF19).
     * Un producto sin receta no genera movimientos.
     */
    @Transactional
    public List<String> descontarPorReceta(Producto producto, Short cantidadVendida,
                                           String referencia, Empleado empleado) {
        return movimientoPorReceta(producto, cantidadVendida, TipoMovInventario.SALIDA_CONSUMO, referencia, empleado);
    }

    /**
     * Devuelve al almacen lo que descontaron los movimientos de un consumo (referencia "CONSUMO-n") cuando ese consumo se
     * anula. Solo vuelve lo que de verdad habia salido (cantidad menos faltante); los movimientos originales se conservan.
     */
    @Transactional
    public void revertirConsumo(String referenciaOriginal, String referenciaNueva, Empleado empleado) {
        for (MovimientoInventario m : movimientoRepository
                .findByReferenciaOrigenAndTipoMovimiento(referenciaOriginal, TipoMovInventario.SALIDA_CONSUMO)) {
            BigDecimal faltante = m.getCantidadFaltante() != null ? m.getCantidadFaltante() : BigDecimal.ZERO;
            BigDecimal devolver = m.getCantidad().subtract(faltante);
            if (devolver.signum() > 0) {
                aplicar(m.getInsumo(), TipoMovInventario.DEVOLUCION_CONSUMO, devolver, devolver,
                        referenciaNueva, empleado, null, null);
            }
        }
    }

    /**
     * Registra como merma los insumos de una preparacion que se cancelo cuando ya se habia empezado a cocinar
     * o a servir: el huesped no la paga, pero el insumo ya se uso y no vuelve al almacen.
     */
    @Transactional
    public void mermarPorReceta(Producto producto, Short cantidad, String referencia, Empleado empleado) {
        movimientoPorReceta(producto, cantidad, TipoMovInventario.AJUSTE_MERMA, referencia, empleado);
    }

    /** Devuelve un aviso por cada insumo que no alcanzo (la operacion igual se registra: la venta no se frena). */
    private List<String> movimientoPorReceta(Producto producto, Short cantidadVendida, TipoMovInventario tipo,
                                             String referencia, Empleado empleado) {
        List<String> avisos = new ArrayList<>();
        if (producto == null || producto.getIdProducto() == null
                || cantidadVendida == null || cantidadVendida <= 0) {
            return avisos;
        }
        List<RecetaDetalle> receta = recetaDetalleRepository
                .findByProductoIdProducto(producto.getIdProducto());

        for (RecetaDetalle linea : receta) {
            if (linea.getInsumo() == null || linea.getCantidad() == null) {
                continue;
            }
            BigDecimal requerido = linea.getCantidad()
                    .multiply(BigDecimal.valueOf(cantidadVendida));
            MovimientoInventario mov = aplicar(linea.getInsumo(), tipo,
                    requerido, requerido.negate(), referencia, empleado, null, null);
            if (mov.getCantidadFaltante() != null && mov.getCantidadFaltante().signum() > 0) {
                avisos.add("Stock insuficiente de " + linea.getInsumo().getNombre() + ": faltaron "
                        + mov.getCantidadFaltante().stripTrailingZeros().toPlainString() + " " + linea.getInsumo().getUnidadMedida());
            }
        }
        return avisos;
    }

    /**
     * Aplica el delta al stock y deja el movimiento registrado.
     * La venta no se frena por un faltante de registro: el stock no baja de cero, el movimiento queda con
     * la cantidad pedida y {@code cantidadFaltante} dice cuanto no estaba en el almacen, para auditarlo.
     */
    private MovimientoInventario aplicar(Insumo insumo, TipoMovInventario tipo, BigDecimal cantidad,
                                         BigDecimal delta, String referencia, Empleado empleado,
                                         BigDecimal costoUnitario, Proveedor proveedor) {
        BigDecimal resultante = stockDe(insumo).add(delta);
        BigDecimal faltante = BigDecimal.ZERO;
        if (resultante.signum() < 0) {
            faltante = resultante.negate();
            resultante = BigDecimal.ZERO;
            log.warn("Stock insuficiente de '{}': faltaron {} {} ({})", insumo.getNombre(),
                    faltante, insumo.getUnidadMedida(), referencia);
        }
        insumo.setStockActual(resultante);
        if (tipo == TipoMovInventario.ENTRADA && costoUnitario != null && costoUnitario.signum() > 0) {
            insumo.setCostoUnitario(costoUnitario);
        }
        insumoRepository.save(insumo);

        MovimientoInventario mov = new MovimientoInventario();
        mov.setInsumo(insumo);
        mov.setTipoMovimiento(tipo);
        mov.setCantidad(cantidad);
        mov.setStockResultante(resultante);
        mov.setCantidadFaltante(faltante);
        mov.setReferenciaOrigen(referencia);
        mov.setEmpleado(empleado);
        mov.setCostoUnitario(costoUnitario);
        mov.setProveedor(proveedor);
        mov.setFechaHora(LocalDateTime.now());
        return movimientoRepository.save(mov);
    }

    private static BigDecimal stockDe(Insumo insumo) {
        return insumo.getStockActual() != null ? insumo.getStockActual() : BigDecimal.ZERO;
    }

    private static BigDecimal costoDe(Insumo insumo) {
        return insumo.getCostoUnitario() != null ? insumo.getCostoUnitario() : BigDecimal.ZERO;
    }

    // ---------- Reportes y alertas ----------

    /** Consumo, mermas y valorizacion del almacen en un rango de fechas (ambas inclusive). */
    public ReporteInventario reporte(LocalDate desde, LocalDate hasta, AreaInsumo areaRestringida) {
        LocalDate fin = hasta != null ? hasta : LocalDate.now();
        LocalDate inicio = desde != null ? desde : fin.minusDays(29);
        if (inicio.isAfter(fin)) {
            throw new IllegalArgumentException("La fecha inicial es posterior a la final.");
        }

        Map<Integer, Map<TipoMovInventario, BigDecimal>> cantidades = new HashMap<>();
        Map<Integer, BigDecimal> faltantes = new HashMap<>();
        for (Object[] fila : movimientoRepository.totalesPorInsumoYTipo(
                inicio.atStartOfDay(), fin.plusDays(1).atStartOfDay())) {
            Integer idInsumo = (Integer) fila[0];
            TipoMovInventario tipo = (TipoMovInventario) fila[1];
            cantidades.computeIfAbsent(idInsumo, k -> new EnumMap<>(TipoMovInventario.class))
                    .put(tipo, (BigDecimal) fila[2]);
            faltantes.merge(idInsumo, (BigDecimal) fila[3], BigDecimal::add);
        }

        List<Insumo> insumos = listarInsumos(areaRestringida);
        BigDecimal valorizacion = BigDecimal.ZERO;
        BigDecimal costoConsumoTotal = BigDecimal.ZERO;
        BigDecimal costoMermaTotal = BigDecimal.ZERO;
        List<FilaReporte> filas = new ArrayList<>();
        for (Insumo i : insumos) {
            if (Boolean.TRUE.equals(i.getEstado())) {
                valorizacion = valorizacion.add(stockDe(i).multiply(costoDe(i)));
            }
            Map<TipoMovInventario, BigDecimal> c = cantidades.getOrDefault(i.getIdInsumo(), Map.of());
            // El consumo es neto: lo que salio menos lo que volvio por consumos anulados.
            BigDecimal consumido = c.getOrDefault(TipoMovInventario.SALIDA_CONSUMO, BigDecimal.ZERO)
                    .subtract(c.getOrDefault(TipoMovInventario.DEVOLUCION_CONSUMO, BigDecimal.ZERO));
            BigDecimal merma = c.getOrDefault(TipoMovInventario.AJUSTE_MERMA, BigDecimal.ZERO);
            BigDecimal entradas = c.getOrDefault(TipoMovInventario.ENTRADA, BigDecimal.ZERO);
            BigDecimal sobrante = c.getOrDefault(TipoMovInventario.AJUSTE_INGRESO, BigDecimal.ZERO);
            BigDecimal faltante = faltantes.getOrDefault(i.getIdInsumo(), BigDecimal.ZERO);
            if (consumido.signum() == 0 && c.getOrDefault(TipoMovInventario.DEVOLUCION_CONSUMO, BigDecimal.ZERO).signum() == 0 && merma.signum() == 0 && entradas.signum() == 0
                    && sobrante.signum() == 0 && faltante.signum() == 0) {
                continue;
            }
            BigDecimal costoConsumo = dinero(consumido.multiply(costoDe(i)));
            BigDecimal costoMerma = dinero(merma.multiply(costoDe(i)));
            costoConsumoTotal = costoConsumoTotal.add(costoConsumo);
            costoMermaTotal = costoMermaTotal.add(costoMerma);
            filas.add(new FilaReporte(i.getIdInsumo(), i.getNombre(), String.valueOf(i.getUnidadMedida()),
                    i.getArea(), entradas, consumido, merma, sobrante, faltante, costoConsumo, costoMerma));
        }
        filas.sort(Comparator.comparing(FilaReporte::costoConsumo).reversed()
                .thenComparing(FilaReporte::nombre));

        long bajos = insumos.stream().filter(i -> Boolean.TRUE.equals(i.getEstado())
                && stockDe(i).compareTo(i.getStockMinimo() != null ? i.getStockMinimo() : BigDecimal.ZERO) <= 0).count();
        long agotados = insumos.stream().filter(i -> Boolean.TRUE.equals(i.getEstado())
                && stockDe(i).signum() <= 0).count();
        return new ReporteInventario(inicio, fin, dinero(valorizacion), bajos, agotados,
                costoConsumoTotal, costoMermaTotal, filas);
    }

    /** Cifras para el dashboard: lo que necesita atencion hoy. */
    public Map<String, Object> alertas() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("insumosStockBajo", insumoRepository.countConStockBajo());
        m.put("insumosAgotados", insumoRepository.countAgotados());
        m.put("faltantesUltimos7Dias", movimientoRepository.countConFaltanteDesde(LocalDateTime.now().minusDays(7)));
        return m;
    }

    private static BigDecimal dinero(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    // ---------- Proveedores ----------

    public List<Proveedor> listarProveedores() {
        return proveedorRepository.findAllByOrderByNombre();
    }

    @Transactional
    public Proveedor crearProveedor(Proveedor datos) {
        String nombre = nombreLimpio(datos.getNombre(), "El proveedor necesita un nombre.");
        if (proveedorRepository.existsByNombreIgnoreCase(nombre)) {
            throw new IllegalStateException("Ya existe un proveedor llamado '" + nombre + "'.");
        }
        Proveedor proveedor = new Proveedor();
        proveedor.setNombre(nombre);
        copiarContacto(proveedor, datos);
        proveedor.setEstado(true);
        return proveedorRepository.save(proveedor);
    }

    @Transactional
    public Proveedor actualizarProveedor(@NonNull Integer id, Proveedor datos) {
        Proveedor proveedor = proveedorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));
        String nombre = nombreLimpio(datos.getNombre(), "El proveedor necesita un nombre.");
        if (proveedorRepository.existsByNombreIgnoreCaseAndIdProveedorNot(nombre, id)) {
            throw new IllegalStateException("Ya existe otro proveedor llamado '" + nombre + "'.");
        }
        proveedor.setNombre(nombre);
        copiarContacto(proveedor, datos);
        if (datos.getEstado() != null) {
            proveedor.setEstado(datos.getEstado());
        }
        return proveedorRepository.save(proveedor);
    }

    private static void copiarContacto(Proveedor destino, Proveedor datos) {
        destino.setContacto(datos.getContacto());
        destino.setTelefono(datos.getTelefono());
        destino.setEmail(datos.getEmail());
    }
}
