package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utp.huertohostel.dto.TurnoRequest;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Rol;
import pe.edu.utp.huertohostel.entity.Turno;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.repository.TurnoRepository;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Turnos: quien esta de turno ahora (incluido el de noche que cruza la medianoche) y la edicion del administrador. */
@ExtendWith(MockitoExtension.class)
class TurnoServiceTest {

    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    @Mock TurnoRepository turnoRepository;
    @Mock EmpleadoRepository empleadoRepository;
    @Mock UsuarioActualService usuarioActualService;
    @Mock AuditoriaGestionService auditoria;

    private final Turno manana = turno(1, "Manana", 6, 14, true);
    private final Turno tarde = turno(2, "Tarde", 14, 22, true);
    private final Turno noche = turno(3, "Noche", 22, 6, true);

    private TurnoService servicio(int hora, int minuto) {
        Clock reloj = Clock.fixed(Instant.parse("2026-11-05T00:00:00Z").plusSeconds(5 * 3600L + hora * 3600L + minuto * 60L), LIMA);
        // 00:00 UTC = 19:00 del dia anterior en Lima; sumando 5 h queda 00:00 Lima, luego se suma la hora pedida.
        return new TurnoService(turnoRepository, empleadoRepository, usuarioActualService, auditoria, reloj);
    }

    // ------------------------------------------------------------------ rangos de horario

    @Test
    void elHorarioNormalIncluyeElInicioYExcluyeElFin() {
        assertTrue(TurnoService.dentro(manana, LocalTime.of(6, 0)));
        assertTrue(TurnoService.dentro(manana, LocalTime.of(13, 59)));
        assertFalse(TurnoService.dentro(manana, LocalTime.of(14, 0)));
        assertFalse(TurnoService.dentro(manana, LocalTime.of(5, 59)));
    }

    @Test
    void elTurnoDeNocheCruzaLaMedianoche() {
        assertTrue(TurnoService.dentro(noche, LocalTime.of(22, 0)));
        assertTrue(TurnoService.dentro(noche, LocalTime.of(23, 59)));
        assertTrue(TurnoService.dentro(noche, LocalTime.of(0, 0)));
        assertTrue(TurnoService.dentro(noche, LocalTime.of(5, 59)));
        assertFalse(TurnoService.dentro(noche, LocalTime.of(6, 0)));
        assertFalse(TurnoService.dentro(noche, LocalTime.of(14, 0)));
    }

    @Test
    void unTurnoSinDuracionNuncaEstaEnCurso() {
        assertFalse(TurnoService.dentro(turno(9, "Raro", 8, 8, true), LocalTime.of(8, 0)));
    }

    // ------------------------------------------------------------------ quien esta de turno

    @Test
    void enServicioSoloTrae_alPersonalActivoDelTurnoEnCurso() {
        Empleado maria = empleado(2, "Maria", "RECEPCIONISTA", tarde, true);
        Empleado luis = empleado(3, "Luis", "BAR", tarde, true);
        Empleado ana = empleado(4, "Ana", "RECEPCIONISTA", manana, true);
        Empleado inactivo = empleado(5, "Juan", "BAR", tarde, false);
        when(empleadoRepository.findAll()).thenReturn(List.of(maria, luis, ana, inactivo));

        List<Map<String, Object>> a_las_16 = servicio(16, 0).enServicio(null);
        assertEquals(List.of("Luis", "Maria"), a_las_16.stream().map(m -> (String) m.get("nombres")).toList());

        List<Map<String, Object>> solo_bar = servicio(16, 0).enServicio("bar");
        assertEquals(1, solo_bar.size());
    }

    @Test
    void ungrupoDeNocheApareceDespuesDeMedianoche() {
        Empleado karla = empleado(4, "Karla", "HOUSEKEEPING", noche, true);
        when(empleadoRepository.findAll()).thenReturn(List.of(karla));

        assertEquals(1, servicio(2, 30).enServicio(null).size());
        assertEquals(0, servicio(9, 0).enServicio(null).size());
    }

    @Test
    void laCoberturaDeRecepcionDependeDeLaHora() {
        Empleado maria = empleado(2, "Maria", "RECEPCIONISTA", tarde, true);
        when(empleadoRepository.findAll()).thenReturn(List.of(maria));

        assertTrue(servicio(15, 0).hayCobertura("RECEPCIONISTA"));
        assertFalse(servicio(9, 0).hayCobertura("RECEPCIONISTA"));
    }

    @Test
    void elTurnoDeUnTurnoDesactivadoNoCuentaComoEnCurso() {
        Turno apagado = turno(7, "Apagado", 14, 22, false);
        Empleado luis = empleado(3, "Luis", "BAR", apagado, true);
        when(empleadoRepository.findAll()).thenReturn(List.of(luis));

        assertEquals(0, servicio(15, 0).enServicio(null).size());
    }

    // ------------------------------------------------------------------ mi turno

