package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.EstadoTurno;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.TurnoCaja;
import pe.edu.utp.huertohostel.repository.BitacoraTurnoRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.TurnoCajaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** La caja es unica para todo el hotel: una sola abierta, cualquiera de caja puede cerrarla. */
@ExtendWith(MockitoExtension.class)
class CajaServiceTest {

    @Mock
    TurnoCajaRepository turnoCajaRepository;
    @Mock
    BitacoraTurnoRepository bitacoraRepository;
    @Mock
    PagoRepository pagoRepository;
    @Mock
    UsuarioActualService usuarioActualService;

    private CajaService servicio() {
        return new CajaService(turnoCajaRepository, bitacoraRepository, pagoRepository, usuarioActualService);
    }

    // ------------------------------------------------------------------ exigir caja abierta

    @Test
    void conLaCajaCerradaExigirRechazaConUnMensajeQueElFrontPuedeMostrar() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().exigirCajaAbierta());

        assertTrue(e.getMessage().contains("La caja esta cerrada"));
    }

    @Test
    void conLaCajaAbiertaExigirDevuelveElTurno() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(turno));

        assertSame(turno, servicio().exigirCajaAbierta());
    }

    @Test
    void elPersonalNoPuedeOperarConLaCajaCerrada() {
        when(usuarioActualService.esPersonal()).thenReturn(true);
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> servicio().exigirCajaAbiertaSiEsPersonal());
    }

    @Test
    void unHuespedNuncaDependeDeLaCaja() {
        when(usuarioActualService.esPersonal()).thenReturn(false);

        assertDoesNotThrow(() -> servicio().exigirCajaAbiertaSiEsPersonal());
        verify(turnoCajaRepository, never()).findFirstByEstadoOrderByFechaAperturaDesc(any());
    }

    // ------------------------------------------------------------------ una sola caja

    @Test
    void noSePuedeAbrirOtraCajaSiYaHayUnaYElMensajeDiceQuienLaAbrio() {
        TurnoCaja abierto = turno(3, empleado(1, "Maria", "Recepcionista"));
        abierto.setFechaApertura(LocalDateTime.of(2026, 11, 1, 19, 59));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(abierto));

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().abrir(new BigDecimal("50")));

        assertTrue(e.getMessage().contains("Maria Recepcionista"), e.getMessage());
        assertTrue(e.getMessage().contains("01/11 19:59"), e.getMessage());
        verify(turnoCajaRepository, never()).saveAndFlush(any());
    }

    @Test
    void siDosPersonasAbrenAlMismoTiempoGanaUnaSolaYLaOtraRecibeUnMensajeClaro() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        // El indice unico parcial de la base rechaza al segundo INSERT
        when(turnoCajaRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_turno_caja_abierto"));

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().abrir(BigDecimal.TEN));

        assertTrue(e.getMessage().contains("acaba de ser abierta"), e.getMessage());
    }

    @Test
    void abrirSinNingunaCajaAbiertaCreaElTurnoAbierto() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(1, "Maria", "Recepcionista"));
        when(turnoCajaRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja abierto = servicio().abrir(new BigDecimal("100"));

        assertEquals(EstadoTurno.ABIERTO, abierto.getEstado());
        assertEquals(new BigDecimal("100"), abierto.getFondoInicialEfectivo());
        assertEquals("Maria", abierto.getEmpleado().getNombres());
    }

    // ------------------------------------------------------------------ relevo

    @Test
    void elCajeroPuedeCerrarLaCajaQueAbrioRecepcionYQuedaRegistradoQuienCerro() {
        Empleado recepcion = empleado(1, "Maria", "Recepcionista");
        Empleado cajero = empleado(2, "Carlos", "Cajero");
        TurnoCaja turno = turno(3, recepcion);
        turno.setFondoInicialEfectivo(new BigDecimal("20"));

        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));
        when(pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(3)).thenReturn(List.of(
                pago(MetodoPago.EFECTIVO, "100"),      // por ejemplo un adelanto en efectivo
                pago(MetodoPago.TARJETA_POS, "50")));  // la tarjeta no entra al efectivo del cajon
        when(usuarioActualService.obtenerEmpleado()).thenReturn(cajero);
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja cerrado = servicio().cerrar(3, new BigDecimal("125"), "relevo");

        assertEquals(EstadoTurno.CERRADO, cerrado.getEstado());
        assertSame(recepcion, cerrado.getEmpleado(), "quien abrio no cambia");
        assertSame(cajero, cerrado.getEmpleadoCierre(), "queda registrado quien cerro");
        assertEquals(new BigDecimal("120"), cerrado.getEfectivoSistemaEsperado()); // 20 de fondo + 100 en efectivo
        assertEquals(new BigDecimal("5"), cerrado.getDiferenciaCuadre());          // declaro 125
    }

    @Test
    void noSePuedeCerrarDosVecesElMismoTurno() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setEstado(EstadoTurno.CERRADO);
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));

        assertThrows(IllegalStateException.class, () -> servicio().cerrar(3, BigDecimal.TEN, null));
    }

    // ------------------------------------------------------------------ estado publico

    @Test
    void elEstadoDeLaCajaDiceQuienLaAbrioParaTodosLosRoles() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(turno));

        Map<String, Object> estado = servicio().estadoCaja();

        assertEquals(true, estado.get("abierta"));
        assertEquals(3, estado.get("idTurnoCaja"));
        assertEquals("Maria Recepcionista", estado.get("abiertaPor"));
    }

    @Test
    void elEstadoDeLaCajaCerradaNoTrae_datosDeTurno() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());

        Map<String, Object> estado = servicio().estadoCaja();

        assertEquals(false, estado.get("abierta"));
        assertEquals(1, estado.size());
    }

    // ------------------------------------------------------------------ apoyo

    private static Empleado empleado(int id, String nombres, String apellidos) {
        Empleado e = new Empleado();
        e.setIdEmpleado(id);
        e.setNombres(nombres);
        e.setApellidos(apellidos);
        return e;
    }

    private static TurnoCaja turno(int id, Empleado abrio) {
        TurnoCaja t = new TurnoCaja();
        t.setIdTurnoCaja(id);
        t.setEmpleado(abrio);
        t.setEstado(EstadoTurno.ABIERTO);
        t.setFondoInicialEfectivo(BigDecimal.ZERO);
        t.setFechaApertura(LocalDateTime.of(2026, 11, 1, 8, 0));
        return t;
    }

    private static Pago pago(MetodoPago metodo, String monto) {
        Pago p = new Pago();
        p.setMetodoPago(metodo);
        p.setMonto(new BigDecimal(monto));
        return p;
    }
}
