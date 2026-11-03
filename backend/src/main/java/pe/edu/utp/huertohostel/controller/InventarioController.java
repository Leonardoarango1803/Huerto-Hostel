package pe.edu.utp.huertohostel.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.AreaInsumo;
import pe.edu.utp.huertohostel.entity.Insumo;
import pe.edu.utp.huertohostel.entity.MovimientoInventario;
import pe.edu.utp.huertohostel.entity.Proveedor;
import pe.edu.utp.huertohostel.entity.RecetaDetalle;
import pe.edu.utp.huertohostel.entity.TipoMovInventario;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.InventarioService;
import pe.edu.utp.huertohostel.service.InventarioService.FiltroMovimientos;
import pe.edu.utp.huertohostel.service.InventarioService.ReporteInventario;
import pe.edu.utp.huertohostel.service.InventarioService.ResumenReceta;
import pe.edu.utp.huertohostel.service.UsuarioActualService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/inventario")
public class InventarioController {

    private final InventarioService inventarioService;
    private final UsuarioActualService usuarioActualService;

    public InventarioController(InventarioService inventarioService,
                                UsuarioActualService usuarioActualService) {
        this.inventarioService = inventarioService;
        this.usuarioActualService = usuarioActualService;
    }

    /** Housekeeping solo ve y mueve los insumos de limpieza; el resto del personal de almacen ve todo. */
    private AreaInsumo areaRestringida() {
        return usuarioActualService.tieneRol(Roles.HOUSEKEEPING) ? AreaInsumo.LIMPIEZA : null;
    }

    // ---------- Insumos ----------

    @GetMapping("/insumos")
    @PreAuthorize(Roles.INVENTARIO_OPERA)
    public ResponseEntity<List<Insumo>> listarInsumos() {
        return ResponseEntity.ok(inventarioService.listarInsumos(areaRestringida()));
    }

    @GetMapping("/insumos/stock-bajo")
    @PreAuthorize(Roles.INVENTARIO_OPERA)
    public ResponseEntity<List<Insumo>> listarStockBajo() {
        return ResponseEntity.ok(inventarioService.listarConStockBajo(areaRestringida()));
    }

    @PostMapping("/insumos")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Insumo> crearInsumo(@RequestBody Insumo insumo) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventarioService.crearInsumo(insumo, usuarioActualService.obtenerEmpleado()));
    }

    @PutMapping("/insumos/{id}")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Insumo> actualizarInsumo(@PathVariable @NonNull Integer id,
                                                   @RequestBody Insumo datos) {
        return ResponseEntity.ok(inventarioService.actualizarInsumo(id, datos));
    }

    // ---------- Recetas ----------

    /** Todos los productos activos con su cantidad de insumos y costo: de aqui sale "sin receta". */
    @GetMapping("/recetas")
    @PreAuthorize(Roles.INVENTARIO)
    public ResponseEntity<List<ResumenReceta>> resumenRecetas() {
        return ResponseEntity.ok(inventarioService.resumenRecetas());
    }

    @GetMapping("/recetas/{idProducto}")
    @PreAuthorize(Roles.INVENTARIO)
    public ResponseEntity<List<RecetaDetalle>> listarReceta(@PathVariable @NonNull Integer idProducto) {
        return ResponseEntity.ok(inventarioService.listarReceta(idProducto));
    }

    @PutMapping("/recetas/{idProducto}")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<List<RecetaDetalle>> guardarReceta(@PathVariable @NonNull Integer idProducto,
                                                             @RequestBody List<RecetaDetalle> lineas) {
        return ResponseEntity.ok(inventarioService.guardarReceta(idProducto, lineas));
    }

    // ---------- Movimientos ----------

    @GetMapping("/movimientos")
    @PreAuthorize(Roles.INVENTARIO_OPERA)
    public ResponseEntity<List<MovimientoInventario>> listarMovimientos(
            @RequestParam(required = false) Integer idInsumo,
            @RequestParam(required = false) TipoMovInventario tipo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean soloFaltantes,
            @RequestParam(required = false) Integer limite) {
        FiltroMovimientos filtro = new FiltroMovimientos(idInsumo, tipo, desde, hasta, soloFaltantes, limite);
        return ResponseEntity.ok(inventarioService.listarMovimientos(filtro, areaRestringida()));
    }

    /** Entrada (compra, con costo y proveedor opcionales) o merma (con motivo). */
    @PostMapping("/movimientos")
    @PreAuthorize(Roles.INVENTARIO_OPERA)
    public ResponseEntity<MovimientoInventario> registrarMovimiento(@RequestBody Map<String, Object> body) {
        Integer idInsumo = entero(body.get("idInsumo"));
        Object tipoCrudo = body.get("tipoMovimiento");
        if (tipoCrudo == null) {
            throw new IllegalArgumentException("Debe indicar el tipo de movimiento.");
        }
        TipoMovInventario tipo = TipoMovInventario.valueOf(String.valueOf(tipoCrudo));
        MovimientoInventario mov = inventarioService.registrarMovimiento(
                idInsumo, tipo, decimal(body.get("cantidad")), texto(body.get("referenciaOrigen")),
                usuarioActualService.obtenerEmpleado(), decimal(body.get("costoUnitario")),
                entero(body.get("idProveedor")), areaRestringida());
        return ResponseEntity.status(HttpStatus.CREATED).body(mov);
    }

    /** Conteo fisico: deja el stock en lo contado y registra la diferencia. */
    @PostMapping("/conteos")
    @PreAuthorize(Roles.INVENTARIO_OPERA)
    public ResponseEntity<Map<String, Object>> registrarConteo(@RequestBody Map<String, Object> body) {
        MovimientoInventario mov = inventarioService.registrarConteo(
                entero(body.get("idInsumo")), decimal(body.get("stockContado")), texto(body.get("motivo")),
                usuarioActualService.obtenerEmpleado(), areaRestringida());
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("ajustado", mov != null);
        respuesta.put("movimiento", mov);
        return ResponseEntity.status(mov != null ? HttpStatus.CREATED : HttpStatus.OK).body(respuesta);
    }

    // ---------- Reportes ----------

    @GetMapping("/reportes/consumo")
    @PreAuthorize(Roles.INVENTARIO_OPERA)
    public ResponseEntity<ReporteInventario> reporteConsumo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(inventarioService.reporte(desde, hasta, areaRestringida()));
    }

    // ---------- Proveedores ----------

    @GetMapping("/proveedores")
    @PreAuthorize(Roles.INVENTARIO)
    public ResponseEntity<List<Proveedor>> listarProveedores() {
        return ResponseEntity.ok(inventarioService.listarProveedores());
    }

    @PostMapping("/proveedores")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Proveedor> crearProveedor(@RequestBody Proveedor proveedor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventarioService.crearProveedor(proveedor));
    }

    @PutMapping("/proveedores/{id}")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Proveedor> actualizarProveedor(@PathVariable @NonNull Integer id,
                                                         @RequestBody Proveedor datos) {
        return ResponseEntity.ok(inventarioService.actualizarProveedor(id, datos));
    }

    // ---------- Lectura del body ----------

    private static Integer entero(Object valor) {
        if (valor == null || String.valueOf(valor).isBlank()) {
            return null;
        }
        return new BigDecimal(String.valueOf(valor)).intValueExact();
    }

    private static BigDecimal decimal(Object valor) {
        if (valor == null || String.valueOf(valor).isBlank()) {
            return null;
        }
        return new BigDecimal(String.valueOf(valor));
    }

    private static String texto(Object valor) {
        return valor != null ? String.valueOf(valor) : null;
    }
}