    @Test
    void miTurnoTraeMiHorarioYSiEstoyEnCurso() {
        Empleado maria = empleado(2, "Maria", "RECEPCIONISTA", tarde, true);
        when(usuarioActualService.empleadoOpcional()).thenReturn(maria);
        when(empleadoRepository.findAll()).thenReturn(List.of(maria));

        @SuppressWarnings("unchecked")
        Map<String, Object> enCurso = (Map<String, Object>) servicio(15, 0).miTurno().get("turno");
        assertEquals(true, enCurso.get("enCurso"));
        assertEquals("14:00", enCurso.get("horaInicio"));

        @SuppressWarnings("unchecked")
        Map<String, Object> fuera = (Map<String, Object>) servicio(9, 0).miTurno().get("turno");
        assertEquals(false, fuera.get("enCurso"));
    }

    @Test
    void quienNoEsEmpleadoNoTieneTurno() {
        when(usuarioActualService.empleadoOpcional()).thenReturn(null);
        assertEquals(false, servicio(9, 0).miTurno().get("asignado"));
    }

    @Test
    void elAvisoDeCajaNoApareceParaElAdministradorYMarcaFueraDeHorario() {
        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(true);
        assertNull(servicio(9, 0).turnoParaAviso());

        when(usuarioActualService.tieneRol("ADMINISTRADOR")).thenReturn(false);
        when(usuarioActualService.empleadoOpcional()).thenReturn(empleado(2, "Maria", "CAJERO", tarde, true));
        assertEquals(false, servicio(9, 0).turnoParaAviso().get("enCurso"));
        assertEquals(true, servicio(15, 0).turnoParaAviso().get("enCurso"));
    }

    // ------------------------------------------------------------------ edicion

    private void todosLosTurnos() {
        lenient().when(turnoRepository.findAll()).thenReturn(List.of(manana, tarde, noche));
        lenient().when(turnoRepository.findById(1)).thenReturn(Optional.of(manana));
        lenient().when(turnoRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(empleadoRepository.findAll()).thenReturn(List.of());
    }

    @Test
    void elAdministradorEditaHorarioYQuedaConstancia() {
        todosLosTurnos();

        Map<String, Object> r = servicio(9, 0).actualizar(1, new TurnoRequest("Manana", "05:30", "13:30", "Recepcion", true));

        assertEquals("05:30", r.get("horaInicio"));
        assertEquals(LocalTime.of(13, 30), manana.getHoraFin());
        verify(auditoria).registrar(any(), any(), any());
    }

    @Test
    void rechazaHorasInvalidasIgualesNombresRepetidosOVacios() {
        todosLosTurnos();
        TurnoService s = servicio(9, 0);
        assertThrows(IllegalStateException.class, () -> s.actualizar(1, new TurnoRequest("Manana", "25:00", "13:00", null, true)));
        assertThrows(IllegalStateException.class, () -> s.actualizar(1, new TurnoRequest("Manana", "08:00", "08:00", null, true)));
        assertThrows(IllegalStateException.class, () -> s.actualizar(1, new TurnoRequest("tarde", "06:00", "14:00", null, true)), "nombre repetido");
        assertThrows(IllegalStateException.class, () -> s.actualizar(1, new TurnoRequest("  ", "06:00", "14:00", null, true)));
        verify(turnoRepository, never()).save(any());
    }

    @Test
    void noSePuedeDesactivarUnTurnoConEmpleadosAsignadosNiElUltimoActivo() {
        todosLosTurnos();
        when(empleadoRepository.findAll()).thenReturn(List.of(empleado(2, "Maria", "RECEPCIONISTA", manana, true)));

        IllegalStateException conGente = assertThrows(IllegalStateException.class,
                () -> servicio(9, 0).actualizar(1, new TurnoRequest("Manana", "06:00", "14:00", null, false)));
        assertTrue(conGente.getMessage().contains("reasignalos"), conGente.getMessage());

        when(empleadoRepository.findAll()).thenReturn(List.of());
        tarde.setEstado(false);
        noche.setEstado(false);
        IllegalStateException ultimo = assertThrows(IllegalStateException.class,
                () -> servicio(9, 0).actualizar(1, new TurnoRequest("Manana", "06:00", "14:00", null, false)));
        assertTrue(ultimo.getMessage().contains("al menos un turno activo"), ultimo.getMessage());
    }

    // ------------------------------------------------------------------ apoyo

    private static Turno turno(int id, String nombre, int desde, int hasta, boolean activo) {
        Turno t = new Turno();
        t.setIdTurno(id);
        t.setNombre(nombre);
        t.setHoraInicio(LocalTime.of(desde, 0));
        t.setHoraFin(LocalTime.of(hasta, 0));
        t.setEstado(activo);
        return t;
    }

    private static Empleado empleado(int id, String nombres, String rol, Turno turno, boolean activo) {
        Empleado e = new Empleado();
        e.setIdEmpleado(id);
        e.setNombres(nombres);
        e.setApellidos("X");
        Rol r = new Rol();
        r.setNombre(rol);
        e.setRol(r);
        e.setTurno(turno);
        e.setEstado(activo);
        return e;
    }
}
