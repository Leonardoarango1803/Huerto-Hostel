package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Check-out: con caja cerrada solo puede salir quien no tiene nada que cobrar. Hay un huesped que
 * se va a las 5 a.m. y ya pago todo: no se le puede dejar esperando a que abra la caja.
 */
@ExtendWith(MockitoExtension.class)
class EstadiaServiceTest {

    @Mock
    EstadiaRepository estadiaRepository;
    @Mock
    ConsumoEstadiaRepository consumoEstadiaRepository;
    @Mock
    PagoRepository pagoRepository;
    @Mock
    HabitacionRepository habitacionRepository;
    @Mock
    ReservaRepository reservaRepository;
    @Mock
    LimpiezaService limpiezaService;
    @Mock
    PagoService pagoService;
    @Mock
    CajaService cajaService;
    @Mock
    InventarioService inventarioService;
    @Mock
    UsuarioActualService usuarioActualService;
    @Mock
    pe.edu.utp.huertohostel.repository.ProductoRepository productoRepository;
    @Mock
    pe.edu.utp.huertohostel.repository.ConsumoAnuladoRepository consumoAnuladoRepository;
    @Mock
    pe.edu.utp.huertohostel.repository.MovimientoCajaRepository movimientoCajaRepository;
    @Mock
    pe.edu.utp.huertohostel.repository.ComandaRepository comandaRepository;
    @Mock
    pe.edu.utp.huertohostel.repository.SolicitudServicioRepository solicitudRepository;
    @Mock
    AuditoriaGestionService auditoriaService;

    /** Sin incidencias abiertas: el mock del repositorio responde false. */
    private final BloqueoPorIncidencia bloqueo = new BloqueoPorIncidencia(
            org.mockito.Mockito.mock(pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository.class));

    private EstadiaService servicio() {
        return new EstadiaService(estadiaRepository, consumoEstadiaRepository, pagoRepository,
                habitacionRepository, reservaRepository, limpiezaService, pagoService, cajaService,
                inventarioService, usuarioActualService, bloqueo, productoRepository, consumoAnuladoRepository,
                movimientoCajaRepository, comandaRepository, solicitudRepository, auditoriaService);
    }

    /** Estadia 1 de la reserva 10, alojamiento S/ 100 y sin consumos; {@code pagado} es lo ya cobrado. */
    private Estadia estadiaConSaldo(String pagado) {
        Habitacion habitacion = new Habitacion();
        habitacion.setIdHabitacion(2);
        habitacion.setEstadoOperativo(EstadoOperativoHab.OCUPADA);
        Reserva reserva = new Reserva();
        reserva.setIdReserva(10);
        reserva.setEstadoReserva(EstadoReserva.EN_CURSO);
        reserva.setMontoAlojamientoTotal(new BigDecimal("100"));
        Estadia estadia = new Estadia();
        estadia.setIdEstadia(1);
        estadia.setReserva(reserva);
        estadia.setHabitacion(habitacion);
        estadia.setEstadoEstadia(EstadoEstadia.EN_CURSO);

        when(estadiaRepository.findById(1)).thenReturn(Optional.of(estadia));
        // lenient: con un pago final el servicio exige la caja sin calcular el saldo, asi que no siempre se consultan
        lenient().when(consumoEstadiaRepository.sumTotalByEstadia(1)).thenReturn(BigDecimal.ZERO);
        lenient().when(pagoRepository.sumMontoByReservaOrEstadia(1, 10)).thenReturn(new BigDecimal(pagado));
        return estadia;
    }

    @Test
    void conSaldoCeroYSinPagoFinalSeSaleConLaCajaCerrada() {
        Estadia estadia = estadiaConSaldo("100");

        servicio().realizarCheckout(1, null);

        verify(cajaService, never()).exigirCajaAbiertaSiEsPersonal();
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
        assertEquals(EstadoReserva.COMPLETADA, estadia.getReserva().getEstadoReserva());
        assertEquals(EstadoOperativoHab.PENDIENTE_LIMPIEZA, estadia.getHabitacion().getEstadoOperativo());
        verify(limpiezaService).crearPara(any(), any(), any());
    }

