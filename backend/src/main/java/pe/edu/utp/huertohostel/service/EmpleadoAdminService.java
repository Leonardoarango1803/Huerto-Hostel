package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.EmpleadoRequest;
import pe.edu.utp.huertohostel.entity.AuditoriaGestion;
import pe.edu.utp.huertohostel.entity.Area;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Rol;
import pe.edu.utp.huertohostel.entity.TipoUsuarioEnum;
import pe.edu.utp.huertohostel.entity.Turno;
import pe.edu.utp.huertohostel.entity.Usuario;
import pe.edu.utp.huertohostel.repository.AreaRepository;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.repository.RolRepository;
import pe.edu.utp.huertohostel.repository.TurnoRepository;
import pe.edu.utp.huertohostel.repository.UsuarioRepository;
import pe.edu.utp.huertohostel.security.PoliticaClaves;
import pe.edu.utp.huertohostel.security.Roles;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Empleados y sus cuentas de ingreso, juntos. El administrador crea al empleado con su acceso en un solo paso,
 * restablece contrasenas confirmando la suya, y todo lo sensible queda en la bitacora. Desactivar a un empleado
 * tambien bloquea su cuenta al instante, y nunca se puede dejar al sistema sin un administrador activo.
 */
@Service
@Transactional(readOnly = true)
public class EmpleadoAdminService {

    /** Area que corresponde a cada rol: evita combinaciones sin sentido (un bartender en cocina). */
    static final Map<String, String> AREA_DEL_ROL = Map.of(
            Roles.ADMINISTRADOR, "RECEPCION",
            Roles.RECEPCIONISTA, "RECEPCION",
            Roles.CAJERO, "RECEPCION",
            Roles.HOUSEKEEPING, "HOUSEKEEPING",
            Roles.COCINA, "COCINA",
            Roles.BAR, "BAR");

