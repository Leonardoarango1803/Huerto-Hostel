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

    /** Incidencias abiertas agrupadas por habitacion (para avisar en Habitaciones y Reservas). */
    @GetMapping("/por-habitacion")
    public ResponseEntity<List<Map<String, Object>>> porHabitacion() {
        return ResponseEntity.ok(incidenciaService.resumenPorHabitacion());
    }

    /**
     * Reporta una averia. {@code bloquearHabitacion=true} la pone en MANTENIMIENTO (no se vende); si es menor se deja
     * disponible. La respuesta trae un mensaje con lo que paso con la habitacion.
     */
    @PostMapping
    public ResponseEntity<IncidenciaService.ResultadoIncidencia> reportar(@RequestBody Map<String, String> body) {
        Integer idHabitacion = Integer.valueOf(body.get("idHabitacion"));
        TipoIncidencia tipo = body.get("tipoIncidencia") != null
                ? TipoIncidencia.valueOf(body.get("tipoIncidencia"))
                : TipoIncidencia.OTRO;
        boolean bloquear = "true".equalsIgnoreCase(body.get("bloquearHabitacion"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(incidenciaService.reportar(idHabitacion, tipo, body.get("descripcion"), bloquear));
    }

    /** Cambia la decision de bloquear una incidencia abierta: la habitacion pasa a MANTENIMIENTO o se libera. */
    @PatchMapping("/{id}/bloqueo")
    public ResponseEntity<IncidenciaService.ResultadoIncidencia> cambiarBloqueo(@PathVariable @NonNull Integer id,
                                                                                @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(incidenciaService.cambiarBloqueo(id, "true".equalsIgnoreCase(body.get("bloquear"))));
    }

    /**
     * Cambia el estado: EN_REPARACION, RESUELTO (con {@code destino} DISPONIBLE o LIMPIEZA), DUPLICADA o NO_PROCEDE
     * (con el motivo en {@code observaciones}), o PENDIENTE para reabrir una cerrada. La respuesta trae la incidencia, el
     * estado final de la habitacion y un mensaje.
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<IncidenciaService.ResultadoIncidencia> cambiarEstado(@PathVariable @NonNull Integer id,
                                                                               @RequestBody Map<String, String> body) {
        EstadoIncidencia nuevo = EstadoIncidencia.valueOf(body.get("estado"));
        return ResponseEntity.ok(
                incidenciaService.cambiarEstado(id, nuevo, body.get("observaciones"), body.get("destino")));
    }
}
