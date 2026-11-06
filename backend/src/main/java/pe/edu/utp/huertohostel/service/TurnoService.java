package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.TurnoRequest;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.Turno;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.repository.TurnoRepository;
import pe.edu.utp.huertohostel.security.Roles;

import java.time.Clock;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turnos laborales: horarios del personal, quien esta de turno ahora y el turno propio de cada empleado. La hora es
 * la de Lima y el turno de noche cruza la medianoche (22:00 a 06:00), por eso la comparacion no es un simple rango.
 */
@Service
@Transactional(readOnly = true)
public class TurnoService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    /** Roles operativos para los que se muestra la cobertura por turno. */
    private static final List<String> ROLES_OPERATIVOS = List.of(
            Roles.RECEPCIONISTA, Roles.CAJERO, Roles.COCINA, Roles.BAR, Roles.HOUSEKEEPING);

    private final TurnoRepository turnoRepository;
    private final EmpleadoRepository empleadoRepository;
    private final UsuarioActualService usuarioActualService;
    private final AuditoriaGestionService auditoria;
    private final Clock reloj;

    public TurnoService(TurnoRepository turnoRepository, EmpleadoRepository empleadoRepository,
                        UsuarioActualService usuarioActualService, AuditoriaGestionService auditoria, Clock reloj) {
        this.turnoRepository = turnoRepository;
        this.empleadoRepository = empleadoRepository;
        this.usuarioActualService = usuarioActualService;
        this.auditoria = auditoria;
        this.reloj = reloj;
    }

    /** true si {@code ahora} cae dentro del turno; el que cruza la medianoche (inicio > fin) abarca dos dias. */
    public static boolean dentro(Turno t, LocalTime ahora) {
        LocalTime inicio = t.getHoraInicio();
        LocalTime fin = t.getHoraFin();
        if (inicio == null || fin == null || inicio.equals(fin)) {
            return false;
        }
        return inicio.isBefore(fin)
                ? !ahora.isBefore(inicio) && ahora.isBefore(fin)
                : !ahora.isBefore(inicio) || ahora.isBefore(fin);
    }

    private LocalTime ahora() {
        return LocalTime.now(reloj);
    }

    // ---------- Consultas ----------

    /** Empleados activos de un turno. */
    private List<Empleado> activosDe(Turno turno, List<Empleado> todos) {
        return todos.stream()
                .filter(e -> Boolean.TRUE.equals(e.getEstado()) && e.getTurno() != null
                        && e.getTurno().getIdTurno().equals(turno.getIdTurno()))
                .sorted(Comparator.comparing(Empleado::getNombres))
                .toList();
    }

    private Map<String, Object> empleadoMapa(Empleado e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idEmpleado", e.getIdEmpleado());
        m.put("nombres", e.getNombres());
        m.put("apellidos", e.getApellidos());
        m.put("rol", e.getRol() != null ? e.getRol().getNombre() : null);
        m.put("area", e.getArea() != null ? e.getArea().getNombre() : null);
        return m;
    }

    private Map<String, Object> turnoMapa(Turno t, List<Empleado> todos, LocalTime ahora) {
        List<Empleado> activos = activosDe(t, todos);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idTurno", t.getIdTurno());
        m.put("nombre", t.getNombre());
        m.put("horaInicio", t.getHoraInicio().format(HORA));
        m.put("horaFin", t.getHoraFin().format(HORA));
        m.put("descripcion", t.getDescripcion());
        m.put("estado", Boolean.TRUE.equals(t.getEstado()));
        m.put("enCurso", Boolean.TRUE.equals(t.getEstado()) && dentro(t, ahora));
        m.put("cruzaMedianoche", t.getHoraInicio().isAfter(t.getHoraFin()));
        m.put("empleados", activos.stream().map(this::empleadoMapa).toList());
        Map<String, Long> porRol = new LinkedHashMap<>();
        for (String rol : ROLES_OPERATIVOS) {
            porRol.put(rol, activos.stream().filter(e -> e.getRol() != null && rol.equals(e.getRol().getNombre())).count());
        }
        m.put("porRol", porRol);
        return m;
    }

    /** Todos los turnos con su gente, cual esta en curso ahora y cuantos de cada rol hay en cada uno. */
    public Map<String, Object> resumen() {
        LocalTime ahora = ahora();
        List<Empleado> todos = empleadoRepository.findAll();
        List<Map<String, Object>> turnos = new ArrayList<>();
        for (Turno t : turnoRepository.findAll().stream().sorted(Comparator.comparing(Turno::getHoraInicio)).toList()) {
            turnos.add(turnoMapa(t, todos, ahora));
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("ahora", ahora.format(HORA));
        r.put("turnos", turnos);
        r.put("enServicio", enServicioDe(todos, ahora, null));
        return r;
    }

    /** Quien esta de turno ahora (empleados activos cuyo turno esta en curso), opcionalmente de un solo rol. */
    public List<Map<String, Object>> enServicio(String rol) {
        return enServicioDe(empleadoRepository.findAll(), ahora(), rol);
    }

    private List<Map<String, Object>> enServicioDe(List<Empleado> todos, LocalTime ahora, String rol) {
        return todos.stream()
                .filter(e -> Boolean.TRUE.equals(e.getEstado()) && e.getTurno() != null
                        && Boolean.TRUE.equals(e.getTurno().getEstado()) && dentro(e.getTurno(), ahora))
                .filter(e -> rol == null || (e.getRol() != null && rol.equalsIgnoreCase(e.getRol().getNombre())))
                .sorted(Comparator.comparing(Empleado::getNombres))
                .map(e -> {
                    Map<String, Object> m = empleadoMapa(e);
                    m.put("turno", e.getTurno().getNombre());
                    return m;
                })
                .toList();
    }

    /** Turno del empleado conectado y sus companeros; vacio si el usuario no es un empleado. */
    public Map<String, Object> miTurno() {
        Empleado yo = usuarioActualService.empleadoOpcional();
        Map<String, Object> r = new LinkedHashMap<>();
        if (yo == null || yo.getTurno() == null) {
            r.put("asignado", false);
            return r;
        }
        LocalTime ahora = ahora();
        List<Empleado> todos = empleadoRepository.findAll();
        Map<String, Object> turno = turnoMapa(yo.getTurno(), todos, ahora);
        r.put("asignado", true);
        r.put("turno", turno);
        r.put("yo", empleadoMapa(yo));
        r.put("ahora", ahora.format(HORA));
        return r;
    }

    /**
     * Resumen corto del turno de quien opera (para avisar en caja si esta fuera de su horario); null si no aplica.
     * El administrador no tiene horario que cumplir: siempre devuelve null.
     */
    public Map<String, Object> turnoParaAviso() {
        if (usuarioActualService.tieneRol(Roles.ADMINISTRADOR)) {
            return null;
        }
        Empleado yo = usuarioActualService.empleadoOpcional();
        if (yo == null || yo.getTurno() == null) {
            return null;
        }
        Turno t = yo.getTurno();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nombre", t.getNombre());
        m.put("horaInicio", t.getHoraInicio().format(HORA));
        m.put("horaFin", t.getHoraFin().format(HORA));
        m.put("enCurso", dentro(t, ahora()));
        return m;
    }

    /** true si hay al menos un empleado activo del rol en el turno que esta en curso (para el aviso de cobertura). */
    public boolean hayCobertura(String rol) {
        return !enServicio(rol).isEmpty();
    }

    // ---------- Edicion (administrador) ----------

    @Transactional
    public Map<String, Object> actualizar(@NonNull Integer id, TurnoRequest r) {
        Turno t = turnoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Turno no encontrado con id: " + id));
        if (r == null) {
            throw new IllegalStateException("Faltan los datos del turno.");
        }
        String nombre = r.nombre() == null ? "" : r.nombre().trim().replaceAll("\\s+", " ");
        if (nombre.isEmpty() || nombre.length() > 50) {
            throw new IllegalStateException("El nombre del turno es obligatorio (maximo 50 caracteres).");
        }
        boolean repetido = turnoRepository.findAll().stream()
                .anyMatch(o -> !o.getIdTurno().equals(id) && nombre.equalsIgnoreCase(o.getNombre()));
        if (repetido) {
            throw new IllegalStateException("Ya existe otro turno llamado " + nombre + ".");
        }
        LocalTime inicio = leerHora(r.horaInicio(), "de inicio");
        LocalTime fin = leerHora(r.horaFin(), "de fin");
        if (inicio.equals(fin)) {
            throw new IllegalStateException("La hora de inicio y la de fin no pueden ser iguales.");
        }
        String descripcion = r.descripcion() == null ? null : r.descripcion().trim();
        if (descripcion != null && descripcion.length() > 200) {
            throw new IllegalStateException("La descripcion no puede pasar de 200 caracteres.");
        }
        boolean activo = r.estado() == null || r.estado();
        List<Empleado> todos = empleadoRepository.findAll();
        if (!activo && Boolean.TRUE.equals(t.getEstado())) {
            if (!activosDe(t, todos).isEmpty()) {
                throw new IllegalStateException("El turno " + t.getNombre()
                        + " tiene empleados asignados: reasignalos antes de desactivarlo.");
            }
            long otrosActivos = turnoRepository.findAll().stream()
                    .filter(o -> !o.getIdTurno().equals(id) && Boolean.TRUE.equals(o.getEstado())).count();
            if (otrosActivos == 0) {
                throw new IllegalStateException("Debe quedar al menos un turno activo.");
            }
        }

        List<String> cambios = new ArrayList<>();
        if (!nombre.equals(t.getNombre())) {
            cambios.add("nombre " + t.getNombre() + " → " + nombre);
        }
        if (!inicio.equals(t.getHoraInicio()) || !fin.equals(t.getHoraFin())) {
            cambios.add("horario " + t.getHoraInicio().format(HORA) + "–" + t.getHoraFin().format(HORA)
                    + " → " + inicio.format(HORA) + "–" + fin.format(HORA));
        }
        if (activo != Boolean.TRUE.equals(t.getEstado())) {
            cambios.add(activo ? "activado" : "desactivado");
        }
        t.setNombre(nombre);
        t.setHoraInicio(inicio);
        t.setHoraFin(fin);
        t.setDescripcion(descripcion == null || descripcion.isEmpty() ? null : descripcion);
        t.setEstado(activo);
        Turno guardado = turnoRepository.save(t);
        auditoria.registrar("TURNO_EDITADO", null,
                "Turno " + guardado.getNombre() + (cambios.isEmpty() ? ": descripcion" : ": " + String.join("; ", cambios)));
        return turnoMapa(guardado, todos, ahora());
    }

    private LocalTime leerHora(String texto, String cual) {
        try {
            return LocalTime.parse(texto == null ? "" : texto.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalStateException("La hora " + cual + " no es valida (usa el formato HH:mm).");
        }
    }
}
