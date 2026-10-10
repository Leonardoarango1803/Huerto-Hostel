package pe.edu.utp.huertohostel.controller;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.repository.AreaRepository;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.repository.RolRepository;
import pe.edu.utp.huertohostel.repository.TurnoRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/empleados")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class EmpleadoController {

    private final EmpleadoRepository empleadoRepository;
    private final RolRepository rolRepository;
    private final AreaRepository areaRepository;
    private final TurnoRepository turnoRepository;

    public EmpleadoController(EmpleadoRepository empleadoRepository,
                               RolRepository rolRepository,
                               AreaRepository areaRepository,
                               TurnoRepository turnoRepository) {
        this.empleadoRepository = empleadoRepository;
        this.rolRepository = rolRepository;
        this.areaRepository = areaRepository;
        this.turnoRepository = turnoRepository;
    }

    @GetMapping
    public ResponseEntity<List<Empleado>> listarTodos() {
        return ResponseEntity.ok(empleadoRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Empleado> obtenerPorId(@PathVariable @NonNull Integer id) {
        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Empleado no encontrado con id: " + id));
        return ResponseEntity.ok(empleado);
    }

    @PostMapping
    public ResponseEntity<Empleado> crear(@RequestBody Empleado empleado) {
        empleado.setIdEmpleado(null);
        if (empleado.getRol() != null && empleado.getRol().getIdRol() != null) {
            empleado.setRol(rolRepository.findById(empleado.getRol().getIdRol()).orElse(null));
        }
        if (empleado.getArea() != null && empleado.getArea().getIdArea() != null) {
            empleado.setArea(areaRepository.findById(empleado.getArea().getIdArea()).orElse(null));
        }
        if (empleado.getTurno() != null && empleado.getTurno().getIdTurno() != null) {
            empleado.setTurno(turnoRepository.findById(empleado.getTurno().getIdTurno()).orElse(null));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(empleadoRepository.save(empleado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Empleado> actualizar(@PathVariable @NonNull Integer id, @RequestBody Empleado datos) {
        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Empleado no encontrado con id: " + id));
        empleado.setNombres(datos.getNombres());
        empleado.setApellidos(datos.getApellidos());
        empleado.setTipoDocumento(datos.getTipoDocumento());
        empleado.setNumeroDocumento(datos.getNumeroDocumento());
        empleado.setCorreo(datos.getCorreo());
        empleado.setTelefono(datos.getTelefono());
        empleado.setFechaIngreso(datos.getFechaIngreso());
        if (datos.getRol() != null && datos.getRol().getIdRol() != null) {
            empleado.setRol(rolRepository.findById(datos.getRol().getIdRol()).orElse(null));
        }
        if (datos.getArea() != null && datos.getArea().getIdArea() != null) {
            empleado.setArea(areaRepository.findById(datos.getArea().getIdArea()).orElse(null));
        }
        if (datos.getTurno() != null && datos.getTurno().getIdTurno() != null) {
            empleado.setTurno(turnoRepository.findById(datos.getTurno().getIdTurno()).orElse(null));
        }
        return ResponseEntity.ok(empleadoRepository.save(empleado));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Empleado> cambiarEstado(@PathVariable @NonNull Integer id, @RequestBody Map<String, Boolean> body) {
        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Empleado no encontrado con id: " + id));
        empleado.setEstado(body.get("estado"));
        return ResponseEntity.ok(empleadoRepository.save(empleado));
    }
}
