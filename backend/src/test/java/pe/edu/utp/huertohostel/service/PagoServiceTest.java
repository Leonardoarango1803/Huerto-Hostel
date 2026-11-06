package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.TurnoCaja;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** PagoService es el unico lugar donde un pago recibe su turno y su responsable. */
@ExtendWith(MockitoExtension.class)
class PagoServiceTest {

    @Mock
    PagoRepository pagoRepository;
    @Mock
    EstadiaRepository estadiaRepository;
    @Mock
    ReservaRepository reservaRepository;
    @Mock
    CajaService cajaService;
    @Mock
    UsuarioActualService usuarioActualService;

    private PagoService servicio() {
        return new PagoService(pagoRepository, estadiaRepository, reservaRepository, cajaService, usuarioActualService);
    }

    // ------------------------------------------------------------------ registrar

    @Test
    void elPersonalNoPuedeCobrarConLaCajaCerradaYElPagoNoSeGuarda() {
        when(usuarioActualService.esPersonal()).thenReturn(true);
        when(cajaService.exigirCajaAbierta()).thenThrow(new IllegalStateException("La caja esta cerrada."));

        assertThrows(IllegalStateException.class, () -> servicio().registrar(pago("50")));

        verify(pagoRepository, never()).save(any());
    }

    @Test
    void elPersonalLigaElPagoAlTurnoGlobalYSeIgnoraLoQueMandeElCliente() {
        TurnoCaja turnoAbierto = new TurnoCaja();
        turnoAbierto.setIdTurnoCaja(3);
        Empleado quienCobra = new Empleado();
        quienCobra.setIdEmpleado(5);
        when(usuarioActualService.esPersonal()).thenReturn(true);
        when(cajaService.exigirCajaAbierta()).thenReturn(turnoAbierto);
        when(usuarioActualService.obtenerEmpleado()).thenReturn(quienCobra);
        when(pagoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // Un cuerpo malicioso intenta ligarse a otro turno, atribuirse a otro empleado y pisar un pago existente
        Pago cuerpo = pago("50");
        cuerpo.setIdPago(7);
        TurnoCaja turnoAjeno = new TurnoCaja();
        turnoAjeno.setIdTurnoCaja(99);
        cuerpo.setTurnoCaja(turnoAjeno);
        Empleado empleadoAjeno = new Empleado();
        empleadoAjeno.setIdEmpleado(99);
        cuerpo.setEmpleadoRegistra(empleadoAjeno);

        Pago guardado = servicio().registrar(cuerpo);

        assertEquals(3, guardado.getTurnoCaja().getIdTurnoCaja(), "el turno lo decide el servidor");
        assertEquals(5, guardado.getEmpleadoRegistra().getIdEmpleado(), "el responsable es quien esta logueado");
        assertNull(guardado.getIdPago(), "un POST nunca puede pisar un pago existente");
    }

    @Test
    void unHuespedPagaSinTurnoNiEmpleadoYNuncaPideLaCaja() {
        when(usuarioActualService.esPersonal()).thenReturn(false);
        when(pagoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Pago guardado = servicio().registrar(pago("50"));

        assertNull(guardado.getTurnoCaja());
        assertNull(guardado.getEmpleadoRegistra());
        verifyNoInteractions(cajaService);
    }

    @Test
    void unMontoCeroSeRechazaAntesDeTocarLaCaja() {
        assertThrows(IllegalStateException.class, () -> servicio().registrar(pago("0")));
        verifyNoInteractions(cajaService);
        verify(pagoRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ pasarela

    @Test
    void unHuespedNoPuedePagarLaReservaDeOtroHuesped() {
        when(usuarioActualService.esPersonal()).thenReturn(false);
        when(usuarioActualService.obtenerCliente()).thenReturn(cliente(1));
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reservaDe(10, cliente(2))));

        assertThrows(AccessDeniedException.class, () -> servicio()
                .procesarPasarela(null, 10, new BigDecimal("30"), ConceptoPago.ADELANTO_RESERVA, false));

        verify(pagoRepository, never()).save(any());
    }

    @Test
    void unHuespedPagaSuPropiaReservaSinCajaYSinTurno() {
        when(usuarioActualService.esPersonal()).thenReturn(false);
        when(usuarioActualService.obtenerCliente()).thenReturn(cliente(1));
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reservaDe(10, cliente(1))));
        when(pagoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> resultado = servicio()
                .procesarPasarela(null, 10, new BigDecimal("30"), ConceptoPago.ADELANTO_RESERVA, false);

        assertEquals(true, resultado.get("aprobado"));
        assertTrue(((String) resultado.get("codigoOperacion")).startsWith("SIM-"));
        assertNull(((Pago) resultado.get("pago")).getTurnoCaja());
        verifyNoInteractions(cajaService);
    }

    @Test
    void elPersonalNoPuedeUsarLaPasarelaConLaCajaCerrada() {
        when(usuarioActualService.esPersonal()).thenReturn(true);
        when(reservaRepository.findById(10)).thenReturn(Optional.of(reservaDe(10, cliente(1))));
        when(cajaService.exigirCajaAbierta()).thenThrow(new IllegalStateException("La caja esta cerrada."));

        assertThrows(IllegalStateException.class, () -> servicio()
                .procesarPasarela(null, 10, new BigDecimal("30"), ConceptoPago.ADELANTO_RESERVA, false));

        verify(pagoRepository, never()).save(any());
    }

    @Test
    void unRechazoSimuladoNoMueveDineroNiExigeCaja() {
        Map<String, Object> resultado = servicio()
                .procesarPasarela(null, 10, new BigDecimal("30"), ConceptoPago.ADELANTO_RESERVA, true);

        assertEquals(false, resultado.get("aprobado"));
        verifyNoInteractions(cajaService, pagoRepository);
    }

    // ------------------------------------------------------------------ vinculo con la reserva

    @Test
    void unCobroDePasarelaHechoSoloConLaEstadiaQuedaLigadoTambienASuReserva() {
        Reserva reserva = reservaDe(10, cliente(1));
        Estadia estadia = estadiaDe(4, reserva);
        when(usuarioActualService.esPersonal()).thenReturn(true);
        when(cajaService.exigirCajaAbierta()).thenReturn(new TurnoCaja());
        when(usuarioActualService.obtenerEmpleado()).thenReturn(new Empleado());
        when(estadiaRepository.findById(4)).thenReturn(Optional.of(estadia));
        when(pagoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> resultado = servicio()
                .procesarPasarela(4, null, new BigDecimal("40"), ConceptoPago.PAGO_PARCIAL_ESTADIA, false);

        Pago guardado = (Pago) resultado.get("pago");
        assertEquals(10, guardado.getReserva().getIdReserva(), "sin esto el historial por reserva no lo veia");
        assertEquals(4, guardado.getEstadia().getIdEstadia());
    }

    @Test
    void unPagoManualQueSoloTraeElIdDeLaEstadiaSeCompletaConLaEstadiaReal() {
        Reserva reserva = reservaDe(10, cliente(1));
        when(usuarioActualService.esPersonal()).thenReturn(false);
        when(estadiaRepository.findById(4)).thenReturn(Optional.of(estadiaDe(4, reserva)));
        when(pagoRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        Pago cuerpo = pago("25");
        Estadia soloId = new Estadia();
        soloId.setIdEstadia(4);
        cuerpo.setEstadia(soloId);

        Pago guardado = servicio().registrar(cuerpo);

        assertEquals(10, guardado.getReserva().getIdReserva());
    }

    @Test
    void unaReservaQueNoEsDeLaEstadiaSeRechaza() {
        Estadia estadia = estadiaDe(4, reservaDe(10, cliente(1)));
        Pago cuerpo = pago("25");
        cuerpo.setEstadia(estadia);
        cuerpo.setReserva(reservaDe(99, cliente(1)));

        assertThrows(IllegalStateException.class, () -> servicio().registrar(cuerpo));

        verify(pagoRepository, never()).save(any());
    }

    @Test
    void elHistorialDeUnaReservaIncluyeLosPagosDeSuEstadia() {
        Pago deEstadia = pago("40");
        when(pagoRepository.findDeReservaOSuEstadia(10)).thenReturn(java.util.List.of(deEstadia));

        assertEquals(java.util.List.of(deEstadia), servicio().listarPorReserva(10));
    }

    // ------------------------------------------------------------------ apoyo

    private static Estadia estadiaDe(int id, Reserva reserva) {
        Estadia e = new Estadia();
        e.setIdEstadia(id);
        e.setReserva(reserva);
        return e;
    }

    private static Pago pago(String monto) {
        Pago p = new Pago();
        p.setMonto(new BigDecimal(monto));
        p.setMetodoPago(MetodoPago.EFECTIVO);
        p.setConcepto(ConceptoPago.PAGO_PARCIAL_ESTADIA);
        return p;
    }

    private static Cliente cliente(int id) {
        Cliente c = new Cliente();
        c.setIdCliente(id);
        return c;
    }

    private static Reserva reservaDe(int id, Cliente cliente) {
        Reserva r = new Reserva();
        r.setIdReserva(id);
        r.setCliente(cliente);
        return r;
    }
}
