package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Comandas contra inventario: solo se pide lo que se puede preparar en esa area, y el descuento por receta
 * ocurre una sola vez, al entregar.
 */
@ExtendWith(MockitoExtension.class)
class ComandaServiceTest {

    @Mock
    ComandaRepository comandaRepository;
    @Mock
    DetalleComandaRepository detalleComandaRepository;
    @Mock
    EstadiaRepository estadiaRepository;
    @Mock
    ProductoRepository productoRepository;
    @Mock
    ConsumoEstadiaRepository consumoEstadiaRepository;
    @Mock
    InventarioService inventarioService;
    @Mock
    UsuarioActualService usuarioActualService;

    private ComandaService servicio;

    @BeforeEach
    void preparar() {
        servicio = new ComandaService(comandaRepository, detalleComandaRepository, estadiaRepository,
                productoRepository, consumoEstadiaRepository, inventarioService, usuarioActualService);
    }

    private Producto producto(int id, String nombre, CategoriaProducto categoria, boolean activo) {
        Producto p = new Producto();
        p.setIdProducto(id);
        p.setNombre(nombre);
        p.setCategoria(categoria);
        p.setPrecioVenta(new BigDecimal("12"));
        p.setEstado(activo);
        return p;
    }

    private Estadia estadiaEnCurso() {
        Estadia e = new Estadia();
        e.setIdEstadia(1);
        e.setEstadoEstadia(EstadoEstadia.EN_CURSO);
        when(estadiaRepository.findById(1)).thenReturn(Optional.of(e));
        when(usuarioActualService.obtenerEmpleado()).thenReturn(new Empleado());
        when(comandaRepository.save(any(Comanda.class))).thenAnswer(inv -> inv.getArgument(0));
        return e;
    }

    private NuevaComandaRequest pedido(AreaDestino area, int idProducto) {
        NuevaComandaRequest r = new NuevaComandaRequest();
        r.setIdEstadia(1);
        r.setAreaDestino(area);
        NuevaComandaRequest.ItemComanda item = new NuevaComandaRequest.ItemComanda();
        item.setIdProducto(idProducto);
        item.setCantidad((short) 1);
        r.setItems(List.of(item));
        return r;
    }

    @Test
    void unProductoDesactivadoNoSePuedePedir() {
        estadiaEnCurso();
        when(productoRepository.findById(5)).thenReturn(Optional.of(producto(5, "Sopa", CategoriaProducto.COCINA, false)));

        assertThrows(IllegalStateException.class, () -> servicio.crear(pedido(AreaDestino.COCINA, 5)));
        verify(detalleComandaRepository, never()).saveAll(any());
    }

    @Test
    void unProductoDeCocinaNoSePideAlBar() {
        estadiaEnCurso();
        when(productoRepository.findById(5)).thenReturn(Optional.of(producto(5, "Sandwich", CategoriaProducto.COCINA, true)));

        assertThrows(IllegalStateException.class, () -> servicio.crear(pedido(AreaDestino.BAR, 5)));
    }

    @Test
    void unProductoDeBarNoSePideALaCocina() {
        estadiaEnCurso();
        when(productoRepository.findById(6)).thenReturn(Optional.of(producto(6, "Cerveza", CategoriaProducto.BAR, true)));

        assertThrows(IllegalStateException.class, () -> servicio.crear(pedido(AreaDestino.COCINA, 6)));
    }

    @Test
    void laVentaDirectaAceptaCualquierProductoActivo() {
        estadiaEnCurso();
        when(productoRepository.findById(7)).thenReturn(Optional.of(producto(7, "Toalla extra", CategoriaProducto.DIRECTO, true)));

        servicio.crear(pedido(AreaDestino.VENTA_DIRECTA, 7));

        verify(detalleComandaRepository).saveAll(any());
    }

    @Test
    void entregarCargaElFolioYDescuentaLaRecetaUnaSolaVez() {
        Estadia estadia = new Estadia();
        estadia.setIdEstadia(1);
        Empleado cocinero = new Empleado();
        Comanda comanda = new Comanda();
        comanda.setIdComanda(9);
        comanda.setEstadia(estadia);
        comanda.setEmpleado(cocinero);
        comanda.setEstadoComanda(EstadoComanda.PREPARADA);
        Producto sandwich = producto(5, "Sandwich", CategoriaProducto.COCINA, true);
        DetalleComanda detalle = new DetalleComanda();
        detalle.setComanda(comanda);
        detalle.setProducto(sandwich);
        detalle.setCantidad((short) 2);
        detalle.setPrecioUnitario(new BigDecimal("12"));
        detalle.setSubtotal(new BigDecimal("24"));
        when(comandaRepository.findByIdParaActualizar(9)).thenReturn(Optional.of(comanda));
        when(detalleComandaRepository.findByComandaIdComanda(9)).thenReturn(List.of(detalle));

        servicio.cambiarEstado(9, EstadoComanda.ENTREGADA);

        verify(consumoEstadiaRepository).save(any(ConsumoEstadia.class));
        verify(inventarioService).descontarPorReceta(eq(sandwich), eq((short) 2), eq("COMANDA-9"), eq(cocinero));
    }

