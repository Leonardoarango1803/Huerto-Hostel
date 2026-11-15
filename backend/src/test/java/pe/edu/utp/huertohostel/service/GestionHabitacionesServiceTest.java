package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.dto.NuevaHabitacionRequest;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GestionHabitacionesServiceTest {

    @Mock HabitacionRepository habitacionRepository;
    @Mock TipoHabitacionRepository tipoRepository;
    @Mock ReservaRepository reservaRepository;
    @Mock AuditoriaGestionService auditoria;

    private GestionHabitacionesService servicio() {
        return new GestionHabitacionesService(habitacionRepository, tipoRepository, reservaRepository, auditoria);
    }

    private static Habitacion habitacion(EstadoOperativoHab estado) {
        TipoHabitacion tipo = new TipoHabitacion();
        tipo.setIdTipoHabitacion(1);
        tipo.setNombre("Simple");
        Habitacion h = new Habitacion();
        h.setIdHabitacion(5);
        h.setNumero("105");
        h.setPiso((short) 1);
        h.setTipoHabitacion(tipo);
        h.setEstadoOperativo(estado);
        h.setEstado(true);
        return h;
    }

    @Test
    void editarCambiaNumeroYTipoYDejaConstancia() {
        Habitacion h = habitacion(EstadoOperativoHab.DISPONIBLE);
        TipoHabitacion doble = new TipoHabitacion();
        doble.setIdTipoHabitacion(2);
        doble.setNombre("Doble");
        doble.setPrecioNoche(new BigDecimal("150"));
        when(habitacionRepository.findByIdParaActualizar(5)).thenReturn(Optional.of(h));
        when(habitacionRepository.existsByNumero("110")).thenReturn(false);
        when(tipoRepository.findById(2)).thenReturn(Optional.of(doble));
        when(habitacionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        NuevaHabitacionRequest req = new NuevaHabitacionRequest();
        req.setNumero(" 110 ");
        req.setIdTipoHabitacion(2);
        Habitacion editada = servicio().editar(5, req);

        assertEquals("110", editada.getNumero());
        assertEquals(doble, editada.getTipoHabitacion());
        verify(auditoria).registrar(eq("HABITACION_EDITADA"), any(), any());
    }

    @Test
    void elNumeroNoPuedeRepetirse() {
        when(habitacionRepository.findByIdParaActualizar(5)).thenReturn(Optional.of(habitacion(EstadoOperativoHab.DISPONIBLE)));
        when(habitacionRepository.existsByNumero("201")).thenReturn(true);
        NuevaHabitacionRequest req = new NuevaHabitacionRequest();
        req.setNumero("201");
        assertThrows(IllegalStateException.class, () -> servicio().editar(5, req));
        verify(habitacionRepository, never()).save(any());
    }

    @Test
    void noSeDaDeBajaConReservasVigentesNiConAlguienAdentro() {
        Habitacion libre = habitacion(EstadoOperativoHab.DISPONIBLE);
        when(habitacionRepository.findByIdParaActualizar(5)).thenReturn(Optional.of(libre));
        Reserva futura = new Reserva();
        futura.setIdReserva(88);
        futura.setFechaCheckinPrevisto(LocalDate.now().plusDays(10));
        when(reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(eq(5), any())).thenReturn(List.of(futura));
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> servicio().cambiarActiva(5, false));
        assertTrue(ex.getMessage().contains("RES-88"), ex.getMessage());

        Habitacion ocupada = habitacion(EstadoOperativoHab.OCUPADA);
        when(habitacionRepository.findByIdParaActualizar(5)).thenReturn(Optional.of(ocupada));
        assertThrows(IllegalStateException.class, () -> servicio().cambiarActiva(5, false));
        verify(habitacionRepository, never()).save(any());
    }

    @Test
    void darDeBajaYDeAltaUnaHabitacionLibre() {
        Habitacion h = habitacion(EstadoOperativoHab.MANTENIMIENTO);
        when(habitacionRepository.findByIdParaActualizar(5)).thenReturn(Optional.of(h));
        when(reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(eq(5), any())).thenReturn(List.of());
        when(habitacionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        assertFalse(servicio().cambiarActiva(5, false).getEstado());
        verify(auditoria).registrar(eq("HABITACION_BAJA"), any(), any());
        assertTrue(servicio().cambiarActiva(5, true).getEstado());
        verify(auditoria).registrar(eq("HABITACION_ALTA"), any(), any());
    }

    @Test
    void resumenDelHistorialCuentaVisitasNochesYFavoritos() {
        Map<String, Object> completada = new java.util.HashMap<>(Map.of(
                "estado", "COMPLETADA", "id_estadia", 3, "num_noches", 2,
                "monto_alojamiento_total", new BigDecimal("200"), "consumos", new BigDecimal("35"),
                "pagado", new BigDecimal("235"), "salida_forzada", false));
        completada.put("fecha_checkin_real", "2026-10-01T14:00");
        Map<String, Object> cancelada = Map.of("estado", "CANCELADA", "pagado", BigDecimal.ZERO);
        Map<String, Object> futura = new java.util.HashMap<>(Map.of("estado", "CONFIRMADA", "pagado", new BigDecimal("60"),
                "num_noches", 3, "monto_alojamiento_total", new BigDecimal("300")));
        futura.put("id_estadia", null);
        List<Map<String, Object>> consumos = List.of(
                Map.of("producto", "Café", "cantidad", 2), Map.of("producto", "Lomo", "cantidad", 1),
                Map.of("producto", "Café", "cantidad", 1));

        Map<String, Object> r = HistorialHuespedService.resumen(List.of(futura, completada, cancelada), consumos);

        assertEquals(3, r.get("reservas"));
        assertEquals(1, r.get("visitas"), "solo cuenta la que hizo check-in");
        assertEquals(2, r.get("noches"));
        assertEquals(1, r.get("canceladas"));
        assertEquals(new BigDecimal("295"), r.get("totalPagado"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> favoritos = (List<Map<String, Object>>) r.get("favoritos");
        assertEquals("Café", favoritos.get(0).get("producto"));
        assertEquals(3, favoritos.get(0).get("cantidad"));
    }
}
