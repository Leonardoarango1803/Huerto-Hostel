package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoTareaLimpieza;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.OrigenTareaLimpieza;
import pe.edu.utp.huertohostel.entity.TareaLimpieza;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.TareaLimpiezaRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Limpieza y Habitaciones son dos pantallas sobre lo mismo: si una habitacion queda "en limpieza" tiene que haber una
 * tarea en la bandeja de housekeeping, sin importar desde donde se cambio el estado.
 */
@ExtendWith(MockitoExtension.class)
class LimpiezaServiceTest {

    @Mock TareaLimpiezaRepository tareaRepository;
    @Mock HabitacionRepository habitacionRepository;
    @Mock UsuarioActualService usuarioActualService;

    private final Empleado quien = new Empleado();

    @BeforeEach
    void apoyo() {
        lenient().when(tareaRepository.save(any())).thenAnswer(i -> {
            TareaLimpieza t = i.getArgument(0);
            if (t.getIdTarea() == null) t.setIdTarea(31);
            return t;
        });
        lenient().when(usuarioActualService.empleadoOpcional()).thenReturn(quien);
    }

    /** Sin incidencias abiertas: el mock del repositorio responde false. */
    private final BloqueoPorIncidencia bloqueo = new BloqueoPorIncidencia(
            org.mockito.Mockito.mock(pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository.class));

    private LimpiezaService servicio() {
        return new LimpiezaService(tareaRepository, habitacionRepository, usuarioActualService, bloqueo);
    }

    private Habitacion habitacion(int id, EstadoOperativoHab estado) {
        Habitacion h = new Habitacion();
        h.setIdHabitacion(id);
        h.setEstadoOperativo(estado);
        return h;
    }

    private TareaLimpieza tarea(Habitacion h, EstadoTareaLimpieza estado) {
        TareaLimpieza t = new TareaLimpieza();
        t.setIdTarea(9);
        t.setHabitacion(h);
        t.setEstado(estado);
        return t;
    }

    // ------------------------------------------------------------------ cambio de estado desde Habitaciones

