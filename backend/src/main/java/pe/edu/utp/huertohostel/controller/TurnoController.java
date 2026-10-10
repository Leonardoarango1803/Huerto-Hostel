package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.Turno;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.repository.TurnoRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/turnos")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
public class TurnoController {

    private final TurnoRepository turnoRepository;
    private final EmpleadoRepository empleadoRepository;

    public TurnoController(TurnoRepository turnoRepository, EmpleadoRepository empleadoRepository) {
        this.turnoRepository = turnoRepository;
        this.empleadoRepository = empleadoRepository;
    }

    @GetMapping
    public ResponseEntity<List<Turno>> listarTodos() {
        return ResponseEntity.ok(turnoRepository.findAll());
    }

    @GetMapping("/con-empleados")
    public ResponseEntity<List<Map<String, Object>>> listarConEmpleados() {
        List<Turno> turnos = turnoRepository.findAll();
        List<Map<String, Object>> resultado = turnos.stream().map(turno -> {
            Map<String, Object> dto = new java.util.LinkedHashMap<>();
            dto.put("idTurno", turno.getIdTurno());
            dto.put("nombre", turno.getNombre());
            dto.put("horaInicio", turno.getHoraInicio());
            dto.put("horaFin", turno.getHoraFin());
            dto.put("descripcion", turno.getDescripcion());
            dto.put("empleados", empleadoRepository.findAll().stream()
                    .filter(e -> e.getTurno() != null && e.getTurno().getIdTurno().equals(turno.getIdTurno()) && Boolean.TRUE.equals(e.getEstado()))
                    .map(e -> {
                        Map<String, Object> emp = new java.util.LinkedHashMap<>();
                        emp.put("idEmpleado", e.getIdEmpleado());
                        emp.put("nombres", e.getNombres());
                        emp.put("apellidos", e.getApellidos());
                        emp.put("rol", e.getRol() != null ? e.getRol().getNombre() : null);
                        return emp;
                    }).collect(Collectors.toList()));
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(resultado);
    }
}
