package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoTareaLimpieza;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.TareaLimpieza;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository;
import pe.edu.utp.huertohostel.repository.TareaLimpiezaRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Una habitacion con una incidencia abierta que la bloquea no vuelve al uso por una limpieza terminada, por un cambio de
 * estado a mano ni por una salida: sigue en MANTENIMIENTO hasta resolver la incidencia o liberar el bloqueo.
 */
@ExtendWith(MockitoExtension.class)
class BloqueoPorIncidenciaTest {

    @Mock IncidenciaMantenimientoRepository incidenciaRepository;
    @Mock TareaLimpiezaRepository tareaRepository;
    @Mock HabitacionRepository habitacionRepository;
    @Mock TipoHabitacionRepository tipoHabitacionRepository;
    @Mock UsuarioActualService usuarioActualService;
    @Mock LimpiezaService limpiezaService;

    private BloqueoPorIncidencia bloqueo() {
        return new BloqueoPorIncidencia(incidenciaRepository);
    }

    private Habitacion habitacion(EstadoOperativoHab estado) {
        Habitacion h = new Habitacion();
        h.setIdHabitacion(304);
        h.setEstadoOperativo(estado);
        return h;
    }

    private void hayIncidenciaQueBloquea(boolean si) {
        when(incidenciaRepository.existsByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoIn(304, EstadoIncidencia.ABIERTAS))
                .thenReturn(si);
    }

    @Test
    void sinIncidenciaQueBloqueeLaHabitacionVuelveAlEstadoNormal() {
        hayIncidenciaQueBloquea(false);
        assertFalse(bloqueo().hayBloqueo(304));
        assertEquals(EstadoOperativoHab.DISPONIBLE, bloqueo().estadoAlLiberar(habitacion(EstadoOperativoHab.EN_LIMPIEZA), EstadoOperativoHab.DISPONIBLE));
    }

    @Test
    void conUnaIncidenciaQueBloqueaSeQuedaEnMantenimiento() {
        hayIncidenciaQueBloquea(true);
        assertTrue(bloqueo().hayBloqueo(304));
        assertEquals(EstadoOperativoHab.MANTENIMIENTO, bloqueo().estadoAlLiberar(habitacion(EstadoOperativoHab.OCUPADA), EstadoOperativoHab.PENDIENTE_LIMPIEZA));
    }

    @Test
    void sinIdNoHayBloqueo() {
        assertFalse(bloqueo().hayBloqueo(null));
    }

    @Test
    void completarLaLimpiezaDeUnaHabitacionBloqueadaNoLaVendeSigueEnMantenimiento() {
        hayIncidenciaQueBloquea(true);
        Habitacion h = habitacion(EstadoOperativoHab.EN_LIMPIEZA);
        TareaLimpieza t = new TareaLimpieza();
        t.setIdTarea(9);
        t.setHabitacion(h);
        t.setEstado(EstadoTareaLimpieza.EN_PROCESO);
        when(tareaRepository.findById(9)).thenReturn(Optional.of(t));
        when(tareaRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(usuarioActualService.obtenerEmpleado()).thenReturn(new pe.edu.utp.huertohostel.entity.Empleado());

        new LimpiezaService(tareaRepository, habitacionRepository, usuarioActualService, bloqueo())
                .cambiarEstado(9, EstadoTareaLimpieza.COMPLETADA);

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, h.getEstadoOperativo());
    }

    @Test
    void aMano_noSePuedePonerDisponibleUnaHabitacionBloqueadaPorUnaIncidencia() {
        hayIncidenciaQueBloquea(true);
        when(habitacionRepository.findById(304)).thenReturn(Optional.of(habitacion(EstadoOperativoHab.MANTENIMIENTO)));
        HabitacionService servicio = new HabitacionService(habitacionRepository, tipoHabitacionRepository, limpiezaService, bloqueo());

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> servicio.cambiarEstado(304, EstadoOperativoHab.DISPONIBLE));

        assertTrue(e.getMessage().contains("incidencia abierta"), e.getMessage());
        verify(habitacionRepository, never()).save(any());
    }

    @Test
    void aMano_siSePuedeMandarALimpiezaOMantenimientoUnaHabitacionBloqueada() {
        // La consulta de bloqueo solo se hace al pasar a DISPONIBLE: otros cambios no la necesitan.
        when(habitacionRepository.findById(304)).thenReturn(Optional.of(habitacion(EstadoOperativoHab.DISPONIBLE)));
        when(habitacionRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        HabitacionService servicio = new HabitacionService(habitacionRepository, tipoHabitacionRepository, limpiezaService, bloqueo());

        assertEquals(EstadoOperativoHab.MANTENIMIENTO, servicio.cambiarEstado(304, EstadoOperativoHab.MANTENIMIENTO).getEstadoOperativo());
        verify(incidenciaRepository, never()).existsByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoIn(any(), anyList());
    }
}
