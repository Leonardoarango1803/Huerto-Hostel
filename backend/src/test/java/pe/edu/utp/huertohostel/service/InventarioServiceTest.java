package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.utp.huertohostel.entity.AreaInsumo;
import pe.edu.utp.huertohostel.entity.Insumo;
import pe.edu.utp.huertohostel.entity.MovimientoInventario;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.RecetaDetalle;
import pe.edu.utp.huertohostel.entity.RecetaDetalleId;
import pe.edu.utp.huertohostel.entity.TipoMovInventario;
import pe.edu.utp.huertohostel.entity.UnidadMedida;
import pe.edu.utp.huertohostel.repository.InsumoRepository;
import pe.edu.utp.huertohostel.repository.MovimientoInventarioRepository;
import pe.edu.utp.huertohostel.repository.ProductoRepository;
import pe.edu.utp.huertohostel.repository.ProveedorRepository;
import pe.edu.utp.huertohostel.repository.RecetaDetalleRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas del almacen: el descuento por receta nunca frena una venta pero deja el faltante a la vista,
 * y las correcciones manuales (merma, conteo) si se validan contra lo que hay.
 */
@ExtendWith(MockitoExtension.class)
class InventarioServiceTest {

    @Mock
    InsumoRepository insumoRepository;
    @Mock
    RecetaDetalleRepository recetaDetalleRepository;
    @Mock
    MovimientoInventarioRepository movimientoRepository;
    @Mock
    ProveedorRepository proveedorRepository;
    @Mock
    ProductoRepository productoRepository;

    private InventarioService servicio;

    @BeforeEach
    void preparar() {
        servicio = new InventarioService(insumoRepository, recetaDetalleRepository,
                movimientoRepository, proveedorRepository, productoRepository);
    }

    private Insumo insumo(int id, String stock, AreaInsumo area) {
        Insumo i = new Insumo();
        i.setIdInsumo(id);
        i.setNombre("Insumo " + id);
        i.setUnidadMedida(UnidadMedida.GR);
        i.setStockActual(new BigDecimal(stock));
        i.setStockMinimo(BigDecimal.ZERO);
        i.setCostoUnitario(BigDecimal.ZERO);
        i.setArea(area);
        i.setEstado(true);
        return i;
    }

