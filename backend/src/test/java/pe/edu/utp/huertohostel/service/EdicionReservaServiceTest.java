package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.dto.EditarReservaRequest;
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
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EdicionReservaServiceTest {

    @Mock ReservaRepository reservaRepository;
    @Mock HabitacionRepository habitacionRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock EstadiaRepository estadiaRepository;
    @Mock PagoRepository pagoRepository;
    @Mock LiberacionReservasService liberacion;
    @Mock AuditoriaGestionService auditoria;

    /** "Hoy" fijo en Lima: 15 nov 2026. */
    private static final Clock RELOJ = Clock.fixed(Instant.parse("2026-11-15T15:00:00Z"), ZoneId.of("America/Lima"));
    private static final LocalDate HOY = LocalDate.of(2026, 11, 15);

    private EdicionReservaService servicio() {
        return new EdicionReservaService(reservaRepository, habitacionRepository, clienteRepository, estadiaRepository,
                pagoRepository, liberacion, auditoria, RELOJ);
    }

    private static Habitacion habitacion(int id, String precio, EstadoOperativoHab estado) {
        TipoHabitacion tipo = new TipoHabitacion();
        tipo.setPrecioNoche(new BigDecimal(precio));
        Habitacion h = new Habitacion();
        h.setIdHabitacion(id);
        h.setNumero(String.valueOf(100 + id));
        h.setTipoHabitacion(tipo);
        h.setEstadoOperativo(estado);
        return h;
    }

    private static Reserva reserva(EstadoReserva estado, Habitacion h, LocalDate checkin, LocalDate checkout) {
        Cliente c = new Cliente();
        c.setIdCliente(1);
        c.setNombres("Ana");
        c.setApellidos("Rojas");
        Reserva r = new Reserva();
        r.setIdReserva(50);
        r.setCliente(c);
        r.setHabitacion(h);
        r.setEstadoReserva(estado);
        r.setFechaCheckinPrevisto(checkin);
        r.setFechaCheckoutPrevisto(checkout);
        r.setNumNoches((short) java.time.temporal.ChronoUnit.DAYS.between(checkin, checkout));
        r.setMontoAlojamientoTotal(new BigDecimal("100").multiply(BigDecimal.valueOf(r.getNumNoches())));
        return r;
    }

    private void preparar(Reserva r) {
        when(reservaRepository.findById(50)).thenReturn(Optional.of(r));
        when(estadiaRepository.findByReservaIdReserva(50)).thenReturn(Optional.empty());
    }

    @Test
    void cambiarFechasRecalculaElTotalYRevisaElCruceSinContarseASiMisma() {
        Habitacion h = habitacion(2, "100", EstadoOperativoHab.DISPONIBLE);
        Reserva r = reserva(EstadoReserva.CONFIRMADA, h, HOY.plusDays(5), HOY.plusDays(7));
        preparar(r);
        when(habitacionRepository.findByIdParaActualizar(2)).thenReturn(Optional.of(h));
        when(reservaRepository.findConflictosExcepto(eq(2), eq(50), any(), any(), any())).thenReturn(List.of());
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EditarReservaRequest req = new EditarReservaRequest();
        req.setFechaCheckinPrevisto(HOY.plusDays(5));
        req.setFechaCheckoutPrevisto(HOY.plusDays(9));
        Reserva editada = servicio().editar(50, req);

        assertEquals((short) 4, editada.getNumNoches());
        assertEquals(new BigDecimal("400"), editada.getMontoAlojamientoTotal());
        assertEquals(EstadoReserva.CONFIRMADA, editada.getEstadoReserva(), "editar no toca el estado");
        verify(reservaRepository).findConflictosExcepto(eq(2), eq(50), eq(HOY.plusDays(5)), eq(HOY.plusDays(9)), any());
        verify(auditoria).registrar(eq("RESERVA_MODIFICADA"), isNull(), contains("fechas"));
    }

    @Test
    void cambiarDeHabitacionBloqueaAmbasEnOrdenDeIdYLiberaLaAnterior() {
        Habitacion anterior = habitacion(7, "100", EstadoOperativoHab.RESERVADO);
        Habitacion nueva = habitacion(3, "150", EstadoOperativoHab.DISPONIBLE);
        Reserva r = reserva(EstadoReserva.PENDIENTE_ADELANTO, anterior, HOY, HOY.plusDays(2));
        preparar(r);
        when(habitacionRepository.findByIdParaActualizar(3)).thenReturn(Optional.of(nueva));
        when(habitacionRepository.findByIdParaActualizar(7)).thenReturn(Optional.of(anterior));
        when(reservaRepository.findConflictosExcepto(eq(3), eq(50), any(), any(), any())).thenReturn(List.of());
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EditarReservaRequest req = new EditarReservaRequest();
        req.setIdHabitacion(3);
        Reserva editada = servicio().editar(50, req);

        InOrder orden = inOrder(habitacionRepository);
        orden.verify(habitacionRepository).findByIdParaActualizar(3);
        orden.verify(habitacionRepository).findByIdParaActualizar(7);
        assertSame(nueva, editada.getHabitacion());
        assertEquals(new BigDecimal("300"), editada.getMontoAlojamientoTotal(), "tarifa de la nueva habitacion");
        verify(liberacion).liberarHabitacionSiNoQuedanReservas(anterior);
        assertEquals(EstadoOperativoHab.RESERVADO, nueva.getEstadoOperativo(), "llega hoy: la nueva queda reservada");
    }

    @Test
    void siLaNuevaHabitacionEstaOcupadaEnEsasFechasNoGuardaNada() {
        Habitacion anterior = habitacion(2, "100", EstadoOperativoHab.DISPONIBLE);
        Habitacion nueva = habitacion(4, "100", EstadoOperativoHab.DISPONIBLE);
        Reserva r = reserva(EstadoReserva.CONFIRMADA, anterior, HOY.plusDays(1), HOY.plusDays(3));
        preparar(r);
        when(habitacionRepository.findByIdParaActualizar(2)).thenReturn(Optional.of(anterior));
        when(habitacionRepository.findByIdParaActualizar(4)).thenReturn(Optional.of(nueva));
        Reserva otra = reserva(EstadoReserva.CONFIRMADA, nueva, HOY.plusDays(2), HOY.plusDays(4));
        otra.setIdReserva(77);
        when(reservaRepository.findConflictosExcepto(eq(4), eq(50), any(), any(), any())).thenReturn(List.of(otra));

        EditarReservaRequest req = new EditarReservaRequest();
        req.setIdHabitacion(4);
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> servicio().editar(50, req));

        assertTrue(ex.getMessage().contains("RES-77"), ex.getMessage());
        verify(reservaRepository, never()).save(any());
        verify(auditoria, never()).registrar(anyString(), any(), anyString());
    }

    @Test
    void noSeEditaUnaReservaQueYaIngresoOSeCancelo() {
        Habitacion h = habitacion(2, "100", EstadoOperativoHab.OCUPADA);
        Reserva enCurso = reserva(EstadoReserva.EN_CURSO, h, HOY.minusDays(1), HOY.plusDays(1));
        when(reservaRepository.findById(50)).thenReturn(Optional.of(enCurso));
        assertThrows(IllegalStateException.class, () -> servicio().editar(50, new EditarReservaRequest()));

        Reserva conCheckin = reserva(EstadoReserva.CONFIRMADA, h, HOY, HOY.plusDays(1));
        when(reservaRepository.findById(50)).thenReturn(Optional.of(conCheckin));
        when(estadiaRepository.findByReservaIdReserva(50)).thenReturn(Optional.of(new Estadia()));
        assertThrows(IllegalStateException.class, () -> servicio().editar(50, new EditarReservaRequest()),
                "estado atrasado pero con estadia: ya ingreso");
    }

    @Test
    void laNuevaLlegadaNoPuedeQuedarEnElPasadoNiLaSalidaAntesDeLaLlegada() {
        Habitacion h = habitacion(2, "100", EstadoOperativoHab.DISPONIBLE);
        Reserva r = reserva(EstadoReserva.PENDIENTE_ADELANTO, h, HOY.plusDays(3), HOY.plusDays(5));
        preparar(r);

        EditarReservaRequest pasado = new EditarReservaRequest();
        pasado.setFechaCheckinPrevisto(HOY.minusDays(1));
        assertThrows(IllegalArgumentException.class, () -> servicio().editar(50, pasado));

        EditarReservaRequest alReves = new EditarReservaRequest();
        alReves.setFechaCheckoutPrevisto(HOY.plusDays(3));
        assertThrows(IllegalArgumentException.class, () -> servicio().editar(50, alReves));
        verify(reservaRepository, never()).save(any());
    }

    @Test
    void elHuespedNoCambiaSiYaHayPagos() {
        Habitacion h = habitacion(2, "100", EstadoOperativoHab.DISPONIBLE);
        Reserva r = reserva(EstadoReserva.CONFIRMADA, h, HOY.plusDays(3), HOY.plusDays(5));
        preparar(r);
        when(pagoRepository.findDeReservaOSuEstadia(50)).thenReturn(List.of(new Pago()));

        EditarReservaRequest req = new EditarReservaRequest();
        req.setIdCliente(9);
        assertThrows(IllegalStateException.class, () -> servicio().editar(50, req));
        verify(clienteRepository, never()).findById(anyInt());
    }

    @Test
    void cambiarSoloObservacionesRespetaElPrecioPactadoYNoBloqueaHabitaciones() {
        Habitacion h = habitacion(2, "999", EstadoOperativoHab.DISPONIBLE); // la tarifa subio despues de reservar
        Reserva r = reserva(EstadoReserva.CONFIRMADA, h, HOY.plusDays(3), HOY.plusDays(5));
        preparar(r);
        when(reservaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EditarReservaRequest req = new EditarReservaRequest();
        req.setObservaciones("Llega tarde, después de las 22:00");
        Reserva editada = servicio().editar(50, req);

        assertEquals(new BigDecimal("200"), editada.getMontoAlojamientoTotal());
        assertEquals("Llega tarde, después de las 22:00", editada.getObservaciones());
        verify(habitacionRepository, never()).findByIdParaActualizar(anyInt());
        verify(liberacion, never()).liberarHabitacionSiNoQuedanReservas(any());
    }
}
