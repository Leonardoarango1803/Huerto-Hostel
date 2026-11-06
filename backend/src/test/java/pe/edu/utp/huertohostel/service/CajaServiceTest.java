package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.utp.huertohostel.entity.ArqueoParcial;
import pe.edu.utp.huertohostel.entity.BitacoraTurno;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.EstadoTurno;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.MovimientoCaja;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.TurnoCaja;
import pe.edu.utp.huertohostel.repository.ArqueoParcialRepository;
import pe.edu.utp.huertohostel.repository.BitacoraTurnoRepository;
import pe.edu.utp.huertohostel.repository.MovimientoCajaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.TurnoCajaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * La caja es unica para todo el hotel: una sola abierta, cualquiera de caja puede cerrarla. El cierre es guiado:
 * se verifica el conteo antes de cerrar y una diferencia de dinero queda como nota pendiente que no se puede ignorar.
 */
@ExtendWith(MockitoExtension.class)
class CajaServiceTest {

    @Mock
    TurnoCajaRepository turnoCajaRepository;
    @Mock
    BitacoraTurnoRepository bitacoraRepository;
    @Mock
    PagoRepository pagoRepository;
    @Mock
    MovimientoCajaRepository movimientoRepository;
    @Mock
    ArqueoParcialRepository arqueoRepository;
    @Mock
    TurnoService turnoService;
    @Mock
    UsuarioActualService usuarioActualService;

    private CajaService servicio() {
        return new CajaService(turnoCajaRepository, bitacoraRepository, pagoRepository, movimientoRepository,
                arqueoRepository, turnoService, usuarioActualService, new BigDecimal("1000"), 16);
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
                () -> servicio().abrir(new BigDecimal("50"), null));

