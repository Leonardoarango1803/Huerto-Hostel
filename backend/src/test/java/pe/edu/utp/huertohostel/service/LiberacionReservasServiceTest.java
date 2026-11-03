package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LiberacionReservasServiceTest {

    private static final ZoneId LIMA = ZoneId.of(LiberacionReservasService.ZONA);

    @Mock
    ReservaRepository reservaRepository;
    @Mock
    HabitacionRepository habitacionRepository;
    @Mock
    EstadiaRepository estadiaRepository;
    @Mock
    PlatformTransactionManager transactionManager;

    // ------------------------------------------------------------------ la regla, sin base de datos

    @ParameterizedTest(name = "{0} | registrada {1} | check-in {2} | hoy {3} -> libera={4}")
    @CsvSource(nullValues = "NULL", value = {
            // Sin adelanto: no confirmo. Se libera al llegar su dia de check-in...
            "PENDIENTE_ADELANTO, 2026-10-30, 2026-11-01, 2026-11-01, true",
            // ...salvo que se haya hecho ese mismo dia: conserva el dia completo
            "PENDIENTE_ADELANTO, 2026-11-01, 2026-11-01, 2026-11-01, false",
            // ...y al terminar ese dia ya si se libera
            "PENDIENTE_ADELANTO, 2026-11-01, 2026-11-01, 2026-11-02, true",
            // Sin fecha de registro no se puede saber: se le da el dia, y al terminar se libera
            "PENDIENTE_ADELANTO, NULL, 2026-11-01, 2026-11-01, false",
            "PENDIENTE_ADELANTO, NULL, 2026-11-01, 2026-11-02, true",
            // Todavia no llega su dia
            "PENDIENTE_ADELANTO, 2026-10-30, 2026-11-03, 2026-11-01, false",
            "PENDIENTE_ADELANTO, 2026-10-30, 2026-11-01, 2026-10-31, false",
            // Confirmada (pago adelanto): tiene todo su dia de llegada
            "CONFIRMADA, 2026-10-30, 2026-11-01, 2026-10-31, false",
            "CONFIRMADA, 2026-10-30, 2026-11-01, 2026-11-01, false",
            "CONFIRMADA, 2026-10-30, 2026-11-01, 2026-11-02, true",
            // Estas nunca se tocan
            "EN_CURSO, 2026-10-01, 2026-10-02, 2026-11-05, false",
            "COMPLETADA, 2026-10-01, 2026-10-02, 2026-11-05, false",
            "CANCELADA, 2026-10-01, 2026-10-02, 2026-11-05, false",
    })
    void laReglaDecideSegunEstadoYDia(EstadoReserva estado, LocalDate registrada, LocalDate checkin,
                                      LocalDate hoy, boolean esperado) {
        Reserva reserva = reserva(1, estado, registrada, checkin, null);
        assertEquals(esperado, LiberacionReservasService.debeLiberarse(reserva, hoy));
    }

    // ------------------------------------------------------------------ la accion

    @Test
    void liberaUnaReservaSinAdelantoYDejaLaHabitacionDisponible() {
        Habitacion habitacion = habitacion(5, EstadoOperativoHab.RESERVADO);
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, LocalDate.parse("2026-10-30"),
                LocalDate.parse("2026-11-01"), habitacion);
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(eq(5), any())).thenReturn(List.of());

        int liberadas = servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarVencidas(); // 10:00 en Lima

        assertEquals(1, liberadas);
        assertEquals(EstadoReserva.CANCELADA, reserva.getEstadoReserva());
        assertTrue(reserva.getObservaciones().contains("Liberada automaticamente el 01/11/2026"));
        verify(reservaRepository).save(reserva);
        assertEquals(EstadoOperativoHab.DISPONIBLE, habitacion.getEstadoOperativo());
        verify(habitacionRepository).save(habitacion);
    }

    @Test
    void noLiberaLaHabitacionSiQuedaOtraReservaActivaSobreElla() {
        Habitacion habitacion = habitacion(5, EstadoOperativoHab.RESERVADO);
        Reserva vencida = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, LocalDate.parse("2026-10-30"),
                LocalDate.parse("2026-11-01"), habitacion);
        Reserva proxima = reserva(11, EstadoReserva.CONFIRMADA, LocalDate.parse("2026-10-30"),
                LocalDate.parse("2026-11-20"), habitacion);
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(vencida));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());
        when(reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(eq(5), any())).thenReturn(List.of(proxima));

        servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarVencidas();

        assertEquals(EstadoReserva.CANCELADA, vencida.getEstadoReserva());
        assertEquals(EstadoOperativoHab.RESERVADO, habitacion.getEstadoOperativo());
        verify(habitacionRepository, never()).save(any());
    }

    @Test
    void nuncaTocaUnaHabitacionOcupadaNiEnLimpiezaNiEnMantenimiento() {
        for (EstadoOperativoHab estado : List.of(EstadoOperativoHab.OCUPADA, EstadoOperativoHab.EN_LIMPIEZA,
                EstadoOperativoHab.PENDIENTE_LIMPIEZA, EstadoOperativoHab.MANTENIMIENTO)) {
            Habitacion habitacion = habitacion(5, estado);
            Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, LocalDate.parse("2026-10-30"),
                    LocalDate.parse("2026-11-01"), habitacion);
            when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));
            when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());

            servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarVencidas();

            assertEquals(estado, habitacion.getEstadoOperativo(), "la habitacion " + estado + " debe quedar igual");
        }
        verify(habitacionRepository, never()).save(any());
        verify(reservaRepository, never()).findByHabitacionIdHabitacionAndEstadoReservaIn(any(), any());
    }

    @Test
    void agregaLaNotaSinPisarLaObservacionExistente() {
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, LocalDate.parse("2026-10-30"),
                LocalDate.parse("2026-11-01"), null);
        reserva.setObservaciones("Llega tarde, avisar a recepcion");
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());

        servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarVencidas();

        assertTrue(reserva.getObservaciones().startsWith("Llega tarde, avisar a recepcion | Liberada automaticamente"));
    }

    @Test
    void unaConfirmadaQueNoLlegoSeLiberaAvisandoQueTeniaAdelanto() {
        Reserva reserva = reserva(10, EstadoReserva.CONFIRMADA, LocalDate.parse("2026-10-28"),
                LocalDate.parse("2026-10-31"), null);
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());

        int liberadas = servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarVencidas();

        assertEquals(1, liberadas);
        assertTrue(reserva.getObservaciones().contains("tenia adelanto pagado"));
    }

    @Test
    void noLiberaSiLaReservaYaTieneEstadiaAunqueSuEstadoQuedaraAtrasado() {
        Reserva reserva = reserva(10, EstadoReserva.CONFIRMADA, LocalDate.parse("2026-10-28"),
                LocalDate.parse("2026-10-31"), null);
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.of(new Estadia()));

        int liberadas = servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarVencidas();

        assertEquals(0, liberadas);
        assertEquals(EstadoReserva.CONFIRMADA, reserva.getEstadoReserva());
        verify(reservaRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ zona horaria

    @Test
    void aLas2030DeLimaSigueSiendoElDiaAnteriorAunqueUtcYaSeaElSiguiente() {
        // 2026-11-02T01:30Z = 2026-11-01 20:30 en Lima. La reserva llega manana (2/nov) y se hizo antes.
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, LocalDate.parse("2026-10-30"),
                LocalDate.parse("2026-11-02"), null);
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));

        int liberadas = servicio(reloj("2026-11-02T01:30:00Z", LIMA)).liberarVencidas();

        assertEquals(0, liberadas, "en Lima todavia es 1/nov: la reserva de manana no puede liberarse");
        verify(reservaRepository, never()).save(any());
    }

    @Test
    void conUtcLaMismaHoraHabriaLiberadoUnDiaAntes() {
        // Demuestra el error que evita fijar la zona: el mismo instante, leido en UTC, es el 2/nov.
        Reserva reserva = reserva(10, EstadoReserva.PENDIENTE_ADELANTO, LocalDate.parse("2026-10-30"),
                LocalDate.parse("2026-11-02"), null);
        when(reservaRepository.findByEstadoReservaIn(any())).thenReturn(List.of(reserva));
        when(estadiaRepository.findByReservaIdReserva(10)).thenReturn(Optional.empty());

        int liberadas = servicio(reloj("2026-11-02T01:30:00Z", ZoneOffset.UTC)).liberarVencidas();

        assertEquals(1, liberadas);
    }

    // ------------------------------------------------------------------ al leer

    @Test
    void alLeerSoloCorreUnaVezPorMinuto() {
        RelojMutable reloj = new RelojMutable(Instant.parse("2026-11-01T15:00:00Z"));
        LiberacionReservasService servicio = servicio(reloj);

        servicio.liberarSiHaceFalta();               // corre
        reloj.avanzarSegundos(30);
        servicio.liberarSiHaceFalta();               // dentro del minuto: se omite
        reloj.avanzarSegundos(31);
        servicio.liberarSiHaceFalta();               // ya paso un minuto: corre

        verify(reservaRepository, times(2)).findByEstadoReservaIn(any());
    }

    @Test
    void unaFallaAlLiberarNuncaTumbaLaLecturaDeReservas() {
        when(reservaRepository.findByEstadoReservaIn(any())).thenThrow(new RuntimeException("bd caida"));

        assertDoesNotThrow(() -> servicio(reloj("2026-11-01T15:00:00Z", LIMA)).liberarSiHaceFalta());
    }

    // ------------------------------------------------------------------ apoyo

    private LiberacionReservasService servicio(Clock reloj) {
        return new LiberacionReservasService(reservaRepository, habitacionRepository, estadiaRepository,
                transactionManager, reloj);
    }

    private static Clock reloj(String instante, ZoneId zona) {
        return Clock.fixed(Instant.parse(instante), zona);
    }

    private static Reserva reserva(int id, EstadoReserva estado, LocalDate registrada, LocalDate checkin,
                                   Habitacion habitacion) {
        Reserva r = new Reserva();
        r.setIdReserva(id);
        r.setEstadoReserva(estado);
        r.setFechaRegistro(registrada == null ? null : registrada.atTime(10, 0));
        r.setFechaCheckinPrevisto(checkin);
        r.setHabitacion(habitacion);
        return r;
    }

    private static Habitacion habitacion(int id, EstadoOperativoHab estado) {
        Habitacion h = new Habitacion();
        h.setIdHabitacion(id);
        h.setEstadoOperativo(estado);
        return h;
    }

    /** Reloj que se puede adelantar, para probar el limite de una corrida por minuto. */
    private static final class RelojMutable extends Clock {
        private Instant ahora;

        RelojMutable(Instant inicio) {
            this.ahora = inicio;
        }

        void avanzarSegundos(long s) {
            ahora = ahora.plusSeconds(s);
        }

        @Override
        public ZoneId getZone() {
            return LIMA;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }
}
