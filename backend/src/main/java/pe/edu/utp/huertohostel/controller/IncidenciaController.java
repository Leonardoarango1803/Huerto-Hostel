package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.IncidenciaMantenimiento;
import pe.edu.utp.huertohostel.entity.TipoIncidencia;
import pe.edu.utp.huertohostel.service.IncidenciaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/incidencias")
@PreAuthorize(Roles.LIMPIEZA)
public class IncidenciaController {

    private final IncidenciaService incidenciaService;

    public IncidenciaController(IncidenciaService incidenciaService) {
        this.incidenciaService = incidenciaService;
    }

    @GetMapping
    public ResponseEntity<List<IncidenciaMantenimiento>> listar(
            @RequestParam(required = false) EstadoIncidencia estado) {
        return ResponseEntity.ok(incidenciaService.listar(estado));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidenciaMantenimiento> obtener(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(incidenciaService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<IncidenciaMantenimiento> reportar(@RequestBody Map<String, String> body) {
        Integer idHabitacion = Integer.valueOf(body.get("idHabitacion"));
        TipoIncidencia tipo = body.get("tipoIncidencia") != null
                ? TipoIncidencia.valueOf(body.get("tipoIncidencia"))
                : TipoIncidencia.OTRO;
        IncidenciaMantenimiento creada =
                incidenciaService.reportar(idHabitacion, tipo, body.get("descripcion"));
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<IncidenciaMantenimiento> cambiarEstado(@PathVariable @NonNull Integer id,
                                                                 @RequestBody Map<String, String> body) {
        EstadoIncidencia nuevo = EstadoIncidencia.valueOf(body.get("estado"));
        return ResponseEntity.ok(
                incidenciaService.cambiarEstado(id, nuevo, body.get("observaciones")));
    }
}
