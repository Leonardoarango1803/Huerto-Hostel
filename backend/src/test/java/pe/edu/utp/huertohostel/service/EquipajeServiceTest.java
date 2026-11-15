package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEquipaje;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.SolicitudEquipaje;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.SolicitudEquipajeRepository;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EquipajeServiceTest {

    @Mock SolicitudEquipajeRepository repository;
    @Mock EstadiaRepository estadiaRepository;
    @Mock UsuarioActualService usuarioActual;

    /** "Ahora" fijo en Lima: 15 nov 2026, 10:00. */
    private static final Clock RELOJ = Clock.fixed(Instant.parse("2026-11-15T15:00:00Z"), ZoneId.of("America/Lima"));
    private static final LocalDateTime AHORA = LocalDateTime.now(RELOJ);

    private EquipajeService servicio;
    private final Empleado recepcionista = new Empleado();

    @BeforeEach
    void preparar() {
        servicio = new EquipajeService(repository, estadiaRepository, usuarioActual, RELOJ);
        recepcionista.setNombres("Maria");
        recepcionista.setApellidos("Lopez");
        when(usuarioActual.obtenerEmpleado()).thenReturn(recepcionista);
        when(usuarioActual.empleadoOpcional()).thenReturn(recepcionista);
        when(repository.save(any())).thenAnswer(i -> {
            SolicitudEquipaje s = i.getArgument(0);
            if (s.getIdSolicitud() == null) s.setIdSolicitud(12);
            return s;
        });
    }

    private static Estadia estadia(EstadoEstadia estado, LocalDateTime salida) {
        Cliente c = new Cliente();
        c.setIdCliente(1);
        c.setNombres("Ana");
        c.setApellidos("Rojas");
        Reserva r = new Reserva();
        r.setCliente(c);
        Habitacion h = new Habitacion();
        h.setNumero("204");
        Estadia e = new Estadia();
        e.setIdEstadia(7);
        e.setReserva(r);
        e.setHabitacion(h);
        e.setEstadoEstadia(estado);
        e.setFechaCheckoutReal(salida);
        return e;
    }

    @Test
    void custodiaTrasElCheckoutQuedaGuardadaConCodigoYResponsable() {
        when(estadiaRepository.findById(7)).thenReturn(Optional.of(estadia(EstadoEstadia.FINALIZADA, AHORA.minusHours(1))));

        Map<String, Object> r = servicio.registrar(7, "custodia", 2, "Maleta azul y mochila");

        assertEquals("CUSTODIA", r.get("tipo"));
        assertEquals(EstadoEquipaje.EN_ATENCION, r.get("estado"), "en custodia desde que se recibe");
        assertEquals("2 bultos · Maleta azul y mochila", r.get("descripcion"));
        assertEquals("EQ-00012", r.get("codigo"));
        assertEquals("Maria Lopez", r.get("responsable"));
        assertEquals("204", r.get("habitacion"));
    }

    @Test
    void noSeRecibeCustodiaDeUnaEstadiaQueTerminoHaceDias() {
        when(estadiaRepository.findById(7)).thenReturn(Optional.of(estadia(EstadoEstadia.FINALIZADA, AHORA.minusDays(3))));
        assertThrows(IllegalStateException.class, () -> servicio.registrar(7, "CUSTODIA", 1, null));
        verify(repository, never()).save(any());
    }

    @Test
    void custodiaExigeCantidadDeBultos() {
        when(estadiaRepository.findById(7)).thenReturn(Optional.of(estadia(EstadoEstadia.EN_CURSO, null)));
        assertThrows(IllegalArgumentException.class, () -> servicio.registrar(7, "CUSTODIA", null, "x"));
        assertThrows(IllegalArgumentException.class, () -> servicio.registrar(7, "CUSTODIA", 50, "x"));
    }

    @Test
    void subidaOBajadaSoloConLaEstadiaEnCursoYSinDuplicar() {
        when(estadiaRepository.findById(7)).thenReturn(Optional.of(estadia(EstadoEstadia.FINALIZADA, AHORA.minusHours(1))));
        assertThrows(IllegalStateException.class, () -> servicio.registrar(7, "BAJADA", null, null));

        when(estadiaRepository.findById(7)).thenReturn(Optional.of(estadia(EstadoEstadia.EN_CURSO, null)));
        when(repository.existsByEstadiaIdEstadiaAndTipoSolicitudAndEstadoIn(eq(7), eq("BAJADA"), any())).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> servicio.registrar(7, "BAJADA", null, null));
        verify(repository, never()).save(any());
    }

    @Test
    void elHuespedPideBajarSusMaletasPeroNoCustodia() {
        Cliente yo = new Cliente();
        yo.setIdCliente(1);
        when(usuarioActual.obtenerCliente()).thenReturn(yo);
        when(estadiaRepository.findByClienteAndEstado(1, EstadoEstadia.EN_CURSO)).thenReturn(List.of(estadia(EstadoEstadia.EN_CURSO, null)));

        Map<String, Object> r = servicio.pedirDesdePortal("bajada", "Salgo a las 11");
        assertEquals("BAJADA", r.get("tipo"));
        assertEquals(EstadoEquipaje.PENDIENTE, r.get("estado"));

        assertThrows(IllegalArgumentException.class, () -> servicio.pedirDesdePortal("CUSTODIA", null));
    }

    @Test
    void sinEstadiaEnCursoElHuespedNoPuedePedir() {
        Cliente yo = new Cliente();
        yo.setIdCliente(1);
        when(usuarioActual.obtenerCliente()).thenReturn(yo);
        when(estadiaRepository.findByClienteAndEstado(1, EstadoEstadia.EN_CURSO)).thenReturn(List.of());
        assertThrows(IllegalStateException.class, () -> servicio.pedirDesdePortal("SUBIDA", null));
    }

    private SolicitudEquipaje guardada(String tipo, EstadoEquipaje estado) {
        SolicitudEquipaje s = new SolicitudEquipaje();
        s.setIdSolicitud(12);
        s.setTipoSolicitud(tipo);
        s.setEstado(estado);
        s.setEstadia(estadia(EstadoEstadia.EN_CURSO, null));
        when(repository.findById(12)).thenReturn(Optional.of(s));
        return s;
    }

    @Test
    void soloRecepcionEntregaLaCustodiaYQuedaQuienLaRecibio() {
        Empleado quienRecibio = new Empleado();
        quienRecibio.setNombres("Luis");
        SolicitudEquipaje s = guardada("CUSTODIA", EstadoEquipaje.EN_ATENCION);
        s.setEmpleadoAsignado(quienRecibio);

        when(usuarioActual.tieneRol(anyString())).thenReturn(false); // housekeeping
        assertThrows(AccessDeniedException.class, () -> servicio.cambiarEstado(12, EstadoEquipaje.ATENDIDA));

        when(usuarioActual.tieneRol("RECEPCIONISTA")).thenReturn(true);
        Map<String, Object> r = servicio.cambiarEstado(12, EstadoEquipaje.ATENDIDA);
        assertEquals(EstadoEquipaje.ATENDIDA, r.get("estado"));
        assertEquals(AHORA, r.get("fechaAtencion"));
        assertEquals("Luis", r.get("responsable"));
        assertThrows(IllegalStateException.class, () -> servicio.cambiarEstado(12, EstadoEquipaje.EN_ATENCION), "ya cerrada");
    }

    @Test
    void laCustodiaNoPasaPorEstadosDeAtencion() {
        guardada("CUSTODIA", EstadoEquipaje.EN_ATENCION);
        when(usuarioActual.tieneRol(anyString())).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> servicio.cambiarEstado(12, EstadoEquipaje.ASIGNADA));
    }

    @Test
    void unaBajadaAvanzaYNoRetrocede() {
        SolicitudEquipaje s = guardada("BAJADA", EstadoEquipaje.PENDIENTE);
        servicio.cambiarEstado(12, EstadoEquipaje.EN_ATENCION);
        assertEquals(recepcionista, s.getEmpleadoAsignado(), "quien la toma queda asignado");
        assertThrows(IllegalStateException.class, () -> servicio.cambiarEstado(12, EstadoEquipaje.PENDIENTE));
        servicio.cambiarEstado(12, EstadoEquipaje.ATENDIDA);
        assertEquals(EstadoEquipaje.ATENDIDA, s.getEstado());
    }
}
