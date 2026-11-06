package pe.edu.utp.huertohostel.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.edu.utp.huertohostel.dto.EmpleadoRequest;
import pe.edu.utp.huertohostel.entity.Area;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Rol;
import pe.edu.utp.huertohostel.entity.Turno;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.AreaRepository;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.repository.RolRepository;
import pe.edu.utp.huertohostel.repository.TurnoRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;

import java.time.LocalTime;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Empleados y cuentas: validaciones del alta, cuenta con clave temporal, baja que bloquea el ingreso, restablecimiento
 * con la contrasena del administrador y proteccion del ultimo administrador.
 */
@ExtendWith(MockitoExtension.class)
class EmpleadoAdminServiceTest {

    @Mock EmpleadoRepository empleadoRepository;
    @Mock RolRepository rolRepository;
    @Mock AreaRepository areaRepository;
    @Mock TurnoRepository turnoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock CuentaService cuentaService;
    @Mock AuditoriaGestionService auditoria;
    @Mock UsuarioActualService usuarioActualService;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4); // costo bajo: son pruebas

    private Rol rolAdmin, rolRecep, rolBar;
    private Area recepcion, bar;
    private Turno manana, tarde, apagado;

    @BeforeEach
    void datos() {
        rolAdmin = rol(1, "ADMINISTRADOR");
        rolRecep = rol(2, "RECEPCIONISTA");
        rolBar = rol(6, "BAR");
        recepcion = area(1, "RECEPCION");
        bar = area(3, "BAR");
        manana = turno(1, "Manana", true);
        tarde = turno(2, "Tarde", true);
        apagado = turno(9, "Viejo", false);
        lenient().when(rolRepository.findById(1)).thenReturn(Optional.of(rolAdmin));
        lenient().when(rolRepository.findById(2)).thenReturn(Optional.of(rolRecep));
        lenient().when(rolRepository.findById(6)).thenReturn(Optional.of(rolBar));
        lenient().when(areaRepository.findAll()).thenReturn(List.of(recepcion, bar));
        lenient().when(areaRepository.findById(1)).thenReturn(Optional.of(recepcion));
        lenient().when(areaRepository.findById(3)).thenReturn(Optional.of(bar));
        lenient().when(turnoRepository.findById(1)).thenReturn(Optional.of(manana));
        lenient().when(turnoRepository.findById(2)).thenReturn(Optional.of(tarde));
        lenient().when(turnoRepository.findById(9)).thenReturn(Optional.of(apagado));
        lenient().when(empleadoRepository.saveAndFlush(any())).thenAnswer(i -> {
            Empleado e = i.getArgument(0);
            if (e.getIdEmpleado() == null) e.setIdEmpleado(50);
            return e;
        });
        lenient().when(empleadoRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(usuarioRepository.saveAndFlush(any())).thenAnswer(i -> {
            Usuario u = i.getArgument(0);
            if (u.getIdUsuario() == null) u.setIdUsuario(60);
            return u;
        });
        lenient().when(usuarioRepository.findAll()).thenReturn(List.of());
        lenient().when(empleadoRepository.findAll()).thenReturn(List.of());
    }

    private EmpleadoAdminService servicio() {
        return new EmpleadoAdminService(empleadoRepository, rolRepository, areaRepository, turnoRepository,
                usuarioRepository, encoder, cuentaService, auditoria, usuarioActualService);
    }

    private EmpleadoRequest datosValidos(Integer idRol, Integer idArea, Boolean crearAcceso, String username) {
        return new EmpleadoRequest("Karla", "Flores Diaz", "DNI", "12345678", "karla@hostel.pe", "987654321",
                null, idRol, idArea, 2, crearAcceso, username);
    }

    // ------------------------------------------------------------------ alta y validaciones

    @Test
    void creaElEmpleadoYSuCuentaConClaveTemporalQueDebeCambiar() {
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.empty());
        when(usuarioRepository.existsByUsername(anyString())).thenReturn(false);

        Map<String, Object> r = servicio().crear(datosValidos(2, null, true, null));

        String clave = (String) r.get("passwordTemporal");
        assertNotNull(clave, "la clave temporal se muestra una sola vez");
        ArgumentCaptor<Usuario> guardado = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).saveAndFlush(guardado.capture());
        Usuario cuenta = guardado.getValue();
        assertEquals("kflores", cuenta.getUsername(), "usuario sugerido: inicial + primer apellido");
        assertTrue(cuenta.getDebeCambiarPassword(), "quien recibe la clave temporal debe elegir la suya");
        assertTrue(encoder.matches(clave, cuenta.getPasswordHash()));
        assertNull(cuenta.getCliente(), "el CHECK de la tabla exige empleado XOR cliente");
    }

    @Test
    void siElUsuarioSugeridoYaExisteAgregaUnNumero() {
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.empty());
        when(usuarioRepository.existsByUsername("kflores")).thenReturn(true);
        when(usuarioRepository.existsByUsername("kflores2")).thenReturn(false);

        Map<String, Object> r = servicio().crear(datosValidos(2, null, true, null));

        @SuppressWarnings("unchecked")
        Map<String, Object> acceso = (Map<String, Object>) ((Map<String, Object>) r.get("empleado")).get("acceso");
        assertEquals("kflores2", acceso.get("username"));
    }

    @Test
    void sinPedirAccesoNoSeCreaCuenta() {
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.empty());

        Map<String, Object> r = servicio().crear(datosValidos(2, null, false, null));

        assertFalse(r.containsKey("passwordTemporal"));
        verify(usuarioRepository, never()).saveAndFlush(any());
    }

    @Test
    void elAreaSeDeduceDelRolYUnaAreaIncompatibleSeRechaza() {
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.empty());

        servicio().crear(datosValidos(6, null, false, null)); // BAR -> area BAR sin pedirla

        ArgumentCaptor<Empleado> e = ArgumentCaptor.forClass(Empleado.class);
        verify(empleadoRepository).saveAndFlush(e.capture());
        assertEquals("BAR", e.getValue().getArea().getNombre());

        IllegalStateException x = assertThrows(IllegalStateException.class,
                () -> servicio().crear(datosValidos(6, 1, false, null))); // BAR en RECEPCION
        assertTrue(x.getMessage().contains("pertenece al area BAR"), x.getMessage());
    }

    @Test
    void rechazaDatosInvalidosConUnMotivoClaro() {
        EmpleadoAdminService s = servicio();
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("", "x", "DNI", "12345678", null, null, null, 2, null, 2, false, null)));
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "DNI", "123", null, null, null, 2, null, 2, false, null)));
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "PASAPORTE", "12345678", null, null, null, 2, null, 2, false, null)));
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "DNI", "12345678", "no-es-correo", null, null, 2, null, 2, false, null)));
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "DNI", "12345678", null, "abc", null, 2, null, 2, false, null)));
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "DNI", "12345678", null, null, null, null, null, 2, false, null)), "sin rol");
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "DNI", "12345678", null, null, null, 2, null, null, false, null)), "sin turno");
        assertThrows(IllegalStateException.class, () -> s.crear(new EmpleadoRequest("A", "B", "DNI", "12345678", null, null, null, 2, null, 9, false, null)), "turno desactivado");
        verify(empleadoRepository, never()).saveAndFlush(any());
    }

    @Test
    void noPermiteUnDocumentoNiUnCorreoRepetidos() {
        Empleado otro = empleado(7, "Luis", "Perez", rolBar, bar, tarde, true);
        otro.setCorreo("karla@hostel.pe");
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.of(otro));

        IllegalStateException doc = assertThrows(IllegalStateException.class,
                () -> servicio().crear(datosValidos(2, null, false, null)));
        assertTrue(doc.getMessage().contains("Luis Perez"), doc.getMessage());

        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.empty());
        when(empleadoRepository.findAll()).thenReturn(List.of(otro));
        IllegalStateException correo = assertThrows(IllegalStateException.class,
                () -> servicio().crear(datosValidos(2, null, false, null)));
        assertTrue(correo.getMessage().contains("correo"), correo.getMessage());
    }

    @Test
    void elCorreoYTelefonoVaciosSeGuardanComoNuloParaNoChocarConElUnico() {
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.empty());

        servicio().crear(new EmpleadoRequest("Ana", "Ruiz", "DNI", "12345678", "  ", "", null, 2, null, 2, false, null));

        ArgumentCaptor<Empleado> e = ArgumentCaptor.forClass(Empleado.class);
        verify(empleadoRepository).saveAndFlush(e.capture());
        assertNull(e.getValue().getCorreo());
        assertNull(e.getValue().getTelefono());
    }

    // ------------------------------------------------------------------ baja: bloquea el ingreso

    @Test
    void desactivarAlEmpleadoBloqueaTambienSuCuentaYLimpiaLaCache() {
        Empleado karla = empleado(4, "Karla", "Flores", rolBar, bar, tarde, true);
        Usuario cuenta = cuenta(11, "kflores", karla, true);
        when(empleadoRepository.findById(4)).thenReturn(Optional.of(karla));
        when(usuarioRepository.findByEmpleadoIdEmpleado(4)).thenReturn(Optional.of(cuenta));

        servicio().cambiarEstado(4, false);

        assertFalse(karla.getEstado());
        assertFalse(cuenta.getEstado(), "el login mira el estado de la cuenta: tiene que quedar bloqueada");
        verify(cuentaService).invalidarCache("kflores");
    }

    @Test
    void reactivarAlEmpleadoHabilitaSuCuenta() {
        Empleado karla = empleado(4, "Karla", "Flores", rolBar, bar, tarde, false);
        Usuario cuenta = cuenta(11, "kflores", karla, false);
        when(empleadoRepository.findById(4)).thenReturn(Optional.of(karla));
        when(usuarioRepository.findByEmpleadoIdEmpleado(4)).thenReturn(Optional.of(cuenta));

        servicio().cambiarEstado(4, true);

        assertTrue(cuenta.getEstado());
    }

    @Test
    void nadieSePuedeDesactivarASiMismo() {
        Empleado yo = empleado(1, "Admin", "Sistema", rolAdmin, recepcion, manana, true);
        when(empleadoRepository.findById(1)).thenReturn(Optional.of(yo));
        when(usuarioRepository.findByEmpleadoIdEmpleado(1)).thenReturn(Optional.empty());
        when(usuarioActualService.empleadoOpcional()).thenReturn(yo);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(1, false));
        assertTrue(e.getMessage().contains("a ti mismo"), e.getMessage());
    }

    @Test
    void noSePuedeDesactivarNiDegradarAlUnicoAdministradorActivo() {
        Empleado admin = empleado(1, "Admin", "Sistema", rolAdmin, recepcion, manana, true);
        Empleado otro = empleado(2, "Maria", "R", rolRecep, recepcion, tarde, true);
        Usuario cuentaAdmin = cuenta(1, "admin", admin, true);
        when(empleadoRepository.findById(1)).thenReturn(Optional.of(admin));
        when(empleadoRepository.findAll()).thenReturn(List.of(admin, otro));
        when(usuarioRepository.findAll()).thenReturn(List.of(cuentaAdmin));
        when(usuarioRepository.findByEmpleadoIdEmpleado(1)).thenReturn(Optional.of(cuentaAdmin));
        when(usuarioActualService.empleadoOpcional()).thenReturn(otro); // quien opera es otra persona

        IllegalStateException baja = assertThrows(IllegalStateException.class, () -> servicio().cambiarEstado(1, false));
        assertTrue(baja.getMessage().contains("unico administrador"), baja.getMessage());

        when(empleadoRepository.findByNumeroDocumento(anyString())).thenReturn(Optional.empty());
        EmpleadoRequest aRecepcion = new EmpleadoRequest("Admin", "Sistema", "DNI", "11111111", null, null, null, 2, null, 1, false, null);
        IllegalStateException rol = assertThrows(IllegalStateException.class, () -> servicio().actualizar(1, aRecepcion));
        assertTrue(rol.getMessage().contains("unico administrador"), rol.getMessage());
    }

    @Test
    void conOtroAdministradorActivoSiSePuedeDesactivarAUno() {
        Empleado a = empleado(1, "Admin", "Uno", rolAdmin, recepcion, manana, true);
        Empleado b = empleado(2, "Admin", "Dos", rolAdmin, recepcion, tarde, true);
        Usuario ca = cuenta(1, "admin1", a, true);
        Usuario cb = cuenta(2, "admin2", b, true);
        when(empleadoRepository.findById(1)).thenReturn(Optional.of(a));
        when(empleadoRepository.findAll()).thenReturn(List.of(a, b));
        when(usuarioRepository.findAll()).thenReturn(List.of(ca, cb));
        when(usuarioRepository.findByEmpleadoIdEmpleado(1)).thenReturn(Optional.of(ca));
        when(usuarioActualService.empleadoOpcional()).thenReturn(b);

        servicio().cambiarEstado(1, false);

        assertFalse(a.getEstado());
    }

    // ------------------------------------------------------------------ cuenta de ingreso

    @Test
    void daAccesoAUnEmpleadoSinCuentaPeroNoSiEstaInactivoOYaLaTiene() {
        Empleado miguel = empleado(3, "Miguel", "Hernandez", rolBar, bar, tarde, true);
        when(empleadoRepository.findById(3)).thenReturn(Optional.of(miguel));
        when(usuarioRepository.findByEmpleadoIdEmpleado(3)).thenReturn(Optional.empty());
        when(usuarioRepository.existsByUsername(anyString())).thenReturn(false);

        Map<String, Object> r = servicio().crearAcceso(3, null, null);
        assertEquals("mhernandez", r.get("username"));
        assertNotNull(r.get("passwordTemporal"));

        Empleado inactivo = empleado(5, "Juan", "Rojas", rolBar, bar, tarde, false);
        when(empleadoRepository.findById(5)).thenReturn(Optional.of(inactivo));
        assertThrows(IllegalStateException.class, () -> servicio().crearAcceso(5, null, null));

        when(usuarioRepository.findByEmpleadoIdEmpleado(3)).thenReturn(Optional.of(cuenta(9, "x", miguel, true)));
        assertThrows(IllegalStateException.class, () -> servicio().crearAcceso(3, null, null));
    }

    @Test
    void unaClaveIndicadaPorElAdministradorDebeCumplirLaPolitica() {
        Empleado miguel = empleado(3, "Miguel", "Hernandez", rolBar, bar, tarde, true);
        when(empleadoRepository.findById(3)).thenReturn(Optional.of(miguel));
        when(usuarioRepository.findByEmpleadoIdEmpleado(3)).thenReturn(Optional.empty());
        when(usuarioRepository.existsByUsername(anyString())).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> servicio().crearAcceso(3, "miguel", "corta1"));
        Map<String, Object> r = servicio().crearAcceso(3, "miguel", "Hostel2026");
        assertNull(r.get("passwordTemporal"), "si la escribio el administrador no se repite");
    }

    // ------------------------------------------------------------------ restablecer clave

    private Usuario adminActor() {
        Empleado admin = empleado(1, "Admin", "Sistema", rolAdmin, recepcion, manana, true);
        Usuario actor = cuenta(1, "admin", admin, true);
        actor.setPasswordHash(encoder.encode("ClaveAdmin1"));
        return actor;
    }

    @Test
    void restablecerExigeLaContrasenaDelAdministradorYDejaLaClaveComoTemporal() {
        Usuario actor = adminActor();
        Empleado karla = empleado(4, "Karla", "Flores", rolBar, bar, tarde, true);
        Usuario cuenta = cuenta(11, "kflores", karla, true);
        when(usuarioActualService.obtenerUsuario()).thenReturn(actor);
        when(empleadoRepository.findById(4)).thenReturn(Optional.of(karla));
        when(usuarioRepository.findByEmpleadoIdEmpleado(4)).thenReturn(Optional.of(cuenta));

        Map<String, Object> r = servicio().restablecerPassword(4, "ClaveAdmin1", null);

        String temporal = (String) r.get("passwordTemporal");
        assertTrue(encoder.matches(temporal, cuenta.getPasswordHash()));
        assertTrue(cuenta.getDebeCambiarPassword(), "debe elegir la suya al entrar");
        assertNotNull(cuenta.getPasswordActualizada(), "el sello nuevo cierra las sesiones abiertas");
        verify(cuentaService).invalidarCache("kflores");
        verify(auditoria).registrar(any(), any(), any());
    }

    @Test
    void conLaContrasenaDeAdminEquivocadaNoCambiaNadaYTrasCincoFallosSeBloquea() {
        Usuario actor = adminActor();
        Empleado karla = empleado(4, "Karla", "Flores", rolBar, bar, tarde, true);
        Usuario cuenta = cuenta(11, "kflores", karla, true);
        String hashOriginal = cuenta.getPasswordHash();
        when(usuarioActualService.obtenerUsuario()).thenReturn(actor);
        EmpleadoAdminService s = servicio();

        for (int i = 0; i < 5; i++) {
            IllegalStateException e = assertThrows(IllegalStateException.class, () -> s.restablecerPassword(4, "mala", null));
            assertTrue(e.getMessage().contains("no es correcta"), e.getMessage());
        }
        IllegalStateException bloqueo = assertThrows(IllegalStateException.class,
                () -> s.restablecerPassword(4, "ClaveAdmin1", null)); // aun la correcta se rechaza durante el bloqueo
        assertTrue(bloqueo.getMessage().contains("Demasiados intentos"), bloqueo.getMessage());
        assertEquals(hashOriginal, cuenta.getPasswordHash());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void unAdminNoPuedeRestablecerSuPropiaClaveNiLaDeQuienNoTieneCuenta() {
        Usuario actor = adminActor();
        Empleado yo = actor.getEmpleado();
        when(usuarioActualService.obtenerUsuario()).thenReturn(actor);
        when(empleadoRepository.findById(1)).thenReturn(Optional.of(yo));
        when(usuarioRepository.findByEmpleadoIdEmpleado(1)).thenReturn(Optional.of(actor));

        IllegalStateException propia = assertThrows(IllegalStateException.class,
                () -> servicio().restablecerPassword(1, "ClaveAdmin1", null));
        assertTrue(propia.getMessage().contains("Cambiar mi contrasena"), propia.getMessage());

        Empleado sinCuenta = empleado(3, "Miguel", "H", rolBar, bar, tarde, true);
        when(empleadoRepository.findById(3)).thenReturn(Optional.of(sinCuenta));
        when(usuarioRepository.findByEmpleadoIdEmpleado(3)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> servicio().restablecerPassword(3, "ClaveAdmin1", null));
    }

    // ------------------------------------------------------------------ edicion con cache

    @Test
    void cambiarElRolLimpiaLaCacheDeLaCuentaYDejaConstanciaDelCambio() {
        Empleado miguel = empleado(3, "Miguel", "Hernandez", rolBar, bar, tarde, true);
        miguel.setNumeroDocumento("12345678");
        Usuario cuenta = cuenta(9, "mhernandez", miguel, true);
        when(empleadoRepository.findById(3)).thenReturn(Optional.of(miguel));
        when(empleadoRepository.findByNumeroDocumento("12345678")).thenReturn(Optional.of(miguel));
        when(usuarioRepository.findByEmpleadoIdEmpleado(3)).thenReturn(Optional.of(cuenta));

        servicio().actualizar(3, new EmpleadoRequest("Miguel", "Hernandez", "DNI", "12345678", null, null, null, 2, null, 2, false, null));

        assertEquals("RECEPCIONISTA", miguel.getRol().getNombre());
        assertEquals("RECEPCION", miguel.getArea().getNombre(), "el area sigue al rol");
        verify(cuentaService).invalidarCache("mhernandez");
        ArgumentCaptor<String> detalle = ArgumentCaptor.forClass(String.class);
        verify(auditoria).registrar(any(), any(), detalle.capture());
        assertTrue(detalle.getValue().contains("rol BAR → RECEPCIONISTA"), detalle.getValue());
    }

    // ------------------------------------------------------------------ apoyo

    private Rol rol(int id, String nombre) {
        Rol r = new Rol();
        r.setIdRol(id);
        r.setNombre(nombre);
        return r;
    }

    private Area area(int id, String nombre) {
        Area a = new Area();
        a.setIdArea(id);
        a.setNombre(nombre);
        return a;
    }

    private Turno turno(int id, String nombre, boolean activo) {
        Turno t = new Turno();
        t.setIdTurno(id);
        t.setNombre(nombre);
        t.setHoraInicio(LocalTime.of(6, 0));
        t.setHoraFin(LocalTime.of(14, 0));
        t.setEstado(activo);
        return t;
    }

    private Empleado empleado(int id, String nombres, String apellidos, Rol rol, Area area, Turno turno, boolean activo) {
        Empleado e = new Empleado();
        e.setIdEmpleado(id);
        e.setNombres(nombres);
        e.setApellidos(apellidos);
        e.setRol(rol);
        e.setArea(area);
        e.setTurno(turno);
        e.setEstado(activo);
        return e;
    }

    private Usuario cuenta(int id, String username, Empleado e, boolean activa) {
        Usuario u = new Usuario();
        u.setIdUsuario(id);
        u.setUsername(username);
        u.setEmpleado(e);
        u.setEstado(activa);
        u.setPasswordHash("hash-viejo");
        u.setDebeCambiarPassword(false);
        return u;
    }
}
