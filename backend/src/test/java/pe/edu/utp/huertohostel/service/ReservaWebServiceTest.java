package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
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
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.exception.PagoRechazadoException;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReservaWebServiceTest {

    /** "Hoy" fijo en Lima: 13 nov 2026. */
    private static final Clock RELOJ = Clock.fixed(Instant.parse("2026-11-13T15:00:00Z"), ZoneId.of("America/Lima"));
    private static final LocalDate HOY = LocalDate.of(2026, 11, 13);
    private static final LocalDate LLEGADA = LocalDate.of(2026, 12, 12);
    private static final LocalDate SALIDA = LocalDate.of(2026, 12, 14);

    @Mock TipoHabitacionRepository tipoRepository;
    @Mock HabitacionRepository habitacionRepository;
    @Mock ReservaRepository reservaRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock PagoRepository pagoRepository;
    @Mock ReservaService reservaService;
    @Mock PagoService pagoService;
    @Mock AccesoPortalService accesoPortalService;
    @Mock UsuarioActualService usuarioActualService;
    @Mock IncidenciaMantenimientoRepository incidenciaRepository;

    private TipoHabitacion doble;
    private Habitacion h103;
    private Habitacion h104;

    @BeforeEach
    void preparar() {
        doble = tipo(2, "Doble", 2, "150");
        h103 = habitacion(103, doble, EstadoOperativoHab.OCUPADA);
        h104 = habitacion(104, doble, EstadoOperativoHab.DISPONIBLE);
        when(tipoRepository.findAll()).thenReturn(List.of(doble));
        when(tipoRepository.findById(2)).thenReturn(Optional.of(doble));
        when(habitacionRepository.findByTipoHabitacionIdTipoHabitacionAndEstadoTrueOrderByNumeroAsc(2))
                .thenReturn(List.of(h103, h104));
        when(habitacionRepository.findAll()).thenReturn(List.of(h103, h104));
        // Consulta agrupada de la disponibilidad: la 103 tiene cruce de fechas.
        when(reservaRepository.findHabitacionesConCruce(any(), any(), anyList())).thenReturn(List.of(103));
        when(habitacionRepository.findByIdParaActualizar(anyInt())).thenAnswer(i ->
                Optional.of(i.<Integer>getArgument(0) == 103 ? h103 : h104));
        // La 103 tiene una reserva que se cruza con las fechas pedidas; la 104 esta libre.
        when(reservaRepository.findConflictos(eq(103), any(), any(), anyList())).thenReturn(List.of(new Reserva()));
        when(reservaRepository.findConflictos(eq(104), any(), any(), anyList())).thenReturn(List.of());
        when(clienteRepository.save(any())).thenAnswer(i -> {
            Cliente c = i.getArgument(0);
            if (c.getIdCliente() == null) c.setIdCliente(77);
            return c;
        });
        when(reservaService.registrar(any())).thenAnswer(i -> {
            NuevaReservaRequest nr = i.getArgument(0);
            Reserva r = new Reserva();
            r.setIdReserva(142);
            r.setHabitacion(nr.getIdHabitacion() == 104 ? h104 : h103);
            r.setFechaCheckinPrevisto(nr.getFechaCheckinPrevisto());
            r.setFechaCheckoutPrevisto(nr.getFechaCheckoutPrevisto());
            r.setCanalReserva(nr.getCanalReserva());
            long noches = ChronoUnit.DAYS.between(nr.getFechaCheckinPrevisto(), nr.getFechaCheckoutPrevisto());
            r.setMontoAlojamientoTotal(new BigDecimal("150").multiply(BigDecimal.valueOf(noches)));
            r.setEstadoReserva(EstadoReserva.PENDIENTE_ADELANTO);
            return r;
        });
        when(pagoService.registrarPagoWeb(any())).thenAnswer(i -> i.getArgument(0));
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private ReservaWebService servicio() {
        return new ReservaWebService(tipoRepository, habitacionRepository, reservaRepository, clienteRepository,
                usuarioRepository, pagoRepository, reservaService, pagoService, accesoPortalService,
                usuarioActualService, new BloqueoPorIncidencia(incidenciaRepository), RELOJ, 30, 0);
    }

    // ------------------------------------------------------------------ disponibilidad

    @Test
    void laDisponibilidadCuentaSoloHabitacionesSinCruceYCalculaTotalYAdelanto() {
        Map<String, Object> r = servicio().disponibilidad(LLEGADA, SALIDA, 2);

        assertEquals(2L, r.get("noches"));
        assertEquals(30, r.get("adelantoPorcentaje"));
        @SuppressWarnings("unchecked")
        Map<String, Object> tipo = ((List<Map<String, Object>>) r.get("tipos")).get(0);
        assertEquals(1L, tipo.get("disponibles"), "la 103 tiene una reserva en esas fechas");
        assertEquals(new BigDecimal("300"), tipo.get("total"));
        assertEquals(new BigDecimal("90.00"), tipo.get("adelanto"));
        assertEquals(true, tipo.get("cabe"));
    }

    @Test
    void unaHabitacionBloqueadaPorIncidenciaOEnMantenimientoNoSeOfrece() {
        h104.setEstadoOperativo(EstadoOperativoHab.MANTENIMIENTO);
        assertEquals(0L, primerTipo(servicio().disponibilidad(LLEGADA, SALIDA, 2)).get("disponibles"));

        h104.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
        when(incidenciaRepository.findIdsHabitacionBloqueadas(any())).thenReturn(List.of(104));
        assertEquals(0L, primerTipo(servicio().disponibilidad(LLEGADA, SALIDA, 2)).get("disponibles"));
    }

    @Test
    void alAsignarUnaHabitacionBloqueadaPorIncidenciaSeSalta() {
        when(incidenciaRepository.existsByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoIn(eq(104), any()))
                .thenReturn(true);
        assertThrows(IllegalStateException.class, () -> servicio().reservarComoNuevo(pedido()));
        verify(reservaService, never()).registrar(any());
    }

    @Test
    void lasFechasInvalidasSeRechazan() {
        ReservaWebService s = servicio();
        assertThrows(IllegalArgumentException.class, () -> s.disponibilidad(HOY.minusDays(1), HOY.plusDays(1), 2));
        assertThrows(IllegalArgumentException.class, () -> s.disponibilidad(LLEGADA, LLEGADA, 2));
        assertThrows(IllegalArgumentException.class, () -> s.disponibilidad(LLEGADA, LLEGADA.plusDays(31), 2));
    }

    // ------------------------------------------------------------------ reservar como nuevo

    @Test
    void reservaWebCreaCuentaReservaOnlineEnLaHabitacionLibreYCobraElAdelanto() {
        Map<String, Object> r = servicio().reservarComoNuevo(pedido());

        ArgumentCaptor<NuevaReservaRequest> nr = ArgumentCaptor.forClass(NuevaReservaRequest.class);
        verify(reservaService).registrar(nr.capture());
        assertEquals(104, nr.getValue().getIdHabitacion(), "se asigna la primera habitacion libre del tipo");
        assertEquals(CanalReserva.ONLINE, nr.getValue().getCanalReserva());

        verify(accesoPortalService).crear(77, "carlos@correo.com", "huerto2026");

        ArgumentCaptor<Pago> pago = ArgumentCaptor.forClass(Pago.class);
        verify(pagoService).registrarPagoWeb(pago.capture());
        assertEquals(new BigDecimal("90.00"), pago.getValue().getMonto());
        assertEquals(ConceptoPago.ADELANTO_RESERVA, pago.getValue().getConcepto());
        assertEquals(MetodoPago.PASARELA_ONLINE, pago.getValue().getMetodoPago());

        assertEquals("RES-000142", r.get("codigo"));
        assertEquals(EstadoReserva.CONFIRMADA, r.get("estado"));
        assertEquals(new BigDecimal("210.00"), r.get("saldo"));
        assertEquals("carlos@correo.com", r.get("usuario"));
    }

    @Test
    void siLaPasarelaRechazaNoSeRegistraReservaNiPago() {
        ReservaWebRequest req = pedido();
        req.setSimularRechazo(true);

        PagoRechazadoException e = assertThrows(PagoRechazadoException.class, () -> servicio().reservarComoNuevo(req));

        assertTrue(e.getCodigoOperacion().startsWith("SIM-"));
        verify(reservaService, never()).registrar(any());
        verify(pagoService, never()).registrarPagoWeb(any());
    }

    @Test
    void unDocumentoQueYaTieneCuentaDebeIniciarSesion() {
        Cliente existente = new Cliente();
        existente.setIdCliente(5);
        when(clienteRepository.findByNumeroDocumento("47629124")).thenReturn(Optional.of(existente));
        when(usuarioRepository.findByClienteIdCliente(5)).thenReturn(Optional.of(new Usuario()));

        assertThrows(IllegalStateException.class, () -> servicio().reservarComoNuevo(pedido()));

        verify(accesoPortalService, never()).crear(any(), any(), any());
        verify(reservaService, never()).registrar(any());
    }

    @Test
    void unCorreoQueYaEsUsuarioDebeIniciarSesion() {
        when(usuarioRepository.existsByUsername("carlos@correo.com")).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> servicio().reservarComoNuevo(pedido()));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void unHuespedQueYaVinoSeReutilizaYSeLeCreaLaCuenta() {
        Cliente existente = new Cliente();
        existente.setIdCliente(5);
        existente.setNumeroDocumento("47629124");
        when(clienteRepository.findByNumeroDocumento("47629124")).thenReturn(Optional.of(existente));
        when(usuarioRepository.findByClienteIdCliente(5)).thenReturn(Optional.empty());

        servicio().reservarComoNuevo(pedido());

        assertEquals("carlos@correo.com", existente.getCorreo());
        verify(accesoPortalService).crear(5, "carlos@correo.com", "huerto2026");
    }

    @Test
    void masHuespedesQueLaCapacidadSeRechaza() {
        ReservaWebRequest req = pedido();
        req.setHuespedes(4);
        assertThrows(IllegalStateException.class, () -> servicio().reservarComoNuevo(req));
        verify(reservaService, never()).registrar(any());
    }

    @Test
    void conYapeElCodigoDeOperacionEsObligatorio() {
        ReservaWebRequest req = pedido();
        req.setMetodoPago("YAPE");
        req.setCodigoOperacion(" ");
        assertThrows(IllegalArgumentException.class, () -> servicio().reservarComoNuevo(req));

        req.setCodigoOperacion("01234567");
        servicio().reservarComoNuevo(req);
        ArgumentCaptor<Pago> pago = ArgumentCaptor.forClass(Pago.class);
        verify(pagoService).registrarPagoWeb(pago.capture());
        assertEquals("YAPE-01234567", pago.getValue().getNumTransaccionComprobante());
    }

    @Test
    void unaClaveDebilSeRechazaAntesDeCrearNada() {
        ReservaWebRequest req = pedido();
        req.setPassword("corta");
        assertThrows(IllegalStateException.class, () -> servicio().reservarComoNuevo(req));
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void sinHabitacionesLibresDelTipoSeAvisa() {
        when(reservaRepository.findConflictos(eq(104), any(), any(), anyList())).thenReturn(List.of(new Reserva()));
        assertThrows(IllegalStateException.class, () -> servicio().reservarComoNuevo(pedido()));
        verify(reservaService, never()).registrar(any());
    }

    // ------------------------------------------------------------------ ayudas

    // ------------------------------------------------------------------ con Google y origen de la ficha

    @Test
    void unaFichaNuevaDeLaWebQuedaConOrigenWeb() {
        servicio().reservarComoNuevo(pedido());
        ArgumentCaptor<Cliente> c = ArgumentCaptor.forClass(Cliente.class);
        verify(clienteRepository).save(c.capture());
        assertEquals(Cliente.ORIGEN_WEB, c.getValue().getOrigen());
    }

    // ------------------------------------------------------------------ titular en la primera reserva (cuenta de Google)

    /** Cuenta creada con Google: tiene nombre y correo, pero todavia no documento. */
    private Cliente cuentaSinDocumento() {
        Cliente c = new Cliente();
        c.setIdCliente(90);
        c.setNombres("Ana");
        c.setApellidos("");
        c.setCorreo("ana@gmail.com");
        c.setOrigen(Cliente.ORIGEN_GOOGLE);
        when(usuarioActualService.obtenerCliente()).thenReturn(c);
        return c;
    }

    private static ReservaWebRequest pedidoConTitular() {
        ReservaWebRequest r = pedido();
        r.setCorreo(null);
        r.setPassword(null);
        r.setNombres("Ana Lucía");
        r.setApellidos("Rojas Peña");
        return r;
    }

    @Test
    void laPrimeraReservaConGooglePideYGuardaElDocumentoDelTitular() {
        Cliente c = cuentaSinDocumento();

        servicio().reservarComoCliente(pedidoConTitular());

        assertEquals("DNI", c.getTipoDocumento());
        assertEquals("47629124", c.getNumeroDocumento());
        assertEquals("Ana Lucía", c.getNombres());
        assertEquals("Rojas Peña", c.getApellidos());
        verify(clienteRepository).save(c);
        verify(reservaService).registrar(any());
    }

    @Test
    void sinDocumentoNoSePuedeHacerLaPrimeraReserva() {
        cuentaSinDocumento();
        ReservaWebRequest req = pedidoConTitular();
        req.setNumeroDocumento(" ");

        assertThrows(IllegalArgumentException.class, () -> servicio().reservarComoCliente(req));
        verify(reservaService, never()).registrar(any());
    }

    @Test
    void conDocumentoYaGuardadoNoSeVuelveAPedirNiSeCambia() {
        Cliente c = new Cliente();
        c.setIdCliente(91);
        c.setTipoDocumento("DNI");
        c.setNumeroDocumento("11112222");
        c.setNombres("Luis");
        c.setApellidos("Paz");
        when(usuarioActualService.obtenerCliente()).thenReturn(c);
        ReservaWebRequest req = pedidoConTitular();
        req.setNumeroDocumento(null);

        servicio().reservarComoCliente(req);

        assertEquals("11112222", c.getNumeroDocumento());
        assertEquals("Luis", c.getNombres());
        verify(clienteRepository, never()).save(c);
    }

    @Test
    void siElDocumentoEsDeUnHuespedDeRecepcionLaCuentaPasaASuFichaYNoSeDuplica() {
        Cliente vacia = cuentaSinDocumento();
        Cliente vino = new Cliente();
        vino.setIdCliente(5);
        vino.setTipoDocumento("DNI");
        vino.setNumeroDocumento("47629124");
        vino.setNombres("Ana Lucía");
        vino.setApellidos("Rojas Peña");
        when(clienteRepository.findByNumeroDocumento("47629124")).thenReturn(Optional.of(vino));
        when(usuarioRepository.findByClienteIdCliente(5)).thenReturn(Optional.empty());
        when(reservaRepository.findByClienteIdCliente(90)).thenReturn(List.of());
        pe.edu.utp.huertohostel.entity.Usuario cuenta = new pe.edu.utp.huertohostel.entity.Usuario();
        cuenta.setCliente(vacia);
        when(usuarioActualService.obtenerUsuario()).thenReturn(cuenta);

        servicio().reservarComoCliente(pedidoConTitular());

        assertEquals(vino, cuenta.getCliente(), "la cuenta queda en la ficha que ya existia");
        assertEquals("ana@gmail.com", vino.getCorreo());
        verify(clienteRepository).delete(vacia);
        ArgumentCaptor<NuevaReservaRequest> nr = ArgumentCaptor.forClass(NuevaReservaRequest.class);
        verify(reservaService).registrar(nr.capture());
        assertEquals(5, nr.getValue().getIdCliente(), "la reserva es de la ficha de siempre");
    }

    @Test
    void unDocumentoQueYaTieneOtraCuentaSeRechaza() {
        cuentaSinDocumento();
        Cliente otro = new Cliente();
        otro.setIdCliente(6);
        when(clienteRepository.findByNumeroDocumento("47629124")).thenReturn(Optional.of(otro));
        when(usuarioRepository.findByClienteIdCliente(6)).thenReturn(Optional.of(new pe.edu.utp.huertohostel.entity.Usuario()));

        assertThrows(IllegalStateException.class, () -> servicio().reservarComoCliente(pedidoConTitular()));
        verify(reservaService, never()).registrar(any());
        verify(clienteRepository, never()).delete(any());
    }

    @Test
    void misReservasTraeElDetalleDeLaHabitacionYLosPagos() {
        Cliente c = new Cliente();
        c.setIdCliente(91);
        when(usuarioActualService.obtenerCliente()).thenReturn(c);
        Reserva r = new Reserva();
        r.setIdReserva(142);
        r.setHabitacion(h104);
        r.setFechaCheckinPrevisto(LLEGADA);
        r.setFechaCheckoutPrevisto(SALIDA);
        r.setMontoAlojamientoTotal(new BigDecimal("300"));
        r.setEstadoReserva(EstadoReserva.CONFIRMADA);
        when(reservaRepository.findByClienteIdCliente(91)).thenReturn(List.of(r));
        Pago p = new Pago();
        p.setMonto(new BigDecimal("90"));
        p.setMetodoPago(MetodoPago.PASARELA_ONLINE);
        p.setConcepto(ConceptoPago.ADELANTO_RESERVA);
        when(pagoRepository.findDeReservaOSuEstadia(142)).thenReturn(List.of(p));

        Map<String, Object> m = servicio().misReservas().get(0);

        assertEquals(2, m.get("idTipoHabitacion"));
        assertEquals((short) 2, m.get("capacidad"));
        assertEquals(1, ((List<?>) m.get("pagos")).size());
        assertEquals(new BigDecimal("210"), m.get("saldo"));
    }

    private static ReservaWebRequest pedido() {
        ReservaWebRequest r = new ReservaWebRequest();
        r.setIdTipoHabitacion(2);
        r.setLlegada(LLEGADA);
        r.setSalida(SALIDA);
        r.setHuespedes(2);
        r.setTipoDocumento("DNI");
        r.setNumeroDocumento("47629124");
        r.setNombres("Carlos Alberto");
        r.setApellidos("Mendoza Ramos");
        r.setCorreo("Carlos@Correo.com");
        r.setTelefono("+51 987 654 321");
        r.setPassword("huerto2026");
        r.setMetodoPago("TARJETA");
        return r;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> primerTipo(Map<String, Object> disponibilidad) {
        return ((List<Map<String, Object>>) disponibilidad.get("tipos")).get(0);
    }

    private static TipoHabitacion tipo(int id, String nombre, int capacidad, String precio) {
        TipoHabitacion t = new TipoHabitacion();
        t.setIdTipoHabitacion(id);
        t.setNombre(nombre);
        t.setCapacidadPersonas((short) capacidad);
        t.setPrecioNoche(new BigDecimal(precio));
        t.setEstado(true);
        return t;
    }

    private static Habitacion habitacion(int numero, TipoHabitacion tipo, EstadoOperativoHab estado) {
        Habitacion h = new Habitacion();
        h.setIdHabitacion(numero);
        h.setNumero(String.valueOf(numero));
        h.setTipoHabitacion(tipo);
        h.setEstadoOperativo(estado);
        h.setEstado(true);
        return h;
    }
}
