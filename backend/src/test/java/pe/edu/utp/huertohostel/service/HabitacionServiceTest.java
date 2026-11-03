package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** OCUPADA y RESERVADO los gobiernan la reserva y el check-in: a mano permitian saltarse la caja. */
@ExtendWith(MockitoExtension.class)
class HabitacionServiceTest {

    @Mock
    HabitacionRepository habitacionRepository;
    @Mock
    TipoHabitacionRepository tipoHabitacionRepository;

    private HabitacionService servicio() {
        return new HabitacionService(habitacionRepository, tipoHabitacionRepository);
    }

    @Test
    void noSePuedeMarcarUnaHabitacionOcupadaOReservadaAMano() {
        for (EstadoOperativoHab prohibido : new EstadoOperativoHab[]{EstadoOperativoHab.OCUPADA, EstadoOperativoHab.RESERVADO}) {
            assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(5, prohibido),
                    "no debe poder pasar a " + prohibido);
        }
        verifyNoInteractions(habitacionRepository);
    }

    @Test
    void siSePermitenLosEstadosDeMantenimientoYLimpieza() {
        for (EstadoOperativoHab permitido : new EstadoOperativoHab[]{
                EstadoOperativoHab.DISPONIBLE, EstadoOperativoHab.EN_LIMPIEZA,
                EstadoOperativoHab.PENDIENTE_LIMPIEZA, EstadoOperativoHab.MANTENIMIENTO}) {
            Habitacion habitacion = new Habitacion();
            habitacion.setIdHabitacion(5);
            habitacion.setEstadoOperativo(EstadoOperativoHab.OCUPADA);
            when(habitacionRepository.findById(5)).thenReturn(Optional.of(habitacion));
            when(habitacionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

            assertEquals(permitido, servicio().cambiarEstado(5, permitido).getEstadoOperativo());
        }
        verify(habitacionRepository, org.mockito.Mockito.times(4)).save(any());
    }

    @Test
    void unEstadoProhibidoNoGuardaNada() {
        assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(5, EstadoOperativoHab.OCUPADA));
        verify(habitacionRepository, never()).save(any());
    }
}
