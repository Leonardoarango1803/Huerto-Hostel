package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.IncidenciaMantenimiento;
import pe.edu.utp.huertohostel.entity.OrigenTareaLimpieza;
import pe.edu.utp.huertohostel.entity.TareaLimpieza;
import pe.edu.utp.huertohostel.entity.TipoIncidencia;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository;
import pe.edu.utp.huertohostel.service.IncidenciaService.ResultadoIncidencia;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Incidencias: quien reporta decide si bloquea la habitacion; al resolver se elige disponible o limpieza (con su tarea);
 * se pueden cerrar como duplicada o sin procedencia y reabrir si la falla vuelve.
 */
@ExtendWith(MockitoExtension.class)
class IncidenciaServiceTest {

    @Mock IncidenciaMantenimientoRepository incidenciaRepository;
    @Mock HabitacionRepository habitacionRepository;
    @Mock UsuarioActualService usuarioActualService;
    @Mock LimpiezaService limpiezaService;

    private final Empleado tecnico = new Empleado();

    @BeforeEach
    void apoyo() {
        lenient().when(usuarioActualService.obtenerEmpleado()).thenReturn(tecnico);
        lenient().when(incidenciaRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(limpiezaService.crearPara(any(), eq(OrigenTareaLimpieza.POST_MANTENIMIENTO), anyString()))
                .thenAnswer(i -> {
                    TareaLimpieza t = new TareaLimpieza();
                    t.setIdTarea(77);
                    return t;
                });
    }

    private IncidenciaService servicio() {
        return new IncidenciaService(incidenciaRepository, habitacionRepository, usuarioActualService, limpiezaService);
    }

    private Habitacion habitacion(EstadoOperativoHab estado) {
        Habitacion h = new Habitacion();
        h.setIdHabitacion(304);
        h.setNumero("304");
        h.setEstadoOperativo(estado);
        return h;
    }

    private IncidenciaMantenimiento incidencia(EstadoIncidencia estado, Habitacion h, boolean bloquea) {
        IncidenciaMantenimiento i = new IncidenciaMantenimiento();
        i.setIdIncidencia(5);
        i.setEstado(estado);
        i.setHabitacion(h);
        i.setTipoIncidencia(TipoIncidencia.AIRE_ACONDICIONADO);
        i.setDescripcion("no enfria");
        i.setBloqueaHabitacion(bloquea);
        when(incidenciaRepository.findById(5)).thenReturn(Optional.of(i));
        return i;
    }

    private void otrasBloqueantes(long cuantas) {
        lenient().when(incidenciaRepository.countByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoInAndIdIncidenciaNot(
                anyInt(), anyList(), anyInt())).thenReturn(cuantas);
    }

    // ------------------------------------------------------------------ reportar: decidir si bloquea

    @Test
    void reportarYBloquearPoneLaHabitacionEnMantenimiento() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        when(habitacionRepository.findById(304)).thenReturn(Optional.of(h));

        ResultadoIncidencia r = servicio().reportar(304, TipoIncidencia.PLOMERIA, "no sale agua", true);

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo());
        assertTrue(r.incidencia().getBloqueaHabitacion());
        assertEquals(TipoIncidencia.PLOMERIA, r.incidencia().getTipoIncidencia());
        assertTrue(r.mensaje().contains("MANTENIMIENTO"), r.mensaje());
    }

    @Test
    void reportarUnaAveriaMenorDejaLaHabitacionDisponible() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        when(habitacionRepository.findById(304)).thenReturn(Optional.of(h));

        ResultadoIncidencia r = servicio().reportar(304, TipoIncidencia.TV_ELECTRONICA, "control sin pilas", false);

        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo());
        assertFalse(r.incidencia().getBloqueaHabitacion());
        assertTrue(r.mensaje().contains("No bloquea"), r.mensaje());
        verify(habitacionRepository, never()).save(any());
    }

    @Test
    void siLaHabitacionEstaOcupadaElBloqueoSeAnotaPeroNoSeMueveAhora() {
        Habitacion h = habitacion(EstadoOperativoHab.OCUPADA);
        when(habitacionRepository.findById(304)).thenReturn(Optional.of(h));

        ResultadoIncidencia r = servicio().reportar(304, TipoIncidencia.OTRO, "ventana rota", true);

        assertEquals(EstadoOperativoHab.OCUPADA, h.getEstadoOperativo(), "no se saca a un huesped");
        assertTrue(r.incidencia().getBloqueaHabitacion(), "queda anotado para bloquear al salir");
        assertTrue(r.mensaje().contains("cuando salga el huesped"), r.mensaje());
    }

    @Test
    void bloquearUnaHabitacionConLimpiezaPendienteLaPasaAMantenimiento() {
        Habitacion h = habitacion(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        when(habitacionRepository.findById(304)).thenReturn(Optional.of(h));

        servicio().reportar(304, TipoIncidencia.OTRO, "olor a gas", true);

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo());
    }

    @Test
    void reportarExigeDescripcion() {
        assertThrows(IllegalStateException.class, () -> servicio().reportar(304, null, "  ", false));
    }

    // ------------------------------------------------------------------ bloquear o liberar despues

    @Test
    void unaAveriaMenorQueSeVuelveGraveSePuedeBloquearDespues() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        IncidenciaMantenimiento i = incidencia(EstadoIncidencia.PENDIENTE, h, false);

        ResultadoIncidencia r = servicio().cambiarBloqueo(5, true);

        assertTrue(i.getBloqueaHabitacion());
        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo());
        assertEquals("MANTENIMIENTO", r.estadoHabitacion());
    }

    @Test
    void liberarElBloqueoDevuelveLaHabitacionAlUsoSiNingunaOtraLaBloquea() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(0);

        ResultadoIncidencia r = servicio().cambiarBloqueo(5, false);

        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo());
        assertTrue(r.mensaje().contains("DISPONIBLE"), r.mensaje());
    }

    @Test
    void siOtraIncidenciaTambienBloqueaLaHabitacionNoSeLibera() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(1);

        ResultadoIncidencia r = servicio().cambiarBloqueo(5, false);

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo());
        assertTrue(r.mensaje().contains("otra incidencia"), r.mensaje());
    }

    @Test
    void noSePuedeCambiarElBloqueoDeUnaIncidenciaCerradaNiRepetirLaMismaDecision() {
        incidencia(EstadoIncidencia.RESUELTO, habitacion(EstadoOperativoHab.DISPONIBLE), false);
        assertThrows(IllegalStateException.class, () -> servicio().cambiarBloqueo(5, true));
    }

    // ------------------------------------------------------------------ iniciar reparacion

    @Test
    void iniciarLaReparacionDeUnaIncidenciaQueBloqueaTambienBloqueaLaHabitacionYMarcaElInicio() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        IncidenciaMantenimiento i = incidencia(EstadoIncidencia.PENDIENTE, h, true);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.EN_REPARACION, null, null);

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo());
        assertNotNull(i.getFechaInicioReparacion(), "de aqui sale el tiempo de respuesta");
        assertEquals(tecnico, i.getEmpleadoResponsable());
        assertTrue(r.mensaje().contains("MANTENIMIENTO"), r.mensaje());
    }

    @Test
    void iniciarLaReparacionDeUnaAveriaMenorNoToCaLaHabitacion() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        incidencia(EstadoIncidencia.PENDIENTE, h, false);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.EN_REPARACION, null, null);

        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo());
        assertTrue(r.mensaje().contains("No bloquea"), r.mensaje());
    }

    // ------------------------------------------------------------------ resolver: elegir el destino

    @Test
    void resolverYEnviarALimpiezaCreaLaTareaParaHousekeeping() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        IncidenciaMantenimiento i = incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(0);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, "Cambie el compresor", "LIMPIEZA");

        assertEquals(EstadoOperativoHab.PENDIENTE_LIMPIEZA, h.getEstadoOperativo());
        assertEquals(77, r.idTareaLimpieza(), "la habitacion no queda en limpieza sin una tarea que la recoja");
        assertEquals("Cambie el compresor", i.getObservaciones());
        assertNotNull(i.getFechaResolucion());
        assertTrue(r.mensaje().contains("tarea #77"), r.mensaje());
    }

    @Test
    void resolverYDejarDisponibleLaVuelveAVenderSinTareaDeLimpieza() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(0);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "DISPONIBLE");

        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo());
        assertNull(r.idTareaLimpieza());
        verify(limpiezaService, never()).crearPara(any(), any(), any());
    }

    @Test
    void sinElegirDestinoUnaHabitacionBloqueadaVaALimpiezaLoSeguro() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(0);

        servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, null);

        assertEquals(EstadoOperativoHab.PENDIENTE_LIMPIEZA, h.getEstadoOperativo());
    }

    @Test
    void unaAveriaMenorResueltaConDestinoLimpiezaCreaLaTareaAunqueNoEstuvieraBloqueada() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        incidencia(EstadoIncidencia.PENDIENTE, h, false);
        otrasBloqueantes(0);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "LIMPIEZA");

        assertEquals(EstadoOperativoHab.PENDIENTE_LIMPIEZA, h.getEstadoOperativo());
        assertEquals(77, r.idTareaLimpieza());
    }

    @Test
    void siLaHabitacionNoEstabaBloqueadaYSeEligeDisponibleNoCambiaNadaYSeExplica() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        incidencia(EstadoIncidencia.PENDIENTE, h, false);
        otrasBloqueantes(0);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "DISPONIBLE");

        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo());
        assertTrue(r.mensaje().contains("no estaba bloqueada"), r.mensaje());
    }

    @Test
    void unaHabitacionOcupadaNuncaSeToca() {
        Habitacion h = habitacion(EstadoOperativoHab.OCUPADA);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(0);

        servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "LIMPIEZA");

        assertEquals(EstadoOperativoHab.OCUPADA, h.getEstadoOperativo());
        verify(limpiezaService, never()).crearPara(any(), any(), any());
    }

    @Test
    void siOtraIncidenciaBloqueanteSigueAbiertaLaHabitacionSigueBloqueada() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(1);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "DISPONIBLE");

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo(), "no se vende con otra averia que la bloquea");
        assertTrue(r.mensaje().contains("otra incidencia"), r.mensaje());
    }

    @Test
    void unaHabitacionYaEnPendienteDeLimpiezaSinTareaRecibeSuTarea() {
        Habitacion h = habitacion(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        incidencia(EstadoIncidencia.EN_REPARACION, h, true);
        otrasBloqueantes(0);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "LIMPIEZA");

        assertEquals(77, r.idTareaLimpieza());
    }

    @Test
    void resolverDirectoDesdePendienteMarcaElInicioParaQueElTiempoDeRespuestaTengaDato() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        IncidenciaMantenimiento i = incidencia(EstadoIncidencia.PENDIENTE, h, false);
        otrasBloqueantes(0);

        servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, null);

        assertNotNull(i.getFechaInicioReparacion());
    }

    // ------------------------------------------------------------------ cerrar sin reparar

    @Test
    void cerrarComoDuplicadaExigeElMotivoYLiberaLaHabitacionQueBloqueaba() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        IncidenciaMantenimiento i = incidencia(EstadoIncidencia.PENDIENTE, h, true);
        otrasBloqueantes(0);

        assertThrows(IllegalStateException.class,
                () -> servicio().cambiarEstado(5, EstadoIncidencia.DUPLICADA, "  ", null));

        i.setEstado(EstadoIncidencia.PENDIENTE);
        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.DUPLICADA, "Es la misma de la 304 del lunes", null);

        assertEquals(EstadoIncidencia.DUPLICADA, i.getEstado());
        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo(), "no habia nada que reparar: vuelve al uso");
        assertNotNull(i.getFechaResolucion());
        assertTrue(r.mensaje().contains("duplicada"), r.mensaje());
    }

    @Test
    void cerrarSinProcedenciaDeUnaIncidenciaQueNoBloqueabaNoTocaLaHabitacion() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        incidencia(EstadoIncidencia.PENDIENTE, h, false);

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.NO_PROCEDE, "El huesped no uso bien el control", null);

        assertEquals(EstadoOperativoHab.DISPONIBLE, h.getEstadoOperativo());
        assertTrue(r.mensaje().contains("sin procedencia"), r.mensaje());
    }

    // ------------------------------------------------------------------ reabrir

    @Test
    void unaResueltaSePuedeReabrirContandoQueFalloYSeCuentanLasVeces() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        IncidenciaMantenimiento i = incidencia(EstadoIncidencia.RESUELTO, h, true);
        i.setFechaResolucion(java.time.LocalDateTime.now());
        i.setObservaciones("Cambie el compresor");

        assertThrows(IllegalStateException.class,
                () -> servicio().cambiarEstado(5, EstadoIncidencia.PENDIENTE, " ", null), "sin contar que fallo no se reabre");

        ResultadoIncidencia r = servicio().cambiarEstado(5, EstadoIncidencia.PENDIENTE, "Volvio a gotear", null);

        assertEquals(EstadoIncidencia.PENDIENTE, i.getEstado());
        assertNull(i.getFechaResolucion());
        assertEquals((short) 1, i.getVecesReabierta());
        assertTrue(i.getObservaciones().contains("Cambie el compresor") && i.getObservaciones().contains("Volvio a gotear"));
        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo(), "si bloqueaba, vuelve a bloquear");
        assertTrue(r.mensaje().contains("reabierta"), r.mensaje());
    }

    @Test
    void unaCerradaSoloPuedeReabrirseNoResolverseDeNuevo() {
        incidencia(EstadoIncidencia.RESUELTO, habitacion(EstadoOperativoHab.DISPONIBLE), false);
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "LIMPIEZA"));
        assertTrue(e.getMessage().contains("reabrela"), e.getMessage());
    }

    @Test
    void unaAbiertaNoVuelveAPendienteNiRepiteElMismoEstado() {
        incidencia(EstadoIncidencia.EN_REPARACION, habitacion(EstadoOperativoHab.MANTENIMIENTO), true);
        assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(5, EstadoIncidencia.PENDIENTE, null, null));
        assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(5, EstadoIncidencia.EN_REPARACION, null, null));
    }

    @Test
    void unDestinoQueNoExisteSeRechaza() {
        assertThrows(IllegalStateException.class,
                () -> servicio().cambiarEstado(5, EstadoIncidencia.RESUELTO, null, "VENDER"));
    }

    // ------------------------------------------------------------------ resumen por habitacion

    @Test
    void elResumenAgrupaLasAbiertasPorHabitacionYMarcaSiAlguienBloquea() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        IncidenciaMantenimiento menor = new IncidenciaMantenimiento();
        menor.setHabitacion(h);
        menor.setTipoIncidencia(TipoIncidencia.TV_ELECTRONICA);
        menor.setDescripcion("control");
        menor.setBloqueaHabitacion(false);
        IncidenciaMantenimiento grave = new IncidenciaMantenimiento();
        grave.setHabitacion(h);
        grave.setTipoIncidencia(TipoIncidencia.PLOMERIA);
        grave.setDescripcion("fuga");
        grave.setBloqueaHabitacion(true);
        when(incidenciaRepository.findByEstadoInOrderByFechaReporteAsc(EstadoIncidencia.ABIERTAS))
                .thenReturn(List.of(menor, grave));

        List<Map<String, Object>> r = servicio().resumenPorHabitacion();

        assertEquals(1, r.size());
        assertEquals(2, r.get(0).get("cantidad"));
        assertEquals(true, r.get(0).get("bloquea"));
        assertEquals("304", r.get(0).get("numero"));
    }
}