    @Test
    void siUnaIncidenciaBloqueaLaHabitacionAlSalirElHuespedVaAMantenimientoYNoALimpieza() {
        Estadia estadia = estadiaConSaldo("100");
        pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository incidencias =
                org.mockito.Mockito.mock(pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository.class);
        when(incidencias.existsByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoIn(2,
                pe.edu.utp.huertohostel.entity.EstadoIncidencia.ABIERTAS)).thenReturn(true);
        EstadiaService conBloqueo = new EstadiaService(estadiaRepository, consumoEstadiaRepository, pagoRepository,
                habitacionRepository, reservaRepository, limpiezaService, pagoService, cajaService,
                inventarioService, usuarioActualService, new BloqueoPorIncidencia(incidencias),
                productoRepository, consumoAnuladoRepository, movimientoCajaRepository, comandaRepository,
                solicitudRepository, auditoriaService);

        conBloqueo.realizarCheckout(1, null);

        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
        assertEquals(EstadoOperativoHab.MANTENIMIENTO, estadia.getHabitacion().getEstadoOperativo(),
                "la averia que la bloqueaba sigue abierta: no se vende ni se manda a limpiar");
        verify(limpiezaService, never()).crearPara(any(), any(), any());
    }

    @Test
    void conSaldoPendienteLaCajaCerradaImpideElCheckoutAntesDeTocarNada() {
        Estadia estadia = estadiaConSaldo("0"); // debe 100
        doThrow(new IllegalStateException("La caja esta cerrada.")).when(cajaService).exigirCajaAbiertaSiEsPersonal();

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null));

        verify(pagoService, never()).registrar(any());
        verify(estadiaRepository, never()).save(any());
        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
        verify(limpiezaService, never()).crearPara(any(), any(), any());
    }

    @Test
    void unPagoFinalConLaCajaCerradaNoSeGuardaNiCierraLaEstadia() {
        Estadia estadia = estadiaConSaldo("0");
        doThrow(new IllegalStateException("La caja esta cerrada.")).when(cajaService).exigirCajaAbiertaSiEsPersonal();

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, pagoFinal("100")));

        verify(pagoService, never()).registrar(any());
        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
    }

    @Test
    void elPagoFinalPasaPorPagoServiceParaEntrarAlTurnoYAlArqueo() {
        Estadia estadia = estadiaConSaldo("100"); // tras registrar el pago final el saldo queda en cero
        Pago pagoFinal = pagoFinal("100");

        servicio().realizarCheckout(1, pagoFinal);

        verify(cajaService).exigirCajaAbiertaSiEsPersonal();
        verify(pagoService).registrar(pagoFinal);
        assertEquals(estadia, pagoFinal.getEstadia());
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
    }

    @Test
    void unConsumoCargadoDirectoDescuentaElInventarioPorReceta() {
        estadiaConSaldo("0");
        Producto cerveza = producto(4, "Cerveza artesanal", "12", true);
        ConsumoEstadia consumo = new ConsumoEstadia();
        consumo.setProducto(cerveza);
        consumo.setCantidad((short) 2);
        consumo.setPrecioUnitario(new BigDecimal("12"));
        consumo.setIdConsumo(5);
        when(consumoEstadiaRepository.save(consumo)).thenReturn(consumo);

        servicio().registrarConsumo(1, consumo);

        verify(inventarioService).descontarPorReceta(eq(cerveza), eq((short) 2), eq("CONSUMO-5"), any());
    }

    // ------------------------------------------------------------------ consumos: controles del servidor

    private Producto producto(int id, String nombre, String precio, boolean activo) {
        Producto p = new Producto();
        p.setIdProducto(id);
        p.setNombre(nombre);
        p.setPrecioVenta(new BigDecimal(precio));
        p.setEstado(activo);
        lenient().when(productoRepository.findById(id)).thenReturn(Optional.of(p));
        return p;
    }

    private void guardarConsumos() {
        lenient().when(consumoEstadiaRepository.save(any())).thenAnswer(i -> {
            ConsumoEstadia c = i.getArgument(0);
            if (c.getIdConsumo() == null) c.setIdConsumo(70);
            return c;
        });
        lenient().when(consumoEstadiaRepository.findById(70)).thenAnswer(i -> Optional.empty());
    }

    @Test
    void elPrecioDeUnConsumoDirectoSaleSiempreDelCatalogo() {
        estadiaConSaldo("0");
        producto(8, "Cerveza artesanal", "12.00", true);
        guardarConsumos();

        EstadiaService.ResultadoConsumos r = servicio().registrarDirectos(1,
                java.util.List.of(new EstadiaService.ItemConsumo(8, 3)));

        ConsumoEstadia c = r.consumos().get(0);
        assertEquals(new BigDecimal("12.00"), c.getPrecioUnitario());
        assertEquals(new BigDecimal("36.00"), c.getTotalConsumo());
        assertEquals("DIRECTO", c.getOrigen());
    }

    @Test
    void sinEstadiaEnCursoNoSeCargaNadaAlFolio() {
        Estadia estadia = estadiaConSaldo("0");
        estadia.setEstadoEstadia(EstadoEstadia.FINALIZADA);
        producto(8, "Cerveza", "12", true);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().registrarDirectos(1, java.util.List.of(new EstadiaService.ItemConsumo(8, 1))));

        assertTrue(e.getMessage().contains("ya no esta en curso"), e.getMessage());
        verify(consumoEstadiaRepository, never()).save(any());
    }

    @Test
    void unProductoDesactivadoNoSePuedeCargar() {
        estadiaConSaldo("0");
        producto(9, "Vino de la casa", "18", false);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().registrarDirectos(1, java.util.List.of(new EstadiaService.ItemConsumo(9, 1))));

        assertTrue(e.getMessage().contains("desactivado"), e.getMessage());
    }

    @Test
    void laCantidadDebeEstarEntre1Y99() {
        estadiaConSaldo("0");
        producto(8, "Cerveza", "12", true);
        for (Integer mala : new Integer[]{0, -2, 100, null}) {
            assertThrows(IllegalStateException.class,
                    () -> servicio().registrarDirectos(1, java.util.List.of(new EstadiaService.ItemConsumo(8, mala))), String.valueOf(mala));
        }
        verify(consumoEstadiaRepository, never()).save(any());
    }

    @Test
    void siUnaLineaDelLoteEstaMalNoSeGuardaNingunaDeLasDemas() {
        estadiaConSaldo("0");
        producto(8, "Cerveza", "12", true);
        guardarConsumos();

        assertThrows(IllegalStateException.class, () -> servicio().registrarDirectos(1, java.util.List.of(
                new EstadiaService.ItemConsumo(8, 1), new EstadiaService.ItemConsumo(8, 500))));

        verify(consumoEstadiaRepository, never()).save(any());
        verify(inventarioService, never()).descontarPorReceta(any(), any(), any(), any());
    }

    @Test
    void unLoteVacioOExcesivoSeRechaza() {
        estadiaConSaldo("0");
        assertThrows(IllegalStateException.class, () -> servicio().registrarDirectos(1, java.util.List.of()));
        java.util.List<EstadiaService.ItemConsumo> demasiados = new java.util.ArrayList<>();
        for (int i = 0; i < 31; i++) demasiados.add(new EstadiaService.ItemConsumo(8, 1));
        assertThrows(IllegalStateException.class, () -> servicio().registrarDirectos(1, demasiados));
    }

    @Test
    void losAvisosDeStockLlegaranAQuienVende() {
        estadiaConSaldo("0");
        producto(8, "Sandwich", "12", true);
        guardarConsumos();
        when(inventarioService.descontarPorReceta(any(), any(), any(), any())).thenReturn(java.util.List.of("Stock insuficiente de Pan: faltaron 50 UN"));

        EstadiaService.ResultadoConsumos r = servicio().registrarDirectos(1, java.util.List.of(new EstadiaService.ItemConsumo(8, 1)));

        assertEquals(java.util.List.of("Stock insuficiente de Pan: faltaron 50 UN"), r.advertencias());
    }

    private ConsumoEstadia consumoGuardado(Estadia estadia, String origen) {
        ConsumoEstadia c = new ConsumoEstadia();
        c.setIdConsumo(5);
        c.setEstadia(estadia);
        c.setProducto(producto(8, "Cerveza", "12", true));
        c.setCantidad((short) 2);
        c.setPrecioUnitario(new BigDecimal("12"));
        c.setTotalConsumo(new BigDecimal("24"));
        c.setOrigen(origen);
        when(consumoEstadiaRepository.findById(5)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    void anularUnConsumoDevuelveElStockLoBorraDelFolioYDejaConstancia() {
        Estadia estadia = estadiaConSaldo("0");
        ConsumoEstadia c = consumoGuardado(estadia, "DIRECTO");
        when(consumoAnuladoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        pe.edu.utp.huertohostel.entity.ConsumoAnulado r = servicio().anularConsumo(1, 5, "Me equivoque de producto");

        verify(inventarioService).revertirConsumo(eq("CONSUMO-5"), eq("ANULA-CONSUMO-5"), any());
        verify(consumoEstadiaRepository).delete(c);
        assertEquals("Me equivoque de producto", r.getMotivo());
        assertEquals(new BigDecimal("24"), r.getTotalConsumo());
        assertEquals(5, r.getIdConsumoOriginal());
    }

    @Test
    void anularExigeElMotivo() {
        Estadia estadia = estadiaConSaldo("0");
        consumoGuardado(estadia, "DIRECTO");
        assertThrows(IllegalStateException.class, () -> servicio().anularConsumo(1, 5, "   "));
        verify(consumoEstadiaRepository, never()).delete(any(ConsumoEstadia.class));
        verify(inventarioService, never()).revertirConsumo(any(), any(), any());
    }

    @Test
    void unConsumoQueVieneDeUnaComandaSeGestionaDesdeComandas() {
        Estadia estadia = estadiaConSaldo("0");
        ConsumoEstadia c = consumoGuardado(estadia, "COMANDA");
        pe.edu.utp.huertohostel.entity.Comanda comanda = new pe.edu.utp.huertohostel.entity.Comanda();
        comanda.setIdComanda(22);
        c.setComanda(comanda);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().anularConsumo(1, 5, "x"));

        assertTrue(e.getMessage().contains("comanda #22"), e.getMessage());
        verify(consumoEstadiaRepository, never()).delete(any(ConsumoEstadia.class));
    }

    @Test
    void despuesDelCheckoutElFolioNoSeToca() {
        Estadia estadia = estadiaConSaldo("0");
        estadia.setEstadoEstadia(EstadoEstadia.FINALIZADA);
        assertThrows(IllegalStateException.class, () -> servicio().anularConsumo(1, 5, "x"));
        verify(inventarioService, never()).revertirConsumo(any(), any(), any());
    }

    @Test
    void unConsumoDeOtraEstadiaNoSeAnulaDesdeEstaUrl() {
        Estadia estadia = estadiaConSaldo("0");
        Estadia otra = new Estadia();
        otra.setIdEstadia(99);
        consumoGuardado(otra, "DIRECTO");
        assertThrows(jakarta.persistence.EntityNotFoundException.class, () -> servicio().anularConsumo(1, 5, "x"));
        assertEquals(1, estadia.getIdEstadia());
    }

    // ------------------------------------------------------------------ check-out: noches, saldo a favor y deuda

    /** Estadia de {@code noches} noches a S/ 100 cada una, con ingreso real {@code diasAtras} dias atras. */
    private Estadia estadiaDeNoches(int noches, int diasAtras, String pagado) {
        Estadia estadia = estadiaConSaldo(pagado);
        estadia.getReserva().setNumNoches((short) noches);
        estadia.getReserva().setMontoAlojamientoTotal(new BigDecimal(noches * 100));
        estadia.getReserva().setFechaCheckinPrevisto(java.time.LocalDate.now().minusDays(diasAtras));
        estadia.getReserva().setFechaCheckoutPrevisto(java.time.LocalDate.now().minusDays(diasAtras).plusDays(noches));
        estadia.setFechaCheckinReal(java.time.LocalDateTime.now().minusDays(diasAtras));
        return estadia;
    }

    private static EstadiaService.OpcionesCheckout opciones(boolean ajustar, boolean devolver, boolean forzar, String motivo) {
        return new EstadiaService.OpcionesCheckout(ajustar, devolver, forzar, motivo);
    }

    @Test
    void siSeVaAntesYSeAjustanLasNochesSoloSeCobraLoUsadoYSeDevuelveLoDeMas() {
        Estadia estadia = estadiaDeNoches(5, 0, "500"); // reservo 5 noches, se va hoy mismo y ya habia pagado todo

        servicio().realizarCheckout(1, null, opciones(true, true, false, null));

        assertEquals((short) 1, estadia.getReserva().getNumNoches());
        assertEquals(0, new BigDecimal("100.00").compareTo(estadia.getReserva().getMontoAlojamientoTotal()));
        assertEquals(java.time.LocalDate.now().plusDays(1), estadia.getReserva().getFechaCheckoutPrevisto(),
                "la salida prevista sigue a las noches: ingreso + 1 noche (la base exige salida mayor al ingreso)");
        assertTrue(estadia.getReserva().getObservaciones().contains("de 5 a 1 noche"));
        verify(cajaService).registrarDevolucion(eq(1), org.mockito.ArgumentMatchers.argThat(m -> m.compareTo(new BigDecimal("400")) == 0), any());
        verify(auditoriaService).registrar(eq("CHECKOUT_NOCHES_AJUSTADAS"), any(), any());
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
    }

    @Test
    void siSeQuedoDeMasYSeAjustanLasNochesSeCobranLasQueUso() {
        Estadia estadia = estadiaDeNoches(2, 4, "400"); // reservo 2 noches, lleva 4 y ya pago esas 4

        servicio().realizarCheckout(1, null, opciones(true, false, false, null));

        assertEquals((short) 4, estadia.getReserva().getNumNoches());
        assertEquals(0, new BigDecimal("400.00").compareTo(estadia.getReserva().getMontoAlojamientoTotal()));
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
    }

    @Test
    void ajustarNochesSinDiferenciaSeRechazaYNoCierraNada() {
        Estadia estadia = estadiaDeNoches(1, 0, "100");

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null, opciones(true, false, false, null)));

        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
        verify(auditoriaService, never()).registrar(any(), any(), any());
    }

    @Test
    void sinAjustarNochesElAlojamientoQuedaComoSeReservo() {
        Estadia estadia = estadiaDeNoches(5, 0, "500");

        servicio().realizarCheckout(1, null);

        assertEquals((short) 5, estadia.getReserva().getNumNoches());
        assertEquals(0, new BigDecimal("500").compareTo(estadia.getReserva().getMontoAlojamientoTotal()));
    }

    @Test
    void unSaldoAFavorSinDevolverNoSePuedeCerrar() {
        Estadia estadia = estadiaConSaldo("150"); // alojamiento 100: el huesped dejo 50 de mas

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null));

        assertTrue(e.getMessage().contains("saldo a favor"));
        verify(cajaService, never()).registrarDevolucion(any(), any(), any());
        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
    }

    @Test
    void unSaldoAFavorDevueltoSaleDeLaCajaYCierraLaEstadia() {
        Estadia estadia = estadiaConSaldo("150");

        servicio().realizarCheckout(1, null, opciones(false, true, false, null));

        verify(cajaService).exigirCajaAbiertaSiEsPersonal();
        verify(cajaService).registrarDevolucion(eq(1), org.mockito.ArgumentMatchers.argThat(m -> m.compareTo(new BigDecimal("50")) == 0), any());
        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
    }

    @Test
    void sinForzarUnSaldoPendienteImpideLaSalidaYDiceCuantoDebe() {
        Estadia estadia = estadiaConSaldo("40"); // debe 60

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null));

        assertTrue(e.getMessage().contains("Saldo pendiente: S/ 60"));
        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
    }

    @Test
    void elAdministradorPuedeAutorizarLaSalidaConDeudaConMotivoYQuedaRegistrada() {
        Estadia estadia = estadiaConSaldo("40"); // debe 60
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);

        servicio().realizarCheckout(1, null, opciones(false, false, true, "  Pagara por transferencia manana  "));

        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
        assertTrue(estadia.isSalidaForzada());
        assertEquals("Pagara por transferencia manana", estadia.getMotivoSalidaForzada());
        assertEquals(0, new BigDecimal("60").compareTo(estadia.getSaldoAlSalir()));
        verify(cajaService, never()).exigirCajaAbiertaSiEsPersonal();
        verify(auditoriaService).registrar(eq("CHECKOUT_CON_DEUDA"), any(), any());
    }

    @Test
    void siNoEsAdministradorNoPuedeForzarLaSalida() {
        Estadia estadia = estadiaConSaldo("40");
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(false);

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> servicio().realizarCheckout(1, null, opciones(false, false, true, "porque si")));

        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
        verify(auditoriaService, never()).registrar(any(), any(), any());
    }

    @Test
    void forzarLaSalidaSinMotivoSeRechaza() {
        Estadia estadia = estadiaConSaldo("40");
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null, opciones(false, false, true, "  ")));

        assertEquals(EstadoEstadia.EN_CURSO, estadia.getEstadoEstadia());
    }

    @Test
    void forzarConSaldoCeroNoMarcaDeudaAlguna() {
        Estadia estadia = estadiaConSaldo("100");
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);

        servicio().realizarCheckout(1, null, opciones(false, false, true, "por si acaso"));

        assertEquals(EstadoEstadia.FINALIZADA, estadia.getEstadoEstadia());
        assertTrue(!estadia.isSalidaForzada());
        verify(auditoriaService, never()).registrar(any(), any(), any());
    }

    @Test
    void unaEstadiaYaFinalizadaNoSeCierraDeNuevo() {
        Estadia estadia = estadiaConSaldo("100");
        estadia.setEstadoEstadia(EstadoEstadia.FINALIZADA);

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckout(1, null));

        verify(limpiezaService, never()).crearPara(any(), any(), any());
    }

    @Test
    void elFolioInformaLasNochesRealesElAjusteYLoQueSigueAbierto() {
        estadiaDeNoches(5, 0, "100");
        when(comandaRepository.countByEstadiaIdEstadiaAndEstadoComandaIn(eq(1), any())).thenReturn(2L);
        when(solicitudRepository.countByEstadiaIdEstadiaAndEstadoIn(eq(1), any())).thenReturn(3L);
        when(solicitudRepository.countByEstadiaIdEstadiaAndEstadoInAndEsCobrableTrue(eq(1), any())).thenReturn(1L);

        java.util.Map<String, Object> folio = servicio().obtenerSaldoDetallado(1);

        assertEquals(5, folio.get("noches"));
        assertEquals(1, folio.get("nochesReales"));
        assertEquals(0, new BigDecimal("-400").compareTo((BigDecimal) folio.get("ajusteNoches")));
        assertEquals(-5L, folio.get("diasDeDiferencia"), "faltaban 5 dias para su salida prevista");
        assertEquals(2L, folio.get("comandasActivas"));
        assertEquals(3L, folio.get("solicitudesPendientes"));
        assertEquals(1L, folio.get("solicitudesCobrablesPendientes"));
        assertEquals(0, new BigDecimal("400").compareTo((BigDecimal) folio.get("saldoPendiente")), "500 de alojamiento - 100 pagado");
    }

    @Test
    void loDevueltoAlHuespedEntraAlSaldoParaQueLaCuentaCierre() {
        estadiaConSaldo("150");
        when(movimientoCajaRepository.devueltoDeEstadia(1)).thenReturn(new BigDecimal("50"));

        assertEquals(0, BigDecimal.ZERO.compareTo(servicio().calcularSaldo(1)));
    }

    private static Pago pagoFinal(String monto) {
        Pago p = new Pago();
        p.setMonto(new BigDecimal(monto));
        p.setMetodoPago(MetodoPago.EFECTIVO);
        return p;
    }
}