    @Test
    void unaComandaYaEntregadaNoSeVuelveACobrarNiDescontar() {
        Comanda comanda = new Comanda();
        comanda.setIdComanda(9);
        comanda.setEstadoComanda(EstadoComanda.ENTREGADA);
        when(comandaRepository.findByIdParaActualizar(9)).thenReturn(Optional.of(comanda));
        when(comandaRepository.findById(9)).thenReturn(Optional.of(comanda));

        servicio.cambiarEstado(9, EstadoComanda.ENTREGADA);

        verify(consumoEstadiaRepository, never()).save(any());
        verify(inventarioService, never()).descontarPorReceta(any(), any(), any(), any());
    }

    private Comanda comandaCon(EstadoComanda estado, Producto producto) {
        Empleado cocinero = new Empleado();
        Comanda comanda = new Comanda();
        comanda.setIdComanda(9);
        comanda.setEmpleado(cocinero);
        comanda.setEstadoComanda(estado);
        DetalleComanda detalle = new DetalleComanda();
        detalle.setComanda(comanda);
        detalle.setProducto(producto);
        detalle.setCantidad((short) 2);
        when(comandaRepository.findByIdParaActualizar(9)).thenReturn(Optional.of(comanda));
        when(detalleComandaRepository.findByComandaIdComanda(9)).thenReturn(List.of(detalle));
        return comanda;
    }

    @Test
    void cadaCambioDeEstadoQuedaConSuHoraParaMedirTiemposDePreparacion() {
        Comanda comanda = comandaCon(EstadoComanda.PENDIENTE, producto(5, "Sandwich", CategoriaProducto.COCINA, true));

        servicio.cambiarEstado(9, EstadoComanda.EN_PREPARACION);
        servicio.cambiarEstado(9, EstadoComanda.PREPARADA);

        org.junit.jupiter.api.Assertions.assertNotNull(comanda.getFechaEnPreparacion());
        org.junit.jupiter.api.Assertions.assertNotNull(comanda.getFechaPreparada());
        org.junit.jupiter.api.Assertions.assertNull(comanda.getFechaEntregada());
        org.junit.jupiter.api.Assertions.assertNull(comanda.getFechaCancelada());
    }

    @Test
    void entregarYCancelarTambienGuardanSuHora() {
        Comanda entregada = comandaCon(EstadoComanda.PREPARADA, producto(5, "Sandwich", CategoriaProducto.COCINA, true));
        entregada.setEstadia(new Estadia());
        servicio.cambiarEstado(9, EstadoComanda.ENTREGADA);
        org.junit.jupiter.api.Assertions.assertNotNull(entregada.getFechaEntregada());
    }

    @Test
    void cancelarUnaComandaPendienteNoTocaElInventario() {
        comandaCon(EstadoComanda.PENDIENTE, producto(5, "Sandwich", CategoriaProducto.COCINA, true));

        servicio.cambiarEstado(9, EstadoComanda.CANCELADA);

        verify(inventarioService, never()).descontarPorReceta(any(), any(), any(), any());
        verify(inventarioService, never()).mermarPorReceta(any(), any(), any(), any());
        verify(consumoEstadiaRepository, never()).save(any());
    }

    @Test
    void cancelarUnaComandaEnPreparacionRegistraMermaYNoCobra() {
        Producto sandwich = producto(5, "Sandwich", CategoriaProducto.COCINA, true);
        Comanda comanda = comandaCon(EstadoComanda.EN_PREPARACION, sandwich);

        servicio.cambiarEstado(9, EstadoComanda.CANCELADA);

        verify(inventarioService).mermarPorReceta(eq(sandwich), eq((short) 2), eq("MERMA-COMANDA-9"), eq(comanda.getEmpleado()));
        verify(inventarioService, never()).descontarPorReceta(any(), any(), any(), any());
        verify(consumoEstadiaRepository, never()).save(any());
    }

    @Test
    void cancelarUnaComandaYaPreparadaTambienRegistraMerma() {
        Producto cerveza = producto(6, "Cerveza", CategoriaProducto.BAR, true);
        comandaCon(EstadoComanda.PREPARADA, cerveza);

        servicio.cambiarEstado(9, EstadoComanda.CANCELADA);

        verify(inventarioService).mermarPorReceta(eq(cerveza), eq((short) 2), eq("MERMA-COMANDA-9"), any());
    }
}