    private static final Pattern DNI = Pattern.compile("^\\d{8}$");
    private static final Pattern CE = Pattern.compile("^[A-Za-z0-9]{9,12}$");
    private static final Pattern CORREO = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern TELEFONO = Pattern.compile("^[0-9+\\s-]{7,20}$");
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9._-]{3,50}$");

    private static final int INTENTOS_MAXIMOS = 5;
    private static final long VENTANA_INTENTOS_MS = 10 * 60 * 1000L;

    private final EmpleadoRepository empleadoRepository;
    private final RolRepository rolRepository;
    private final AreaRepository areaRepository;
    private final TurnoRepository turnoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final CuentaService cuentaService;
    private final AuditoriaGestionService auditoria;
    private final UsuarioActualService usuarioActualService;
    private final ConcurrentHashMap<String, ArrayDeque<Long>> fallosDeConfirmacion = new ConcurrentHashMap<>();

    public EmpleadoAdminService(EmpleadoRepository empleadoRepository, RolRepository rolRepository,
                                AreaRepository areaRepository, TurnoRepository turnoRepository,
                                UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
                                CuentaService cuentaService, AuditoriaGestionService auditoria,
                                UsuarioActualService usuarioActualService) {
        this.empleadoRepository = empleadoRepository;
        this.rolRepository = rolRepository;
        this.areaRepository = areaRepository;
        this.turnoRepository = turnoRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.cuentaService = cuentaService;
        this.auditoria = auditoria;
        this.usuarioActualService = usuarioActualService;
    }

    // ---------- Consulta ----------

    /** Cada empleado con el estado de su cuenta: sin cuenta, activa o bloqueada. */
    public List<Map<String, Object>> listar() {
        Map<Integer, Usuario> cuentas = cuentasPorEmpleado();
        return empleadoRepository.findAll().stream()
                .sorted(Comparator.comparing(Empleado::getIdEmpleado))
                .map(e -> aMapa(e, cuentas.get(e.getIdEmpleado())))
                .toList();
    }

    public List<AuditoriaGestion> historial() {
        return auditoria.ultimos();
    }

    private Map<Integer, Usuario> cuentasPorEmpleado() {
        return usuarioRepository.findAll().stream()
                .filter(u -> u.getEmpleado() != null)
                .collect(Collectors.toMap(u -> u.getEmpleado().getIdEmpleado(), Function.identity(), (a, b) -> a));
    }

    private Map<String, Object> aMapa(Empleado e, Usuario cuenta) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idEmpleado", e.getIdEmpleado());
        m.put("nombres", e.getNombres());
        m.put("apellidos", e.getApellidos());
        m.put("tipoDocumento", e.getTipoDocumento());
        m.put("numeroDocumento", e.getNumeroDocumento());
        m.put("correo", e.getCorreo());
        m.put("telefono", e.getTelefono());
        m.put("estado", e.getEstado());
        m.put("fechaIngreso", e.getFechaIngreso());
        m.put("rol", e.getRol() == null ? null : Map.of("idRol", e.getRol().getIdRol(), "nombre", e.getRol().getNombre()));
        m.put("area", e.getArea() == null ? null : Map.of("idArea", e.getArea().getIdArea(), "nombre", e.getArea().getNombre()));
        m.put("turno", e.getTurno() == null ? null : Map.of("idTurno", e.getTurno().getIdTurno(), "nombre", e.getTurno().getNombre()));
        Map<String, Object> acceso = new LinkedHashMap<>();
        acceso.put("tieneCuenta", cuenta != null);
        acceso.put("username", cuenta != null ? cuenta.getUsername() : null);
        acceso.put("activa", cuenta != null && Boolean.TRUE.equals(cuenta.getEstado()));
        acceso.put("debeCambiarPassword", cuenta != null && Boolean.TRUE.equals(cuenta.getDebeCambiarPassword()));
        acceso.put("ultimoAcceso", cuenta != null ? cuenta.getUltimoAcceso() : null);
        m.put("acceso", acceso);
        return m;
    }

    // ---------- Alta y edicion ----------

    @Transactional
    public Map<String, Object> crear(EmpleadoRequest r) {
        Datos d = validar(r, null);
        Empleado e = new Empleado();
        aplicar(e, d);
        e.setEstado(true);
        Empleado guardado = empleadoRepository.saveAndFlush(e);
        auditoria.registrar("EMPLEADO_CREADO", guardado,
                "Rol " + d.rol.getNombre() + ", turno " + d.turno.getNombre());

        Map<String, Object> resultado = new LinkedHashMap<>();
        Usuario cuenta = null;
        if (Boolean.TRUE.equals(r.crearAcceso())) {
            CuentaNueva nueva = crearCuenta(guardado, r.username(), null);
            cuenta = nueva.usuario;
            resultado.put("passwordTemporal", nueva.claveGenerada);
        }
        resultado.put("empleado", aMapa(guardado, cuenta));
        return resultado;
    }

    @Transactional
    public Map<String, Object> actualizar(@NonNull Integer id, EmpleadoRequest r) {
        Empleado e = cargar(id);
        Datos d = validar(r, id);
        Usuario cuenta = usuarioRepository.findByEmpleadoIdEmpleado(id).orElse(null);

        boolean cambiaRol = e.getRol() == null || !e.getRol().getIdRol().equals(d.rol.getIdRol());
        if (cambiaRol && esAdmin(e)) {
            if (esElMismo(e)) {
                throw new IllegalStateException("No puedes quitarte a ti mismo el rol de administrador.");
            }
            if (adminsActivosSin(id) == 0) {
                throw new IllegalStateException("No puedes quitar el rol al unico administrador activo.");
            }
        }

        List<String> cambios = new ArrayList<>();
        if (cambiaRol) {
            cambios.add("rol " + (e.getRol() != null ? e.getRol().getNombre() : "—") + " → " + d.rol.getNombre());
        }
        if (e.getTurno() == null || !e.getTurno().getIdTurno().equals(d.turno.getIdTurno())) {
            cambios.add("turno " + (e.getTurno() != null ? e.getTurno().getNombre() : "—") + " → " + d.turno.getNombre());
        }
        if (!d.numeroDocumento.equals(e.getNumeroDocumento())) {
            cambios.add("documento " + e.getNumeroDocumento() + " → " + d.numeroDocumento);
        }

        aplicar(e, d);
        Empleado guardado = empleadoRepository.saveAndFlush(e);
        if (cuenta != null) {
            cuentaService.invalidarCache(cuenta.getUsername()); // el rol viaja en la cuenta cacheada
        }
        auditoria.registrar("EMPLEADO_EDITADO", guardado, cambios.isEmpty() ? "Datos de contacto" : String.join("; ", cambios));
        return aMapa(guardado, cuenta);
    }

    @Transactional
    public Map<String, Object> cambiarEstado(@NonNull Integer id, boolean activo) {
        Empleado e = cargar(id);
        Usuario cuenta = usuarioRepository.findByEmpleadoIdEmpleado(id).orElse(null);
        if (!activo) {
            if (esElMismo(e)) {
                throw new IllegalStateException("No puedes desactivarte a ti mismo.");
            }
            if (esAdmin(e) && Boolean.TRUE.equals(e.getEstado()) && adminsActivosSin(id) == 0) {
                throw new IllegalStateException("No puedes desactivar al unico administrador activo.");
            }
        }
        e.setEstado(activo);
        Empleado guardado = empleadoRepository.save(e);
        if (cuenta != null) {
            cuenta.setEstado(activo); // el login mira el estado de la cuenta: sin esto el empleado de baja seguia entrando
            usuarioRepository.save(cuenta);
            cuentaService.invalidarCache(cuenta.getUsername());
        }
        auditoria.registrar(activo ? "EMPLEADO_ACTIVADO" : "EMPLEADO_DESACTIVADO", guardado,
                cuenta != null ? "Cuenta " + cuenta.getUsername() + (activo ? " habilitada" : " bloqueada") : "Sin cuenta de ingreso");
        return aMapa(guardado, cuenta);
    }

    @Transactional
    public Map<String, Object> asignarTurno(@NonNull Integer id, Integer idTurno) {
        Empleado e = cargar(id);
        if (idTurno == null) {
            throw new IllegalStateException("Elige el turno al que se asigna.");
        }
        Turno turno = turnoRepository.findById(idTurno)
                .orElseThrow(() -> new EntityNotFoundException("Turno no encontrado con id: " + idTurno));
        if (!Boolean.TRUE.equals(turno.getEstado())) {
            throw new IllegalStateException("El turno " + turno.getNombre() + " esta desactivado.");
        }
        String antes = e.getTurno() != null ? e.getTurno().getNombre() : "—";
        e.setTurno(turno);
        Empleado guardado = empleadoRepository.save(e);
        auditoria.registrar("TURNO_ASIGNADO", guardado, antes + " → " + turno.getNombre());
        return aMapa(guardado, usuarioRepository.findByEmpleadoIdEmpleado(id).orElse(null));
    }

    // ---------- Cuentas de ingreso ----------

    /** Crea la cuenta de un empleado que aun no la tiene. Si no se da clave, se genera una temporal (se muestra una vez). */
    @Transactional
    public Map<String, Object> crearAcceso(@NonNull Integer idEmpleado, String username, String password) {
        Empleado e = cargar(idEmpleado);
        if (!Boolean.TRUE.equals(e.getEstado())) {
            throw new IllegalStateException("El empleado esta inactivo: activalo antes de darle acceso.");
        }
        if (usuarioRepository.findByEmpleadoIdEmpleado(idEmpleado).isPresent()) {
            throw new IllegalStateException("Este empleado ya tiene una cuenta de ingreso.");
        }
        CuentaNueva nueva = crearCuenta(e, username, password);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("username", nueva.usuario.getUsername());
        r.put("passwordTemporal", nueva.claveGenerada);
        r.put("empleado", aMapa(e, nueva.usuario));
        return r;
    }

    private record CuentaNueva(Usuario usuario, String claveGenerada) {
    }

    private CuentaNueva crearCuenta(Empleado e, String usernameSolicitado, String passwordSolicitada) {
        if (e.getRol() == null) {
            throw new IllegalStateException("El empleado no tiene rol: asignaselo antes de darle acceso.");
        }
        String user = usernameSolicitado == null || usernameSolicitado.isBlank()
                ? sugerirUsername(e) : usernameSolicitado.trim().toLowerCase(Locale.ROOT);
        if (!USERNAME.matcher(user).matches()) {
            throw new IllegalStateException("El usuario debe tener entre 3 y 50 caracteres: letras minusculas, numeros, punto, guion o guion bajo.");
        }
        if (usuarioRepository.existsByUsername(user)) {
            throw new IllegalStateException("El usuario '" + user + "' ya esta en uso.");
        }
        boolean generada = passwordSolicitada == null || passwordSolicitada.isBlank();
        String plano = generada ? PoliticaClaves.generar() : passwordSolicitada;
        if (!generada) {
            PoliticaClaves.validar(plano, user);
        }
        Usuario u = new Usuario();
        u.setEmpleado(e);
        u.setCliente(null); // lo exige el CHECK chk_usuario_tipo
        u.setUsername(user);
        u.setPasswordHash(passwordEncoder.encode(plano));
        u.setTipoUsuario(TipoUsuarioEnum.EMPLEADO);
        u.setEstado(true);
        u.setFechaCreacion(LocalDateTime.now());
        u.setDebeCambiarPassword(true); // la clave la conoce quien la entrego: debe elegir la suya al entrar
        Usuario guardado = usuarioRepository.saveAndFlush(u);
        auditoria.registrar("ACCESO_CREADO", e, "Usuario " + user + (generada ? " con clave temporal" : " con clave indicada"));
        return new CuentaNueva(guardado, generada ? plano : null);
    }

    /** Propone algo como "kflores" a partir del nombre; si existe agrega un numero. */
    String sugerirUsername(Empleado e) {
        String nombre = soloLetras(e.getNombres());
        String apellido = soloLetras(e.getApellidos());
        String inicial = nombre.isEmpty() ? "u" : nombre.substring(0, 1);
        String primerApellido = apellido.split(" ")[0];
        String base = (inicial + (primerApellido.isEmpty() ? "usuario" : primerApellido));
        base = base.length() > 40 ? base.substring(0, 40) : base;
        String candidato = base;
        int n = 2;
        while (usuarioRepository.existsByUsername(candidato)) {
            candidato = base + n++;
        }
        return candidato;
    }

    private static String soloLetras(String texto) {
        if (texto == null) {
            return "";
        }
        String sinTildes = Normalizer.normalize(texto.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return sinTildes.replaceAll("[^a-z ]", "").trim();
    }

    /**
     * Restablece la clave de otro usuario. Exige la contrasena del propio administrador (reautenticacion) y limita
     * los intentos fallidos. La nueva clave queda como temporal: la persona debe cambiarla al entrar, y sus
     * sesiones abiertas dejan de valer.
     */
    @Transactional
    public Map<String, Object> restablecerPassword(@NonNull Integer idEmpleado, String passwordAdmin, String passwordNueva) {
        Usuario actor = usuarioActualService.obtenerUsuario();
        exigirSinBloqueo(actor.getUsername());
        if (passwordAdmin == null || !passwordEncoder.matches(passwordAdmin, actor.getPasswordHash())) {
            registrarFallo(actor.getUsername());
            throw new IllegalStateException("Tu contrasena de administrador no es correcta.");
        }
        fallosDeConfirmacion.remove(actor.getUsername());

        Empleado e = cargar(idEmpleado);
        Usuario cuenta = usuarioRepository.findByEmpleadoIdEmpleado(idEmpleado)
                .orElseThrow(() -> new IllegalStateException("Este empleado no tiene cuenta de ingreso: crea su acceso primero."));
        if (cuenta.getIdUsuario().equals(actor.getIdUsuario())) {
            throw new IllegalStateException("Para cambiar tu propia contrasena usa \"Cambiar mi contrasena\".");
        }
        boolean generada = passwordNueva == null || passwordNueva.isBlank();
        String plano = generada ? PoliticaClaves.generar() : passwordNueva;
        if (!generada) {
            PoliticaClaves.validar(plano, cuenta.getUsername());
        }
        cuenta.setPasswordHash(passwordEncoder.encode(plano));
        cuenta.setDebeCambiarPassword(true);
        cuenta.setPasswordActualizada(LocalDateTime.now());
        usuarioRepository.save(cuenta);
        cuentaService.invalidarCache(cuenta.getUsername());
        auditoria.registrar("PASSWORD_RESTABLECIDA", e, "Cuenta " + cuenta.getUsername() + ": clave temporal, sesiones cerradas");

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("username", cuenta.getUsername());
        r.put("passwordTemporal", generada ? plano : null);
        r.put("empleado", aMapa(e, cuenta));
        return r;
    }

    private void exigirSinBloqueo(String actor) {
        ArrayDeque<Long> fallos = fallosDeConfirmacion.get(actor);
        if (fallos == null) {
            return;
        }
        synchronized (fallos) {
            long limite = System.currentTimeMillis() - VENTANA_INTENTOS_MS;
            while (!fallos.isEmpty() && fallos.peekFirst() < limite) {
                fallos.pollFirst();
            }
            if (fallos.size() >= INTENTOS_MAXIMOS) {
                throw new IllegalStateException("Demasiados intentos con la contrasena equivocada. Espera unos minutos.");
            }
        }
    }

    private void registrarFallo(String actor) {
        ArrayDeque<Long> fallos = fallosDeConfirmacion.computeIfAbsent(actor, k -> new ArrayDeque<>());
        synchronized (fallos) {
            fallos.addLast(System.currentTimeMillis());
        }
    }

    // ---------- Validaciones ----------

    private record Datos(String nombres, String apellidos, String tipoDocumento, String numeroDocumento, String correo,
                         String telefono, LocalDate fechaIngreso, Rol rol, Area area, Turno turno) {
    }

    private Datos validar(EmpleadoRequest r, Integer idExistente) {
        if (r == null) {
            throw new IllegalStateException("Faltan los datos del empleado.");
        }
        String nombres = limpiar(r.nombres());
        String apellidos = limpiar(r.apellidos());
        if (nombres.isEmpty() || apellidos.isEmpty()) {
            throw new IllegalStateException("Los nombres y apellidos son obligatorios.");
        }
        if (nombres.length() > 100 || apellidos.length() > 100) {
            throw new IllegalStateException("Los nombres y apellidos no pueden pasar de 100 caracteres.");
        }
        String tipo = limpiar(r.tipoDocumento()).toUpperCase(Locale.ROOT);
        String doc = limpiar(r.numeroDocumento());
        if (tipo.equals("DNI")) {
            if (!DNI.matcher(doc).matches()) {
                throw new IllegalStateException("El DNI debe tener 8 digitos.");
            }
        } else if (tipo.equals("CE")) {
            if (!CE.matcher(doc).matches()) {
                throw new IllegalStateException("El carne de extranjeria debe tener entre 9 y 12 letras o numeros.");
            }
        } else {
            throw new IllegalStateException("El tipo de documento debe ser DNI o CE.");
        }
        Optional<Empleado> repetido = empleadoRepository.findByNumeroDocumento(doc)
                .filter(o -> !o.getIdEmpleado().equals(idExistente));
        if (repetido.isPresent()) {
            throw new IllegalStateException("Ya existe un empleado con ese documento: "
                    + repetido.get().getNombres() + " " + repetido.get().getApellidos() + ".");
        }
        String correo = limpiar(r.correo());
        if (!correo.isEmpty()) {
            if (!CORREO.matcher(correo).matches() || correo.length() > 100) {
                throw new IllegalStateException("El correo no es valido.");
            }
            boolean usado = empleadoRepository.findAll().stream()
                    .anyMatch(o -> correo.equalsIgnoreCase(o.getCorreo()) && !o.getIdEmpleado().equals(idExistente));
            if (usado) {
                throw new IllegalStateException("Ese correo ya pertenece a otro empleado.");
            }
        }
        String telefono = limpiar(r.telefono());
        if (!telefono.isEmpty() && !TELEFONO.matcher(telefono).matches()) {
            throw new IllegalStateException("El telefono solo puede llevar numeros, espacios, + y guiones (7 a 20 caracteres).");
        }
        if (r.fechaIngreso() != null && r.fechaIngreso().isAfter(LocalDate.now().plusDays(1))) {
            throw new IllegalStateException("La fecha de ingreso no puede estar en el futuro.");
        }

        if (r.idRol() == null) {
            throw new IllegalStateException("Elige el rol del empleado: define lo que podra hacer en el sistema.");
        }
        Rol rol = rolRepository.findById(r.idRol())
                .orElseThrow(() -> new EntityNotFoundException("Rol no encontrado con id: " + r.idRol()));
        String areaEsperada = AREA_DEL_ROL.get(rol.getNombre());
        Area area;
        if (r.idArea() == null) {
            if (areaEsperada == null) {
                throw new IllegalStateException("Elige el area del empleado.");
            }
            area = areaRepository.findAll().stream().filter(a -> areaEsperada.equals(a.getNombre())).findFirst()
                    .orElseThrow(() -> new IllegalStateException("No existe el area " + areaEsperada + "."));
        } else {
            area = areaRepository.findById(r.idArea())
                    .orElseThrow(() -> new EntityNotFoundException("Area no encontrada con id: " + r.idArea()));
            if (areaEsperada != null && !areaEsperada.equals(area.getNombre())) {
                throw new IllegalStateException("El rol " + rol.getNombre() + " pertenece al area " + areaEsperada
                        + ", no a " + area.getNombre() + ".");
            }
        }
        if (r.idTurno() == null) {
            throw new IllegalStateException("Elige el turno del empleado.");
        }
        Turno turno = turnoRepository.findById(r.idTurno())
                .orElseThrow(() -> new EntityNotFoundException("Turno no encontrado con id: " + r.idTurno()));
        boolean mismoTurno = idExistente != null && empleadoRepository.findById(idExistente)
                .map(o -> o.getTurno() != null && o.getTurno().getIdTurno().equals(turno.getIdTurno())).orElse(false);
        if (!Boolean.TRUE.equals(turno.getEstado()) && !mismoTurno) {
            throw new IllegalStateException("El turno " + turno.getNombre() + " esta desactivado.");
        }
        return new Datos(nombres, apellidos, tipo, doc, correo.isEmpty() ? null : correo.toLowerCase(Locale.ROOT),
                telefono.isEmpty() ? null : telefono, r.fechaIngreso(), rol, area, turno);
    }

    private static String limpiar(String s) {
        return s == null ? "" : s.trim().replaceAll("\\s+", " ");
    }

    private void aplicar(Empleado e, Datos d) {
        e.setNombres(d.nombres);
        e.setApellidos(d.apellidos);
        e.setTipoDocumento(d.tipoDocumento);
        e.setNumeroDocumento(d.numeroDocumento);
        e.setCorreo(d.correo);
        e.setTelefono(d.telefono);
        if (d.fechaIngreso != null || e.getFechaIngreso() == null) {
            e.setFechaIngreso(d.fechaIngreso != null ? d.fechaIngreso : LocalDate.now());
        }
        e.setRol(d.rol);
        e.setArea(d.area);
        e.setTurno(d.turno);
    }

    // ---------- Proteccion del ultimo administrador ----------

    private Empleado cargar(Integer id) {
        return empleadoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Empleado no encontrado con id: " + id));
    }

    private boolean esAdmin(Empleado e) {
        return e.getRol() != null && Roles.ADMINISTRADOR.equals(e.getRol().getNombre());
    }

    private boolean esElMismo(Empleado e) {
        Empleado yo = usuarioActualService.empleadoOpcional();
        return yo != null && yo.getIdEmpleado().equals(e.getIdEmpleado());
    }

    /** Administradores activos con cuenta activa, sin contar a {@code excluirId}. */
    private long adminsActivosSin(Integer excluirId) {
        Map<Integer, Usuario> cuentas = cuentasPorEmpleado();
        return empleadoRepository.findAll().stream()
                .filter(o -> !o.getIdEmpleado().equals(excluirId))
                .filter(this::esAdmin)
                .filter(o -> Boolean.TRUE.equals(o.getEstado()))
                .filter(o -> {
                    Usuario c = cuentas.get(o.getIdEmpleado());
                    return c != null && Boolean.TRUE.equals(c.getEstado());
                })
                .count();
    }
}
