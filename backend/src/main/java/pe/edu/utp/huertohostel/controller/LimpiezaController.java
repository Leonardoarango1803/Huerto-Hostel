package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.EstadoTareaLimpieza;
import pe.edu.utp.huertohostel.entity.OrigenTareaLimpieza;
import pe.edu.utp.huertohostel.entity.TareaLimpieza;
import pe.edu.utp.huertohostel.service.LimpiezaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tareas-limpieza")
@PreAuthorize(Roles.LIMPIEZA)
public class LimpiezaController {

    private final LimpiezaService limpiezaService;

    public LimpiezaController(LimpiezaService limpiezaService) {
        this.limpiezaService = limpiezaService;
    }

    @GetMapping
    public ResponseEntity<List<TareaLimpieza>> listar(
            @RequestParam(required = false) EstadoTareaLimpieza estado) {
        return ResponseEntity.ok(limpiezaService.listar(estado));
    }

    @PostMapping
    public ResponseEntity<TareaLimpieza> crear(@RequestBody Map<String, String> body) {
        Integer idHabitacion = Integer.valueOf(body.get("idHabitacion"));
        OrigenTareaLimpieza origen = body.get("origen") != null
                ? OrigenTareaLimpieza.valueOf(body.get("origen"))
                : OrigenTareaLimpieza.PROGRAMADO;
        TareaLimpieza tarea = limpiezaService.crear(idHabitacion, origen, body.get("observaciones"));
        return ResponseEntity.status(HttpStatus.CREATED).body(tarea);
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<TareaLimpieza> cambiarEstado(@PathVariable @NonNull Integer id,
                                                       @RequestBody Map<String, String> body) {
        EstadoTareaLimpieza nuevo = EstadoTareaLimpieza.valueOf(body.get("estado"));
        return ResponseEntity.ok(limpiezaService.cambiarEstado(id, nuevo));
    }
}