    @Test
    void marcarPendienteDeLimpiezaCreaLaTareaEnLaBandejaDeHousekeeping() {
        Habitacion h = habitacion(210, EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        when(tareaRepository.findByHabitacionIdHabitacionOrderByFechaCreacionDesc(210)).thenReturn(List.of());

        servicio().sincronizarConEstado(h, EstadoOperativoHab.PENDIENTE_LIMPIEZA, "desde Habitaciones");

        ArgumentCaptor<TareaLimpieza> t = ArgumentCaptor.forClass(TareaLimpieza.class);
        verify(tareaRepository).save(t.capture());
        assertEquals(EstadoTareaLimpieza.PENDIENTE, t.getValue().getEstado());
        assertEquals(OrigenTareaLimpieza.PROGRAMADO, t.getValue().getOrigen());
    }

    @Test
    void iniciarLaLimpiezaDesdeHabitacionesPoneLaTareaEnProcesoYLaAsignaAQuienLaInicio() {
        Habitacion h = habitacion(210, EstadoOperativoHab.EN_LIMPIEZA);
        TareaLimpieza existente = tarea(h, EstadoTareaLimpieza.PENDIENTE);
        when(tareaRepository.findByHabitacionIdHabitacionOrderByFechaCreacionDesc(210)).thenReturn(List.of(existente));

        servicio().sincronizarConEstado(h, EstadoOperativoHab.EN_LIMPIEZA, "x");

        assertEquals(EstadoTareaLimpieza.EN_PROCESO, existente.getEstado());
        assertNotNull(existente.getFechaInicio());
        assertEquals(quien, existente.getEmpleadoAsignado());
    }

    @Test
    void aprobarLaLimpiezaDesdeHabitacionesCierraLasTareasAbiertasParaQueNoQuedenHuerfanas() {
        Habitacion h = habitacion(210, EstadoOperativoHab.DISPONIBLE);
        TareaLimpieza abierta = tarea(h, EstadoTareaLimpieza.EN_PROCESO);
        TareaLimpieza vieja = tarea(h, EstadoTareaLimpieza.COMPLETADA);
        when(tareaRepository.findByHabitacionIdHabitacionOrderByFechaCreacionDesc(210)).thenReturn(List.of(abierta, vieja));

        servicio().sincronizarConEstado(h, EstadoOperativoHab.DISPONIBLE, "x");

        assertEquals(EstadoTareaLimpieza.COMPLETADA, abierta.getEstado());
        assertNotNull(abierta.getFechaFin());
        verify(tareaRepository, org.mockito.Mockito.times(1)).save(any());
    }

    @Test
    void otrosEstadosNoTocanLasTareas() {
        servicio().sincronizarConEstado(habitacion(210, EstadoOperativoHab.MANTENIMIENTO), EstadoOperativoHab.MANTENIMIENTO, "x");
        verify(tareaRepository, never()).save(any());
    }

    // ------------------------------------------------------------------ reparar lo que ya quedo suelto

    @Test
    void alAbrirLimpiezaSeCreaLaTareaDeLasHabitacionesQueQuedaronEnLimpiezaSinTarea() {
        Habitacion sinTarea = habitacion(210, EstadoOperativoHab.PENDIENTE_LIMPIEZA); // el caso real de la 210
        Habitacion conTarea = habitacion(211, EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        when(habitacionRepository.findByEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA)).thenReturn(List.of(sinTarea, conTarea));
        when(habitacionRepository.findByEstadoOperativo(EstadoOperativoHab.EN_LIMPIEZA)).thenReturn(List.of());
        when(tareaRepository.existsByHabitacionIdHabitacionAndEstadoIn(eq210(), any())).thenReturn(false);
        when(tareaRepository.existsByHabitacionIdHabitacionAndEstadoIn(eq211(), any())).thenReturn(true);
        when(tareaRepository.findByHabitacionIdHabitacionOrderByFechaCreacionDesc(210)).thenReturn(List.of());
        when(tareaRepository.findByEstadoInOrderByFechaCreacionAsc(any())).thenReturn(List.of());

        servicio().listar(null);

        ArgumentCaptor<TareaLimpieza> t = ArgumentCaptor.forClass(TareaLimpieza.class);
        verify(tareaRepository, org.mockito.Mockito.times(1)).save(t.capture());
        assertEquals(210, t.getValue().getHabitacion().getIdHabitacion());
    }

    @Test
    void laHabitacionQueYaEstabanLimpiandoSinTareaAparecePeroSinAsignarleAQuienAbreLaPantalla() {
        Habitacion h = habitacion(210, EstadoOperativoHab.EN_LIMPIEZA);
        when(habitacionRepository.findByEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA)).thenReturn(List.of());
        when(habitacionRepository.findByEstadoOperativo(EstadoOperativoHab.EN_LIMPIEZA)).thenReturn(List.of(h));
        when(tareaRepository.existsByHabitacionIdHabitacionAndEstadoIn(eq210(), any())).thenReturn(false);
        when(tareaRepository.findByHabitacionIdHabitacionOrderByFechaCreacionDesc(210)).thenReturn(List.of());
        when(tareaRepository.findByEstadoInOrderByFechaCreacionAsc(any())).thenReturn(List.of());

        servicio().listar(null);

        ArgumentCaptor<TareaLimpieza> t = ArgumentCaptor.forClass(TareaLimpieza.class);
        verify(tareaRepository, org.mockito.Mockito.atLeastOnce()).save(t.capture());
        TareaLimpieza guardada = t.getValue();
        assertEquals(EstadoTareaLimpieza.EN_PROCESO, guardada.getEstado());
        assertNull(guardada.getEmpleadoAsignado());
    }

    @Test
    void filtrarPorUnEstadoNoRepara() {
        when(tareaRepository.findByEstadoOrderByFechaCreacionAsc(EstadoTareaLimpieza.COMPLETADA)).thenReturn(List.of());

        servicio().listar(EstadoTareaLimpieza.COMPLETADA);

        verify(habitacionRepository, never()).findByEstadoOperativo(any());
    }

    private static Integer eq210() {
        return org.mockito.ArgumentMatchers.eq(210);
    }

    private static Integer eq211() {
        return org.mockito.ArgumentMatchers.eq(211);
    }
}
