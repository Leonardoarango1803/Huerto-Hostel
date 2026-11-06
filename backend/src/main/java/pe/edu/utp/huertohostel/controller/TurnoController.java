package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.dto.TurnoRequest;
import pe.edu.utp.huertohostel.entity.Turno;
import pe.edu.utp.huertohostel.repository.TurnoRepository;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.TurnoService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/turnos")
@PreAuthorize(Roles.RECEPCION)
public class TurnoController {

    private final TurnoRepository turnoRepository;
    private final TurnoService turnoService;

    public TurnoController(TurnoRepository turnoRepository, TurnoService turnoService) {
        this.turnoRepository = turnoRepository;
        this.turnoService = turnoService;
    }

    @GetMapping
    public ResponseEntity<List<Turno>> listarTodos() {
        return ResponseEntity.ok(turnoRepository.findAll());
    }

    /** Todos los turnos con su gente, cual esta en curso ahora y cuantos de cada rol hay en cada uno. */
    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> resumen() {
        return ResponseEntity.ok(turnoService.resumen());
    }

    /** El turno de quien esta conectado y sus companeros: lo ve todo el personal, no solo recepcion. */
    @GetMapping("/mi-turno")
    @PreAuthorize(Roles.PERSONAL)
    public ResponseEntity<Map<String, Object>> miTurno() {
        return ResponseEntity.ok(turnoService.miTurno());
    }

    /** Quien esta de turno ahora, opcionalmente de un solo rol (por ejemplo, el personal de limpieza). */
    @GetMapping("/en-servicio")
    @PreAuthorize(Roles.LIMPIEZA)
    public ResponseEntity<List<Map<String, Object>>> enServicio(@RequestParam(required = false) String rol) {
        return ResponseEntity.ok(turnoService.enServicio(rol));
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Map<String, Object>> actualizar(@PathVariable @NonNull Integer id,
                                                          @RequestBody TurnoRequest request) {
        return ResponseEntity.ok(turnoService.actualizar(id, request));
    }
}