    /** save() devuelve lo que recibe, como un repositorio real. */
    private void guardarDevuelveLoRecibido() {
        when(insumoRepository.save(any(Insumo.class))).thenAnswer(inv -> inv.getArgument(0));
        when(movimientoRepository.save(any(MovimientoInventario.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private MovimientoInventario ultimoMovimiento() {
        ArgumentCaptor<MovimientoInventario> c = ArgumentCaptor.forClass(MovimientoInventario.class);
        verify(movimientoRepository).save(c.capture());
        return c.getValue();
    }

    private void recetaDe(int idProducto, Insumo insumo, String cantidad) {
        RecetaDetalle linea = new RecetaDetalle();
        linea.setId(new RecetaDetalleId(idProducto, insumo.getIdInsumo()));
        linea.setInsumo(insumo);
        linea.setCantidad(new BigDecimal(cantidad));
        when(recetaDetalleRepository.findByProductoIdProducto(idProducto)).thenReturn(List.of(linea));
    }

    private Producto producto(int id) {
        Producto p = new Producto();
        p.setIdProducto(id);
        return p;
    }

    // ---------- Descuento por receta ----------

    @Test
    void descuentaLaRecetaPorCadaUnidadVendida() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "1000", AreaInsumo.COCINA);
        recetaDe(7, harina, "150");

        servicio.descontarPorReceta(producto(7), (short) 2, "COMANDA-9", null);

        assertEquals(0, new BigDecimal("700").compareTo(harina.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(TipoMovInventario.SALIDA_CONSUMO, mov.getTipoMovimiento());
        assertEquals(0, new BigDecimal("300").compareTo(mov.getCantidad()));
        assertEquals(0, BigDecimal.ZERO.compareTo(mov.getCantidadFaltante()));
    }

    @Test
    void descontarPorRecetaAvisaDeLosInsumosQueNoAlcanzaron() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        harina.setNombre("Harina");
        recetaDe(7, harina, "150");

        List<String> avisos = servicio.descontarPorReceta(producto(7), (short) 1, "CONSUMO-3", null);

        assertEquals(1, avisos.size());
        assertTrue(avisos.get(0).contains("Harina") && avisos.get(0).contains("50"), avisos.get(0));
        assertTrue(servicio.descontarPorReceta(producto(7), (short) 0, "CONSUMO-4", null).isEmpty());
    }

    @Test
    void anularUnConsumoDevuelveAlAlmacenSoloLoQueDeVerdadHabiaSalido() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "0", AreaInsumo.COCINA);
        MovimientoInventario salida = new MovimientoInventario();
        salida.setInsumo(harina);
        salida.setTipoMovimiento(TipoMovInventario.SALIDA_CONSUMO);
        salida.setCantidad(new BigDecimal("150"));
        salida.setCantidadFaltante(new BigDecimal("50")); // de 150 pedidos solo habia 100
        when(movimientoRepository.findByReferenciaOrigenAndTipoMovimiento("CONSUMO-3", TipoMovInventario.SALIDA_CONSUMO))
                .thenReturn(List.of(salida));

        servicio.revertirConsumo("CONSUMO-3", "ANULA-CONSUMO-3", null);

        assertEquals(0, new BigDecimal("100").compareTo(harina.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(TipoMovInventario.DEVOLUCION_CONSUMO, mov.getTipoMovimiento());
        assertEquals("ANULA-CONSUMO-3", mov.getReferenciaOrigen());
    }

    @Test
    void sinStockSuficienteNoFrenaLaVentaPeroRegistraElFaltante() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        recetaDe(7, harina, "150");

        servicio.descontarPorReceta(producto(7), (short) 1, "COMANDA-9", null);

        assertEquals(0, BigDecimal.ZERO.compareTo(harina.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(0, new BigDecimal("150").compareTo(mov.getCantidad()), "queda lo que la receta pidio");
        assertEquals(0, new BigDecimal("50").compareTo(mov.getCantidadFaltante()), "y cuanto no estaba");
    }

    @Test
    void mermarPorRecetaRegistraMermaDeLosInsumosDeLaPreparacion() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "1000", AreaInsumo.COCINA);
        recetaDe(7, harina, "150");

        servicio.mermarPorReceta(producto(7), (short) 2, "MERMA-COMANDA-9", null);

        assertEquals(0, new BigDecimal("700").compareTo(harina.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(TipoMovInventario.AJUSTE_MERMA, mov.getTipoMovimiento());
        assertEquals("MERMA-COMANDA-9", mov.getReferenciaOrigen());
    }

    @Test
    void productoSinRecetaNoGeneraMovimientos() {
        when(recetaDetalleRepository.findByProductoIdProducto(7)).thenReturn(List.of());

        servicio.descontarPorReceta(producto(7), (short) 3, "CONSUMO-1", null);

        verify(movimientoRepository, never()).save(any());
    }

    // ---------- Movimientos manuales ----------

    @Test
    void laEntradaConCostoActualizaElCostoUnitarioDelInsumo() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "10", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        servicio.registrarMovimiento(1, TipoMovInventario.ENTRADA, new BigDecimal("40"), "Factura F-1",
                null, new BigDecimal("0.0125"), null, null);

        assertEquals(0, new BigDecimal("50").compareTo(harina.getStockActual()));
        assertEquals(0, new BigDecimal("0.0125").compareTo(harina.getCostoUnitario()));
    }

    @Test
    void unaMermaMayorAlStockSeRechazaYNoTocaNada() {
        Insumo harina = insumo(1, "10", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        assertThrows(IllegalStateException.class, () -> servicio.registrarMovimiento(
                1, TipoMovInventario.AJUSTE_MERMA, new BigDecimal("11"), "Se cayo", null, null, null, null));

        assertEquals(0, new BigDecimal("10").compareTo(harina.getStockActual()));
        verify(movimientoRepository, never()).save(any());
    }

    @Test
    void unaMermaExigeMotivo() {
        Insumo harina = insumo(1, "10", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        assertThrows(IllegalArgumentException.class, () -> servicio.registrarMovimiento(
                1, TipoMovInventario.AJUSTE_MERMA, BigDecimal.ONE, "  ", null, null, null, null));
    }

    @Test
    void elConsumoNoSeRegistraAMano() {
        assertThrows(IllegalArgumentException.class, () -> servicio.registrarMovimiento(
                1, TipoMovInventario.SALIDA_CONSUMO, BigDecimal.ONE, "x", null, null, null, null));
    }

    // ---------- Conteo fisico ----------

    @Test
    void unConteoMayorAlSistemaRegistraSobrante() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        servicio.registrarConteo(1, new BigDecimal("130"), "Cierre de mes", null, null);

        assertEquals(0, new BigDecimal("130").compareTo(harina.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(TipoMovInventario.AJUSTE_INGRESO, mov.getTipoMovimiento());
        assertEquals(0, new BigDecimal("30").compareTo(mov.getCantidad()));
    }

    @Test
    void unConteoMenorAlSistemaRegistraMerma() {
        guardarDevuelveLoRecibido();
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        servicio.registrarConteo(1, new BigDecimal("80"), null, null, null);

        assertEquals(0, new BigDecimal("80").compareTo(harina.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(TipoMovInventario.AJUSTE_MERMA, mov.getTipoMovimiento());
        assertEquals(0, new BigDecimal("20").compareTo(mov.getCantidad()));
    }

    @Test
    void unConteoIgualAlSistemaNoHaceNada() {
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        assertNull(servicio.registrarConteo(1, new BigDecimal("100"), null, null, null));

        verify(movimientoRepository, never()).save(any());
    }

    // ---------- Housekeeping ----------

    @Test
    void housekeepingNoPuedeMoverUnInsumoDeCocina() {
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));

        assertThrows(AccessDeniedException.class, () -> servicio.registrarMovimiento(
                1, TipoMovInventario.ENTRADA, BigDecimal.TEN, null, null, null, null, AreaInsumo.LIMPIEZA));
    }

    @Test
    void housekeepingSiMueveUnInsumoDeLimpieza() {
        guardarDevuelveLoRecibido();
        Insumo detergente = insumo(2, "5", AreaInsumo.LIMPIEZA);
        when(insumoRepository.findById(2)).thenReturn(Optional.of(detergente));

        servicio.registrarMovimiento(2, TipoMovInventario.ENTRADA, BigDecimal.TEN, null, null, null, null,
                AreaInsumo.LIMPIEZA);

        assertEquals(0, new BigDecimal("15").compareTo(detergente.getStockActual()));
    }

    // ---------- Altas y recetas ----------

    @Test
    void unStockInicialEntraComoMovimientoParaQueElKardexCuadre() {
        guardarDevuelveLoRecibido();
        when(insumoRepository.existsByNombreIgnoreCase("Harina")).thenReturn(false);

        Insumo datos = new Insumo();
        datos.setNombre(" Harina ");
        datos.setUnidadMedida(UnidadMedida.GR);
        datos.setStockActual(new BigDecimal("500"));

        Insumo creado = servicio.crearInsumo(datos, null);

        assertEquals("Harina", creado.getNombre());
        assertEquals(0, new BigDecimal("500").compareTo(creado.getStockActual()));
        MovimientoInventario mov = ultimoMovimiento();
        assertEquals(TipoMovInventario.ENTRADA, mov.getTipoMovimiento());
        assertEquals("Stock inicial", mov.getReferenciaOrigen());
    }

    @Test
    void noSePermiteUnInsumoConNombreRepetido() {
        Insumo datos = new Insumo();
        datos.setNombre("harina");
        datos.setUnidadMedida(UnidadMedida.GR);
        when(insumoRepository.existsByNombreIgnoreCase("harina")).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> servicio.crearInsumo(datos, null));
        verify(insumoRepository, never()).save(any());
    }

    @Test
    void unaRecetaConElMismoInsumoDosVecesSeRechazaSinBorrarLaAnterior() {
        when(productoRepository.findById(7)).thenReturn(Optional.of(producto(7)));
        Insumo harina = insumo(1, "100", AreaInsumo.COCINA);
        when(insumoRepository.findById(1)).thenReturn(Optional.of(harina));
        RecetaDetalle linea = new RecetaDetalle();
        linea.setInsumo(harina);
        linea.setCantidad(BigDecimal.TEN);

        assertThrows(IllegalArgumentException.class,
                () -> servicio.guardarReceta(7, List.of(linea, linea)));

        verify(recetaDetalleRepository, never()).deleteByProductoIdProducto(any());
    }

    // ---------- Vender un insumo (atajo: producto + receta de un solo insumo) ----------

    private Insumo gaseosa() {
        Insumo i = insumo(27, "50", AreaInsumo.GENERAL);
        i.setNombre("Gaseosa Inka Kola 500ml");
        i.setUnidadMedida(UnidadMedida.UND);
        when(insumoRepository.findById(27)).thenReturn(Optional.of(i));
        return i;
    }

    private void productoSeGuarda() {
        when(productoRepository.save(any(Producto.class))).thenAnswer(inv -> {
            Producto p = inv.getArgument(0);
            p.setIdProducto(40);
            return p;
        });
    }

    @Test
    void venderUnInsumoCreaElProductoActivoYSuRecetaDeUnaUnidad() {
        Insumo gaseosa = gaseosa();
        productoSeGuarda();

        Producto p = servicio.venderInsumo(27, null, pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR, new BigDecimal("5"), null, null);

        assertEquals("Gaseosa Inka Kola 500ml", p.getNombre(), "sin nombre propio usa el del insumo");
        assertEquals(pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR, p.getCategoria());
        assertEquals(0, new BigDecimal("5.00").compareTo(p.getPrecioVenta()));
        assertTrue(p.getEstado());
        ArgumentCaptor<RecetaDetalle> c = ArgumentCaptor.forClass(RecetaDetalle.class);
        verify(recetaDetalleRepository).save(c.capture());
        assertEquals(new RecetaDetalleId(40, 27), c.getValue().getId());
        assertEquals(gaseosa, c.getValue().getInsumo());
        assertEquals(0, BigDecimal.ONE.compareTo(c.getValue().getCantidad()), "por defecto 1 por venta");
    }

    @Test
    void laCantidadPorVentaSePuedeElegirParaInsumosAGranel() {
        Insumo vino = insumo(30, "2000", AreaInsumo.BAR);
        vino.setUnidadMedida(UnidadMedida.ML);
        when(insumoRepository.findById(30)).thenReturn(Optional.of(vino));
        productoSeGuarda();

        servicio.venderInsumo(30, "  Copa de vino  ", pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR, new BigDecimal("12.5"), new BigDecimal("150"), "Tinto");

        ArgumentCaptor<RecetaDetalle> c = ArgumentCaptor.forClass(RecetaDetalle.class);
        verify(recetaDetalleRepository).save(c.capture());
        assertEquals(0, new BigDecimal("150").compareTo(c.getValue().getCantidad()));
        ArgumentCaptor<Producto> p = ArgumentCaptor.forClass(Producto.class);
        verify(productoRepository).save(p.capture());
        assertEquals("Copa de vino", p.getValue().getNombre());
        assertEquals("Tinto", p.getValue().getDescripcion());
    }

    @Test
    void siElInsumoYaEstaEnLaRecetaDeUnProductoActivoSeRechazaYNoSeCreaNada() {
        Insumo gaseosa = gaseosa();
        Producto existente = producto(9);
        existente.setNombre("Inka Kola 500ml");
        existente.setEstado(true);
        RecetaDetalle linea = new RecetaDetalle();
        linea.setId(new RecetaDetalleId(9, 27));
        linea.setProducto(existente);
        linea.setInsumo(gaseosa);
        linea.setCantidad(BigDecimal.ONE);
        when(recetaDetalleRepository.findAllConInsumo()).thenReturn(List.of(linea));

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, null,
                pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR, new BigDecimal("5"), null, null));

        assertTrue(e.getMessage().contains("Inka Kola 500ml"));
        verify(productoRepository, never()).save(any());
        verify(recetaDetalleRepository, never()).save(any());
    }

    @Test
    void unProductoDesactivadoNoCuentaComoUsoDelInsumo() {
        Insumo gaseosa = gaseosa();
        productoSeGuarda();
        Producto viejo = producto(9);
        viejo.setNombre("Inka vieja");
        viejo.setEstado(false);
        RecetaDetalle linea = new RecetaDetalle();
        linea.setId(new RecetaDetalleId(9, 27));
        linea.setProducto(viejo);
        linea.setInsumo(gaseosa);
        linea.setCantidad(BigDecimal.ONE);
        when(recetaDetalleRepository.findAllConInsumo()).thenReturn(List.of(linea));

        servicio.venderInsumo(27, null, pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR, new BigDecimal("5"), null, null);

        verify(recetaDetalleRepository).save(any(RecetaDetalle.class));
    }

    @Test
    void noSePermiteUnNombreRepetidoNiPrecioCeroNiCantidadCeroNiCategoriaVacia() {
        gaseosa();
        Producto otro = producto(3);
        otro.setNombre("INKA KOLA 500ML");
        otro.setEstado(true);
        when(productoRepository.findAll()).thenReturn(List.of(otro));
        var bar = pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR;

        assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, "Inka Kola 500ml", bar, new BigDecimal("5"), null, null));
        assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, "Otra", bar, BigDecimal.ZERO, null, null));
        assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, "Otra", bar, null, null, null));
        assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, "Otra", bar, new BigDecimal("5"), BigDecimal.ZERO, null));
        assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, "Otra", null, new BigDecimal("5"), null, null));
        verify(productoRepository, never()).save(any());
    }

    @Test
    void unInsumoInactivoNoSePuedeVender() {
        Insumo i = gaseosa();
        i.setEstado(false);

        assertThrows(IllegalStateException.class, () -> servicio.venderInsumo(27, null,
                pe.edu.utp.huertohostel.entity.CategoriaProducto.BAR, new BigDecimal("5"), null, null));
        verify(productoRepository, never()).save(any());
    }

    @Test
    void elUsoPorInsumoListaSoloLosProductosActivosOrdenados() {
        Insumo gaseosa = insumo(27, "50", AreaInsumo.GENERAL);
        Producto b = producto(2); b.setNombre("Zumo"); b.setEstado(true);
        Producto a = producto(1); a.setNombre("combo"); a.setEstado(true);
        Producto off = producto(3); off.setNombre("Viejo"); off.setEstado(false);
        List<RecetaDetalle> lineas = new java.util.ArrayList<>();
        for (Producto p : List.of(b, a, off)) {
            RecetaDetalle l = new RecetaDetalle();
            l.setId(new RecetaDetalleId(p.getIdProducto(), 27));
            l.setProducto(p);
            l.setInsumo(gaseosa);
            l.setCantidad(BigDecimal.ONE);
            lineas.add(l);
        }
        when(recetaDetalleRepository.findAllConInsumo()).thenReturn(lineas);

        assertEquals(List.of("combo", "Zumo"), servicio.productosPorInsumo().get(27));
    }
}
