package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.dto.NuevaReservaRequest;
import pe.edu.utp.huertohostel.dto.NuevoAdelantoRequest;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservaServiceTest {

    @Mock
    ReservaRepository reservaRepository;
    @Mock
    HabitacionRepository habitacionRepository;
    @Mock
    EstadiaRepository estadiaRepository;
    @Mock
    ClienteRepository clienteRepository;
    @Mock
    PagoService pagoService;
    @Mock
    CajaService cajaService;
    @Mock
    LiberacionReservasService liberacionReservasService;

    /** Sin incidencias abiertas: el mock del repositorio responde false. */
    private final BloqueoPorIncidencia bloqueo = new BloqueoPorIncidencia(
            org.mockito.Mockito.mock(pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository.class));

    /** "Hoy" fijo en Lima: 13 nov 2026. */
    private static final java.time.Clock RELOJ = java.time.Clock.fixed(
            java.time.Instant.parse("2026-11-13T15:00:00Z"), java.time.ZoneId.of("America/Lima"));
    private static final LocalDate HOY = LocalDate.of(2026, 11, 13);

    private ReservaService servicio(int adelantoMinimoPorcentaje) {
        return new ReservaService(reservaRepository, habitacionRepository, estadiaRepository, clienteRepository,
                pagoService, cajaService, liberacionReservasService, bloqueo, RELOJ, adelantoMinimoPorcentaje);
    }

    private ReservaService servicio() {
        return servicio(0);
    }

    // ------------------------------------------------------------------ reservar NO exige caja

    @Test
    void reservarNoExigeCajaPorqueNoMueveDinero() {
        Cliente cliente = new Cliente();
        cliente.setIdCliente(1);
        Habitacion habitacion = habitacion(2, EstadoOperativoHab.DISPONIBLE);
        TipoHabitacion tipo = new TipoHabitacion();
        tipo.setPrecioNoche(new BigDecimal("100"));
        habitacion.setTipoHabitacion(tipo);
        when(clienteRepository.findById(1)).thenReturn(Optional.of(cliente));
        when(habitacionRepository.findById(2)).thenReturn(Optional.of(habitacion));
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        NuevaReservaRequest req = new NuevaReservaRequest();
        req.setIdCliente(1);
        req.setIdHabitacion(2);
        req.setFechaCheckinPrevisto(HOY);
        req.setFechaCheckoutPrevisto(HOY.plusDays(2));

        Reserva creada = servicio().registrar(req);

        assertEquals(EstadoReserva.PENDIENTE_ADELANTO, creada.getEstadoReserva(), "sin pago queda pendiente de adelanto");
        assertEquals(new BigDecimal("200"), creada.getMontoAlojamientoTotal());
        assertEquals(EstadoOperativoHab.RESERVADO, habitacion.getEstadoOperativo(), "llega hoy: queda reservada");
        verifyNoInteractions(cajaService, pagoService);
    }

    @Test
    void unaReservaParaOtroDiaNoBloqueaLaHabitacionDesdeHoy() {
        Cliente cliente = new Cliente();
        cliente.setIdCliente(1);
        Habitacion habitacion = habitacion(2, EstadoOperativoHab.DISPONIBLE);
        TipoHabitacion tipo = new TipoHabitacion();
        tipo.setPrecioNoche(new BigDecimal("100"));
        habitacion.setTipoHabitacion(tipo);
        when(clienteRepository.findById(1)).thenReturn(Optional.of(cliente));
        when(habitacionRepository.findById(2)).thenReturn(Optional.of(habitacion));
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        NuevaReservaRequest req = new NuevaReservaRequest();
        req.setIdCliente(1);
        req.setIdHabitacion(2);
        req.setFechaCheckinPrevisto(HOY.plusDays(60));
        req.setFechaCheckoutPrevisto(HOY.plusDays(62));

        servicio().registrar(req);

        assertEquals(EstadoOperativoHab.DISPONIBLE, habitacion.getEstadoOperativo(),
                "la marca la tarea periodica el dia de llegada; hasta entonces se puede usar");
        verify(habitacionRepository, never()).save(any());
    }

    @Test
    void liberarDesdeHabitacionesCancelaSoloLaReservaDeHoyYRespetaLasFuturas() {
        Habitacion habitacion = habitacion(2, EstadoOperativoHab.RESERVADO);
        Reserva deHoy = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, habitacion);
        deHoy.setFechaCheckinPrevisto(HOY);
        Reserva futura = reserva(11, EstadoReserva.CONFIRMADA, habitacion);
        futura.setFechaCheckinPrevisto(HOY.plusDays(30));
        when(reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(eq(2), any()))
                .thenReturn(java.util.List.of(deHoy, futura));
        when(habitacionRepository.findById(2)).thenReturn(Optional.of(habitacion));

        servicio().cancelarReservaPorHabitacion(2);

        assertEquals(EstadoReserva.CANCELADA, deHoy.getEstadoReserva());
        assertEquals(EstadoReserva.CONFIRMADA, futura.getEstadoReserva(), "la reserva pagada de otro mes sigue en pie");
        verify(reservaRepository, never()).save(futura);
        assertEquals(EstadoOperativoHab.DISPONIBLE, habitacion.getEstadoOperativo());
    }

    @Test
    void reservarParaOtraFechaUnaHabitacionOcupadaNoLePisaElEstado() {
        Cliente cliente = new Cliente();
        cliente.setIdCliente(1);
        Habitacion habitacion = habitacion(2, EstadoOperativoHab.OCUPADA);
        TipoHabitacion tipo = new TipoHabitacion();
        tipo.setPrecioNoche(new BigDecimal("100"));
        habitacion.setTipoHabitacion(tipo);
        when(clienteRepository.findById(1)).thenReturn(Optional.of(cliente));
        when(habitacionRepository.findById(2)).thenReturn(Optional.of(habitacion));
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        NuevaReservaRequest req = new NuevaReservaRequest();
        req.setIdCliente(1);
        req.setIdHabitacion(2);
        req.setFechaCheckinPrevisto(HOY);
        req.setFechaCheckoutPrevisto(HOY.plusDays(2));

        servicio().registrar(req);

        assertEquals(EstadoOperativoHab.OCUPADA, habitacion.getEstadoOperativo(), "el huesped de hoy sigue adentro");
        verify(habitacionRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ check-in

    @Test
    void elCheckinConLaCajaCerradaSeRechazaSinTocarReservaNiHabitacion() {
        doThrow(new IllegalStateException("La caja esta cerrada.")).when(cajaService).exigirCajaAbiertaSiEsPersonal();

        assertThrows(IllegalStateException.class, () -> servicio().realizarCheckin(10));

        verifyNoInteractions(reservaRepository, estadiaRepository, habitacionRepository);
    }

    @Test
    void conLaCajaAbiertaElCheckinOcupaLaHabitacionYAbreLaEstadia() {
        Habitacion habitacion = habitacion(2, EstadoOperativoHab.RESERVADO);
        Reserva reserva = reserva(10, EstadoReserva.CONFIRMADA, habitacion);
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(estadiaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Estadia estadia = servicio().realizarCheckin(10);

        verify(cajaService).exigirCajaAbiertaSiEsPersonal();
        assertEquals(EstadoReserva.EN_CURSO, reserva.getEstadoReserva());
        assertEquals(EstadoOperativoHab.OCUPADA, habitacion.getEstadoOperativo());
        assertEquals(habitacion, estadia.getHabitacion());
    }

    // ------------------------------------------------------------------ adelanto

    @Test
    void sinCajaAbiertaElAdelantoNoConfirmaLaReserva() {
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, habitacion(2, EstadoOperativoHab.RESERVADO));
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));
        when(pagoService.registrar(any())).thenThrow(new IllegalStateException("La caja esta cerrada."));

        assertThrows(IllegalStateException.class, () -> servicio().registrarAdelanto(10, adelanto("50")));

        assertEquals(EstadoReserva.PENDIENTE_ADELANTO, reserva.getEstadoReserva());
        verify(reservaRepository, never()).save(any());
    }

    @Test
    void elAdelantoPasaPorPagoServiceYConfirmaLaReserva() {
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, habitacion(2, EstadoOperativoHab.RESERVADO));
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));
        when(pagoService.registrar(any())).thenAnswer(i -> i.getArgument(0));

        Pago pago = servicio().registrarAdelanto(10, adelanto("50"));

        assertEquals(EstadoReserva.CONFIRMADA, reserva.getEstadoReserva());
        assertEquals(new BigDecimal("50"), pago.getMonto());
        assertEquals(reserva, pago.getReserva());
    }

    @Test
    void sinMinimoConfiguradoCualquierMontoConfirma() {
        Reserva reserva = reservaConTotal(10, "200");
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));
        when(pagoService.registrar(any())).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> servicio(0).registrarAdelanto(10, adelanto("1")));
        assertEquals(EstadoReserva.CONFIRMADA, reserva.getEstadoReserva());
    }

    @Test
    void conMinimoDel30PorCientoUnMontoMenorNoConfirma() {
        Reserva reserva = reservaConTotal(10, "200"); // minimo: 60.00
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio(30).registrarAdelanto(10, adelanto("59.99")));

        assertTrue(e.getMessage().contains("60.00"), e.getMessage());
        assertEquals(EstadoReserva.PENDIENTE_ADELANTO, reserva.getEstadoReserva());
        verifyNoInteractions(pagoService);
    }

    @Test
    void conMinimoDel30PorCientoElMontoExactoConfirma() {
        Reserva reserva = reservaConTotal(10, "200");
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));
        when(pagoService.registrar(any())).thenAnswer(i -> i.getArgument(0));

        assertDoesNotThrow(() -> servicio(30).registrarAdelanto(10, adelanto("60")));
        assertEquals(EstadoReserva.CONFIRMADA, reserva.getEstadoReserva());
    }

    // ------------------------------------------------------------------ atajos cerrados

    @Test
    void porEstadoSoloSePuedeCancelarNoConfirmarNiMoverAEnCursoOCompletada() {
        for (EstadoReserva destino : new EstadoReserva[]{
                EstadoReserva.CONFIRMADA, EstadoReserva.EN_CURSO, EstadoReserva.COMPLETADA, EstadoReserva.PENDIENTE_ADELANTO}) {
            assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(10, destino),
                    "no debe poder pasar a " + destino);
        }
        verify(reservaRepository, never()).save(any());
    }

    @Test
    void noSeCancelaUnaReservaConEstadiaEnCursoNiYaCompletada() {
        for (EstadoReserva actual : new EstadoReserva[]{EstadoReserva.EN_CURSO, EstadoReserva.COMPLETADA}) {
            Reserva reserva = reserva(10, actual, habitacion(2, EstadoOperativoHab.OCUPADA));
            when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));

            assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(10, EstadoReserva.CANCELADA));
            assertEquals(actual, reserva.getEstadoReserva());
        }
        verify(reservaRepository, never()).save(any());
    }

    @Test
    void cancelarMarcaCanceladaYDelegaLaLiberacionSegura() {
        Habitacion habitacion = habitacion(2, EstadoOperativoHab.RESERVADO);
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, habitacion);
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reserva));
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Reserva cancelada = servicio().cambiarEstado(10, EstadoReserva.CANCELADA);

        assertEquals(EstadoReserva.CANCELADA, cancelada.getEstadoReserva());
        // La regla "no liberar si queda otra reserva activa" vive en un solo lugar y es la misma de la liberacion automatica
        verify(liberacionReservasService).liberarHabitacionSiNoQuedanReservas(habitacion);
    }

    // ------------------------------------------------------------------ apoyo

    private static Habitacion habitacion(int id, EstadoOperativoHab estado) {
        Habitacion h = new Habitacion();
        h.setIdHabitacion(id);
        h.setEstadoOperativo(estado);
        return h;
    }

    private static Reserva reserva(int id, EstadoReserva estado, Habitacion habitacion) {
        Reserva r = new Reserva();
        r.setIdReserva(id);
        r.setEstadoReserva(estado);
        r.setHabitacion(habitacion);
        r.setMontoAlojamientoTotal(new BigDecimal("200"));
        return r;
    }

    private static Reserva reservaConTotal(int id, String total) {
        Reserva r = reserva(id, EstadoReserva.PENDIENTE_ADELANTO, habitacion(2, EstadoOperativoHab.RESERVADO));
        r.setMontoAlojamientoTotal(new BigDecimal(total));
        return r;
    }

    private static NuevoAdelantoRequest adelanto(String monto) {
        NuevoAdelantoRequest req = new NuevoAdelantoRequest();
        req.setMonto(new BigDecimal(monto));
        req.setMetodoPago("EFECTIVO");
        return req;
    }
}