        assertTrue(e.getMessage().contains("Maria Recepcionista"), e.getMessage());
        assertTrue(e.getMessage().contains("01/11 19:59"), e.getMessage());
        verify(turnoCajaRepository, never()).saveAndFlush(any());
    }

    @Test
    void siDosPersonasAbrenAlMismoTiempoGanaUnaSolaYLaOtraRecibeUnMensajeClaro() {
        sinTurnoAbiertoNiCierreAnterior();
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        // El indice unico parcial de la base rechaza al segundo INSERT
        when(turnoCajaRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_turno_caja_abierto"));

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().abrir(BigDecimal.TEN, null));

        assertTrue(e.getMessage().contains("acaba de ser abierta"), e.getMessage());
    }

    @Test
    void abrirSinNingunaCajaAbiertaCreaElTurnoAbierto() {
        sinTurnoAbiertoNiCierreAnterior();
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(1, "Maria", "Recepcionista"));
        when(turnoCajaRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja abierto = servicio().abrir(new BigDecimal("100"), null);

        assertEquals(EstadoTurno.ABIERTO, abierto.getEstado());
        assertEquals(new BigDecimal("100"), abierto.getFondoInicialEfectivo());
        assertEquals("Maria", abierto.getEmpleado().getNombres());
        verify(bitacoraRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ recibir la caja

    @Test
    void recibirLaCajaConLoMismoQueDejoElTurnoAnteriorNoGeneraNada() {
        cierreAnteriorDeclarado("150");
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        when(turnoCajaRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja abierto = servicio().abrir(new BigDecimal("150"), null);

        assertEquals(new BigDecimal("150"), abierto.getEfectivoAperturaEsperado());
        assertEquals(0, abierto.getDiferenciaApertura().signum());
        verify(bitacoraRepository, never()).save(any());
    }

    @Test
    void recibirLaCajaConOtroMontoExigeExplicarlo_yElMensajeNoRevelaLoQueDejoElTurnoAnterior() {
        cierreAnteriorDeclarado("150");

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().abrir(new BigDecimal("100"), "  "));

        assertTrue(e.getMessage().contains("no coincide con lo que dejo el turno anterior"), e.getMessage());
        assertFalse(e.getMessage().contains("150"), "el conteo de quien recibe debe ser honesto");
        verify(turnoCajaRepository, never()).saveAndFlush(any());
    }

    @Test
    void recibirUnaCajaConFaltanteQuedaComoNotaDeAperturaPendienteConElMonto() {
        cierreAnteriorDeclarado("150");
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        when(turnoCajaRepository.saveAndFlush(any())).thenAnswer(i -> {
            TurnoCaja t = i.getArgument(0);
            t.setIdTurnoCaja(9);
            return t;
        });

        TurnoCaja abierto = servicio().abrir(new BigDecimal("120"), "Faltaban dos billetes de 20 y uno de 10");

        assertEquals(new BigDecimal("-30"), abierto.getDiferenciaApertura());
        BitacoraTurno nota = notaGuardada();
        assertEquals(CajaService.APERTURA, nota.getCategoria());
        assertEquals("ALTA", nota.getPrioridad());
        assertEquals(new BigDecimal("-30"), nota.getMonto());
        assertFalse(nota.getResuelto());
        assertTrue(nota.getMensaje().contains("FALTANTE de S/ 30"), nota.getMensaje());
        assertTrue(nota.getMensaje().contains("turno #8"), nota.getMensaje());
    }

    @Test
    void laInfoDeAperturaDiceConCuantoQuedoLaCajaYQueDiferenciasSiguenPendientes() {
        cierreAnteriorDeclarado("150");
        BitacoraTurno pendiente = new BitacoraTurno();
        when(bitacoraRepository.findByResueltoFalseAndCategoriaInOrderByFechaHoraDesc(any()))
                .thenReturn(List.of(pendiente));

        Map<String, Object> info = servicio().infoApertura();

        @SuppressWarnings("unchecked")
        Map<String, Object> cierre = (Map<String, Object>) info.get("ultimoCierre");
        assertEquals(new BigDecimal("150"), cierre.get("efectivoDeclarado"));
        assertEquals(8, cierre.get("idTurnoCaja"));
        assertEquals(List.of(pendiente), info.get("diferenciasPendientes"));
    }

    // ------------------------------------------------------------------ verificar el conteo antes de cerrar

    @Test
    void siElConteoCuadraLaVerificacionLoDiceYNoCuentaUnReconteo() {
        turnoAbiertoConEsperado(3, "20", "100"); // espera 120

        Map<String, Object> r = servicio().verificarCierre(3, new BigDecimal("120"));

        assertEquals(true, r.get("cuadra"));
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    void laPrimeraVezQueNoCuadraSoloDiceSiFaltaOSobraYNoMuestraElMontoEsperado() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100"); // espera 120
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> r = servicio().verificarCierre(3, new BigDecimal("100"));

        assertEquals(false, r.get("cuadra"));
        assertEquals("FALTA", r.get("direccion"));
        assertEquals(false, r.get("revelado"));
        assertFalse(r.containsKey("efectivoEsperado"), "primero se pide recontar, sin dar el monto");
        assertFalse(r.containsKey("diferencia"));
        assertTrue(((String) r.get("recomendacion")).contains("Vuelve a contar"));
        assertEquals((short) 1, turno.getReconteosCierre());
        assertFalse(turno.getEsperadoRevelado());
    }

    @Test
    void laSegundaVezQueNoCuadraYaMuestraLoQueEsperaElSistemaYLoDejaRegistrado() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100"); // espera 120
        turno.setReconteosCierre((short) 1);
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> r = servicio().verificarCierre(3, new BigDecimal("110"));

        assertEquals(true, r.get("revelado"));
        assertEquals(new BigDecimal("120"), r.get("efectivoEsperado"));
        assertEquals(new BigDecimal("-10"), r.get("diferencia"));
        assertTrue(((String) r.get("mensaje")).contains("faltan S/ 10"), (String) r.get("mensaje"));
        assertEquals((short) 2, turno.getReconteosCierre());
        assertTrue(turno.getEsperadoRevelado(), "queda constancia de que el cajero vio lo esperado");
    }

    @Test
    void unSobranteTambienSeAvisaAntesDeCerrar() {
        turnoAbiertoConEsperado(3, "20", "100"); // espera 120
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> r = servicio().verificarCierre(3, new BigDecimal("130"));

        assertEquals("SOBRA", r.get("direccion"));
    }

    @Test
    void noSeVerificaUnTurnoYaCerrado() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setEstado(EstadoTurno.CERRADO);
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));

        assertThrows(IllegalStateException.class, () -> servicio().verificarCierre(3, BigDecimal.TEN));
    }

    // ------------------------------------------------------------------ cerrar

    @Test
    void elCajeroPuedeCerrarLaCajaQueAbrioRecepcionYQuedaRegistradoQuienCerro() {
        Empleado recepcion = empleado(1, "Maria", "Recepcionista");
        Empleado cajero = empleado(2, "Carlos", "Cajero");
        TurnoCaja turno = turno(3, recepcion);
        turno.setFondoInicialEfectivo(new BigDecimal("20"));
        turno.setReconteosCierre((short) 1); // ya verifico: el conteo no cuadraba

        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));
        when(pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(3)).thenReturn(List.of(
                pago(MetodoPago.EFECTIVO, "100"),      // por ejemplo un adelanto en efectivo
                pago(MetodoPago.TARJETA_POS, "50")));  // la tarjeta no entra al efectivo del cajon
        when(usuarioActualService.obtenerEmpleado()).thenReturn(cajero);
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja cerrado = servicio().cerrar(3, new BigDecimal("125"), "relevo", "Sobro un billete de 5", null);

        assertEquals(EstadoTurno.CERRADO, cerrado.getEstado());
        assertSame(recepcion, cerrado.getEmpleado(), "quien abrio no cambia");
        assertSame(cajero, cerrado.getEmpleadoCierre(), "queda registrado quien cerro");
        assertEquals(new BigDecimal("120"), cerrado.getEfectivoSistemaEsperado()); // 20 de fondo + 100 en efectivo
        assertEquals(new BigDecimal("5"), cerrado.getDiferenciaCuadre());          // declaro 125
        assertEquals("Sobro un billete de 5", cerrado.getMotivoDiferencia());
    }

    @Test
    void cerrarConDiferenciaSinHaberVerificadoElConteoSeRechaza() {
        turnoAbiertoConEsperado(3, "20", "100"); // espera 120, reconteos 0

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().cerrar(3, new BigDecimal("100"), null, "Faltaba", null));

        assertTrue(e.getMessage().contains("verifica el conteo"), e.getMessage());
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    void cerrarConDiferenciaExigeExplicarElMotivo() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100");
        turno.setReconteosCierre((short) 2);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().cerrar(3, new BigDecimal("100"), null, "   ", null));

        assertTrue(e.getMessage().contains("motivo"), e.getMessage());
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    void cerrarConFaltanteDejaUnaNotaDeDineroPendienteDePrioridadAltaConElMonto() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100"); // espera 120
        turno.setReconteosCierre((short) 2);
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        servicio().cerrar(3, new BigDecimal("100"), null, "No aparecio el vuelto de una venta", "{\"100\":1}");

        BitacoraTurno nota = notaGuardada();
        assertEquals(CajaService.DESCUADRE, nota.getCategoria());
        assertEquals("ALTA", nota.getPrioridad());
        assertEquals(new BigDecimal("-20"), nota.getMonto());
        assertFalse(nota.getResuelto(), "no se puede dejar pasar: queda pendiente");
        assertTrue(nota.getMensaje().contains("FALTANTE de S/ 20"), nota.getMensaje());
        assertTrue(nota.getMensaje().contains("Carlos Cajero"), nota.getMensaje());
        assertTrue(nota.getMensaje().contains("No aparecio el vuelto"), nota.getMensaje());
        assertEquals("{\"100\":1}", turno.getDesgloseCierre());
    }

    @Test
    void unCierreQueCuadraNoExigeVerificarNiExplicarNiDejaNotas() {
        turnoAbiertoConEsperado(3, "20", "100"); // espera 120
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja cerrado = servicio().cerrar(3, new BigDecimal("120"), null, null, null);

        assertEquals(0, cerrado.getDiferenciaCuadre().signum());
        assertNull(cerrado.getMotivoDiferencia());
        verify(bitacoraRepository, never()).save(any());
    }

    @Test
    void losRetirosYGastosBajanElEfectivoQueEsperaElSistema() {
        turnoAbiertoConEsperado(3, "20", "100"); // 120 antes del retiro
        when(movimientoRepository.totalDelTurno(3)).thenReturn(new BigDecimal("30")); // retiro a custodia de 30
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja cerrado = servicio().cerrar(3, new BigDecimal("90"), null, null, null);

        assertEquals(new BigDecimal("90"), cerrado.getEfectivoSistemaEsperado());
        assertEquals(0, cerrado.getDiferenciaCuadre().signum());
    }

    @Test
    void noSePuedeCerrarDosVecesElMismoTurno() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setEstado(EstadoTurno.CERRADO);
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));

        assertThrows(IllegalStateException.class, () -> servicio().cerrar(3, BigDecimal.TEN, null, null, null));
    }

    // ------------------------------------------------------------------ retiros y gastos

    @Test
    void unRetiroMayorAlEfectivoDeLaCajaSeRechaza() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100"); // 120 en caja
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(turno));

        assertThrows(IllegalStateException.class,
                () -> servicio().registrarMovimiento("RETIRO", new BigDecimal("500"), "A custodia"));

        verify(movimientoRepository, never()).save(any());
    }

    @Test
    void unRetiroValidoQuedaConSuMotivoYQuienLoHizo() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100");
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(turno));
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));
        when(movimientoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        MovimientoCaja mov = servicio().registrarMovimiento("retiro", new BigDecimal("80"), " A custodia ");

        assertEquals("RETIRO", mov.getTipo());
        assertEquals("A custodia", mov.getMotivo());
        assertEquals("Carlos", mov.getEmpleado().getNombres());
    }

    @Test
    void unMovimientoSinMotivoOConTipoRaroSeRechaza() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(turno(3, empleado(1, "Maria", "Recepcionista"))));

        assertThrows(IllegalStateException.class, () -> servicio().registrarMovimiento("GASTO", BigDecimal.TEN, " "));
        assertThrows(IllegalStateException.class, () -> servicio().registrarMovimiento("PRESTAMO", BigDecimal.TEN, "x"));
        assertThrows(IllegalStateException.class, () -> servicio().registrarMovimiento("GASTO", BigDecimal.ZERO, "x"));
    }

    // ------------------------------------------------------------------ resumen y arqueo ciego

    @Test
    void conElTurnoAbiertoElResumenNoRevelaElEsperadoPeroAvisaSiSuperaElTope() {
        turnoAbiertoConEsperado(3, "0", "1500"); // 1500 >= tope de 1000

        Map<String, Object> resumen = servicio().resumenTurno(3, false);

        assertEquals(true, resumen.get("cierreCiego"));
        assertEquals(true, resumen.get("superaTope"));
        assertFalse(resumen.containsKey("efectivoEsperado"), "arqueo ciego");
    }

    @Test
    void trasFallarElConteoYaSeRevelaElEsperadoEnElResumen() {
        TurnoCaja turno = turnoAbiertoConEsperado(3, "20", "100");
        turno.setEsperadoRevelado(true);

        Map<String, Object> resumen = servicio().resumenTurno(3, false);

        assertEquals(false, resumen.get("cierreCiego"));
        assertEquals(new BigDecimal("120"), resumen.get("efectivoEsperado"));
    }

    // ------------------------------------------------------------------ notas de diferencia

    @Test
    void elCajeroNoPuedeEscribirUnaNotaConLaCategoriaDeDiferenciasDelSistema() {
        assertThrows(IllegalStateException.class,
                () -> servicio().registrarEnBitacora(3, "descuadre", "Todo bien, no paso nada", "BAJA"));
        verifyNoInteractions(turnoCajaRepository);
    }

    @Test
    void unaDiferenciaDeDineroNoLaResuelveQuienNoEsAdministrador() {
        BitacoraTurno nota = notaDeDinero(CajaService.DESCUADRE);
        when(bitacoraRepository.findById(7)).thenReturn(Optional.of(nota));
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> servicio().marcarResuelto(7, true, "Ya esta"));

        assertFalse(nota.getResuelto());
        verify(bitacoraRepository, never()).save(any());
    }

    @Test
    void elAdministradorDebeExplicarComoSeResolvioUnaDiferencia() {
        BitacoraTurno nota = notaDeDinero(CajaService.APERTURA);
        when(bitacoraRepository.findById(7)).thenReturn(Optional.of(nota));
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> servicio().marcarResuelto(7, true, "  "));
        assertFalse(nota.getResuelto());
    }

    @Test
    void alResolverUnaDiferenciaQuedaQuienCuandoYComo() {
        BitacoraTurno nota = notaDeDinero(CajaService.DESCUADRE);
        Empleado admin = empleado(9, "Ana", "Admin");
        when(bitacoraRepository.findById(7)).thenReturn(Optional.of(nota));
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);
        when(usuarioActualService.empleadoOpcional()).thenReturn(admin);
        when(bitacoraRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        BitacoraTurno resuelta = servicio().marcarResuelto(7, true, "El cajero repuso S/ 20 el mismo dia");

        assertTrue(resuelta.getResuelto());
        assertSame(admin, resuelta.getEmpleadoResolvio());
        assertNotNull(resuelta.getFechaResolucion());
        assertEquals("El cajero repuso S/ 20 el mismo dia", resuelta.getComentarioResolucion());
    }

    @Test
    void reabrirUnaNotaLimpiaQuienLaResolvio() {
        BitacoraTurno nota = notaDeDinero(CajaService.DESCUADRE);
        nota.setResuelto(true);
        nota.setEmpleadoResolvio(empleado(9, "Ana", "Admin"));
        nota.setFechaResolucion(LocalDateTime.now());
        nota.setComentarioResolucion("ok");
        when(bitacoraRepository.findById(7)).thenReturn(Optional.of(nota));
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);
        when(bitacoraRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        BitacoraTurno reabierta = servicio().marcarResuelto(7, false, null);

        assertFalse(reabierta.getResuelto());
        assertNull(reabierta.getEmpleadoResolvio());
        assertNull(reabierta.getComentarioResolucion());
    }

    @Test
    void unaNotaNormalLaResuelveCualquieraDeCajaSinComentario() {
        BitacoraTurno nota = new BitacoraTurno();
        nota.setCategoria("GENERAL");
        nota.setResuelto(false);
        when(bitacoraRepository.findById(7)).thenReturn(Optional.of(nota));
        when(usuarioActualService.empleadoOpcional()).thenReturn(empleado(1, "Maria", "Recepcionista"));
        when(bitacoraRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        BitacoraTurno resuelta = servicio().marcarResuelto(7, true, null);

        assertTrue(resuelta.getResuelto());
        assertNull(resuelta.getComentarioResolucion());
    }

    // ------------------------------------------------------------------ auditoria

    @Test
    void noSeAuditaUnTurnoConDiferenciasDeDineroSinResolver() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setEstado(EstadoTurno.CERRADO);
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));
        when(bitacoraRepository.countByTurnoCajaIdTurnoCajaAndResueltoFalseAndCategoriaIn(eqTurno(3), any())).thenReturn(1L);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().auditar(3));

        assertTrue(e.getMessage().contains("sin resolver"), e.getMessage());
        assertEquals(EstadoTurno.CERRADO, turno.getEstado());
    }

    @Test
    void conTodasLasDiferenciasResueltasElTurnoSePuedeAuditar() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setEstado(EstadoTurno.CERRADO);
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(turno));
        when(bitacoraRepository.countByTurnoCajaIdTurnoCajaAndResueltoFalseAndCategoriaIn(eqTurno(3), any())).thenReturn(0L);
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        assertEquals(EstadoTurno.AUDITADO, servicio().auditar(3).getEstado());
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
    void elEstadoDeLaCajaCerradaNoTraeDatosDeTurno() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());

        Map<String, Object> estado = servicio().estadoCaja();

        assertEquals(false, estado.get("abierta"));
        assertEquals(1, estado.size());
    }

    @Test
    void lasNotasPendientesDelRelevoSalenDeUnaSolaConsultaYNoUnaPorTurno() {
        BitacoraTurno nota = new BitacoraTurno();
        nota.setMensaje("Dejaron un sobre sin contar");
        when(bitacoraRepository.findByResueltoFalseOrderByFechaHoraDesc()).thenReturn(List.of(nota));

        assertEquals(List.of(nota), servicio().pendientesDeRelevo());

        verifyNoInteractions(turnoCajaRepository);
    }

    // ------------------------------------------------------------------ caja olvidada abierta

    @Test
    void elEstadoAvisaCuandoElTurnoLlevaMasHorasQueElLimite() {
        TurnoCaja viejo = turno(3, empleado(1, "Maria", "Recepcionista"));
        viejo.setFechaApertura(LocalDateTime.now().minusHours(20));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(viejo));

        Map<String, Object> estado = servicio().estadoCaja();

        assertEquals(true, estado.get("excedeLimite"));
        assertEquals(16, estado.get("limiteHoras"));
        assertTrue((Long) estado.get("horasAbierta") >= 20);
    }

    @Test
    void unTurnoRecienAbiertoNoExcedeElLimite() {
        TurnoCaja nuevo = turno(3, empleado(1, "Maria", "Recepcionista"));
        nuevo.setFechaApertura(LocalDateTime.now().minusHours(2));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(nuevo));

        assertEquals(false, servicio().estadoCaja().get("excedeLimite"));
    }

    // ------------------------------------------------------------------ cierre forzado

    @Test
    void elCierreForzadoSoloValeParaUnTurnoQueExcedeElLimiteDeHoras() {
        TurnoCaja joven = turno(3, empleado(1, "Maria", "Recepcionista"));
        joven.setFechaApertura(LocalDateTime.now().minusHours(3));
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(joven));

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().cerrarForzado(3, BigDecimal.ZERO, "Se olvidaron"));

        assertTrue(e.getMessage().contains("cierre normal"), e.getMessage());
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    void elCierreForzadoExigeElMotivo() {
        TurnoCaja viejo = turno(3, empleado(1, "Maria", "Recepcionista"));
        viejo.setFechaApertura(LocalDateTime.now().minusHours(30));
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(viejo));

        assertThrows(IllegalStateException.class, () -> servicio().cerrarForzado(3, BigDecimal.ZERO, "  "));
    }

    @Test
    void elCierreForzadoCuadradoCierraYDejaUnAvisoParaElSiguienteTurnoSinNotaDeDinero() {
        Empleado maria = empleado(1, "Maria", "Recepcionista");
        TurnoCaja viejo = turno(3, maria);
        viejo.setFondoInicialEfectivo(new BigDecimal("50"));
        viejo.setFechaApertura(LocalDateTime.now().minusHours(30));
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(viejo));
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(9, "Admin", "Sistema"));
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        TurnoCaja cerrado = servicio().cerrarForzado(3, new BigDecimal("50"), "Se olvidaron de cerrar");

        assertEquals(EstadoTurno.CERRADO, cerrado.getEstado());
        assertTrue(cerrado.getObservacionesCierre().startsWith("CIERRE FORZADO"), cerrado.getObservacionesCierre());
        ArgumentCaptor<BitacoraTurno> nota = ArgumentCaptor.forClass(BitacoraTurno.class);
        verify(bitacoraRepository).save(nota.capture());
        assertEquals("CIERRE_FORZADO", nota.getValue().getCategoria());
        assertEquals("ALTA", nota.getValue().getPrioridad());
        assertNull(nota.getValue().getMonto());
    }

    @Test
    void elCierreForzadoConDiferenciaTambienDejaLaNotaDeDinero() {
        TurnoCaja viejo = turno(3, empleado(1, "Maria", "Recepcionista"));
        viejo.setFondoInicialEfectivo(new BigDecimal("50"));
        viejo.setFechaApertura(LocalDateTime.now().minusHours(30));
        when(turnoCajaRepository.findById(3)).thenReturn(Optional.of(viejo));
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(9, "Admin", "Sistema"));
        when(turnoCajaRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        servicio().cerrarForzado(3, new BigDecimal("30"), "Se olvidaron de cerrar");

        ArgumentCaptor<BitacoraTurno> notas = ArgumentCaptor.forClass(BitacoraTurno.class);
        verify(bitacoraRepository, org.mockito.Mockito.times(2)).save(notas.capture());
        assertTrue(notas.getAllValues().stream().anyMatch(n -> "DESCUADRE".equals(n.getCategoria())
                && n.getMonto().compareTo(new BigDecimal("-20")) == 0));
    }

    @Test
    void elCajeroNoPuedeEscribirNotasConCategoriasDelSistema() {
        for (String categoria : List.of("DESCUADRE", "apertura", "CIERRE_FORZADO", "ARQUEO")) {
            assertThrows(IllegalStateException.class,
                    () -> servicio().registrarEnBitacora(3, categoria, "x", "BAJA"), categoria);
        }
    }

    // ------------------------------------------------------------------ arqueo parcial

    @Test
    void elArqueoParcialQueCuadraNoDejaNotaNiMuestraMontosAlCajero() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setFondoInicialEfectivo(new BigDecimal("100"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO)).thenReturn(Optional.of(turno));
        when(arqueoRepository.countByTurnoCajaIdTurnoCaja(3)).thenReturn(0L);
        when(pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(3)).thenReturn(List.of());
        when(movimientoRepository.totalDelTurno(3)).thenReturn(BigDecimal.ZERO);
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));

        Map<String, Object> r = servicio().arqueoParcial(new BigDecimal("100"));

        assertEquals(true, r.get("cuadra"));
        assertFalse(r.containsKey("efectivoEsperado"));
        verify(arqueoRepository).save(any(ArqueoParcial.class));
        verify(bitacoraRepository, never()).save(any());
    }

    @Test
    void elArqueoParcialQueNoCuadraDiceSoloSiFaltaYDejaUnaNotaSinMontosDelSistema() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setFondoInicialEfectivo(new BigDecimal("100"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO)).thenReturn(Optional.of(turno));
        when(arqueoRepository.countByTurnoCajaIdTurnoCaja(3)).thenReturn(1L);
        when(pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(3)).thenReturn(List.of());
        when(movimientoRepository.totalDelTurno(3)).thenReturn(BigDecimal.ZERO);
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(2, "Carlos", "Cajero"));

        Map<String, Object> r = servicio().arqueoParcial(new BigDecimal("80"));

        assertEquals(false, r.get("cuadra"));
        assertEquals("FALTA", r.get("resultado"));
        assertFalse(r.containsKey("efectivoEsperado"), "el cajero no ve lo que espera el sistema");
        assertFalse(r.containsKey("diferencia"));
        ArgumentCaptor<BitacoraTurno> nota = ArgumentCaptor.forClass(BitacoraTurno.class);
        verify(bitacoraRepository).save(nota.capture());
        assertEquals("ARQUEO", nota.getValue().getCategoria());
        assertEquals("MEDIA", nota.getValue().getPrioridad());
        assertNull(nota.getValue().getMonto(), "no es una nota de dinero: no bloquea la auditoria");
        assertFalse(nota.getValue().getMensaje().contains("100"), "no filtra el esperado");
    }

    @Test
    void elAdministradorSiVeLoEsperadoYLaDiferenciaDelArqueoParcial() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        turno.setFondoInicialEfectivo(new BigDecimal("100"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO)).thenReturn(Optional.of(turno));
        when(arqueoRepository.countByTurnoCajaIdTurnoCaja(3)).thenReturn(0L);
        when(pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(3)).thenReturn(List.of());
        when(movimientoRepository.totalDelTurno(3)).thenReturn(BigDecimal.ZERO);
        when(usuarioActualService.obtenerEmpleado()).thenReturn(empleado(9, "Admin", "Sistema"));
        when(usuarioActualService.tieneRol(pe.edu.utp.huertohostel.security.Roles.ADMINISTRADOR)).thenReturn(true);

        Map<String, Object> r = servicio().arqueoParcial(new BigDecimal("90"));

        assertEquals(new BigDecimal("100"), r.get("efectivoEsperado"));
        assertEquals(new BigDecimal("-10"), r.get("diferencia"));
    }

    @Test
    void sePuedenHacerComoMaximoCincoArqueosParcialesPorTurno() {
        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO)).thenReturn(Optional.of(turno));
        when(arqueoRepository.countByTurnoCajaIdTurnoCaja(3)).thenReturn(5L);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().arqueoParcial(new BigDecimal("10")));

        assertTrue(e.getMessage().contains("maximo"), e.getMessage());
        verify(arqueoRepository, never()).save(any());
    }

    @Test
    void elArqueoParcialExigeCajaAbiertaYMontoValido() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> servicio().arqueoParcial(new BigDecimal("10")));

        TurnoCaja turno = turno(3, empleado(1, "Maria", "Recepcionista"));
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO)).thenReturn(Optional.of(turno));
        assertThrows(IllegalStateException.class, () -> servicio().arqueoParcial(null));
        assertThrows(IllegalStateException.class, () -> servicio().arqueoParcial(new BigDecimal("-1")));
    }

    // ------------------------------------------------------------------ apoyo

    private static Integer eqTurno(int id) {
        return org.mockito.ArgumentMatchers.eq(id);
    }

    private void sinTurnoAbiertoNiCierreAnterior() {
        when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());
        when(turnoCajaRepository.findFirstByEstadoNotOrderByFechaCierreDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());
    }

    /** El turno #8 cerro dejando {@code declarado} soles en la caja. */
    private void cierreAnteriorDeclarado(String declarado) {
        lenient().when(turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.empty());
        TurnoCaja anterior = turno(8, empleado(1, "Maria", "Recepcionista"));
        anterior.setEstado(EstadoTurno.CERRADO);
        anterior.setEfectivoRealDeclarado(new BigDecimal(declarado));
        anterior.setDiferenciaCuadre(BigDecimal.ZERO);
        anterior.setEmpleadoCierre(empleado(1, "Maria", "Recepcionista"));
        anterior.setFechaCierre(LocalDateTime.of(2026, 11, 4, 23, 0));
        when(turnoCajaRepository.findFirstByEstadoNotOrderByFechaCierreDesc(EstadoTurno.ABIERTO))
                .thenReturn(Optional.of(anterior));
    }

    /** Turno abierto con {@code fondo} y un cobro en efectivo de {@code efectivo}: espera la suma. */
    private TurnoCaja turnoAbiertoConEsperado(int id, String fondo, String efectivo) {
        TurnoCaja turno = turno(id, empleado(1, "Maria", "Recepcionista"));
        turno.setFondoInicialEfectivo(new BigDecimal(fondo));
        // lenient: los retiros buscan el turno abierto, no por id
        lenient().when(turnoCajaRepository.findById(id)).thenReturn(Optional.of(turno));
        when(pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(id))
                .thenReturn(List.of(pago(MetodoPago.EFECTIVO, efectivo), pago(MetodoPago.TARJETA_POS, "50")));
        return turno;
    }

    private BitacoraTurno notaGuardada() {
        ArgumentCaptor<BitacoraTurno> c = ArgumentCaptor.forClass(BitacoraTurno.class);
        verify(bitacoraRepository).save(c.capture());
        return c.getValue();
    }

    private static BitacoraTurno notaDeDinero(String categoria) {
        BitacoraTurno n = new BitacoraTurno();
        n.setIdBitacora(7);
        n.setCategoria(categoria);
        n.setPrioridad("ALTA");
        n.setMonto(new BigDecimal("-20"));
        n.setResuelto(false);
        return n;
    }

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
