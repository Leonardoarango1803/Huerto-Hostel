package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.EstadoEquipaje;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.EquipajeService;

import java.util.List;
import java.util.Map;

/**
 * Equipaje del huesped: subir/bajar maletas y custodia. Lo ven y atienden recepcion y limpieza (como la bandeja de
 * solicitudes); recibir y entregar maletas en custodia es solo de recepcion.
 */
@RestController
@RequestMapping("/api/v1/equipaje")
@PreAuthorize(Roles.LIMPIEZA)
public class EquipajeController {

    private final EquipajeService equipajeService;

    public EquipajeController(EquipajeService equipajeService) {
        this.equipajeService = equipajeService;
    }

    /** Abiertas (por atender y en custodia); con historial=true, las ultimas 60 de todo tipo. */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listar(@RequestParam(defaultValue = "false") boolean historial) {
        return ResponseEntity.ok(equipajeService.listar(historial));
    }

    /** Estadias en curso o que salieron hace poco: a cuales se les puede registrar equipaje. */
    @GetMapping("/estadias")
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<List<Map<String, Object>>> estadias() {
        return ResponseEntity.ok(equipajeService.estadiasDisponibles());
    }

    /** Recepcion registra una custodia ({tipo: CUSTODIA, bultos}) o un pedido de subida/bajada. */
    @PostMapping
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<Map<String, Object>> registrar(@RequestBody Map<String, Object> body) {
        Integer idEstadia = entero(body.get("idEstadia"));
        Integer bultos = entero(body.get("bultos"));
        String tipo = body.get("tipo") != null ? String.valueOf(body.get("tipo")) : null;
        String descripcion = body.get("descripcion") != null ? String.valueOf(body.get("descripcion")) : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(equipajeService.registrar(idEstadia, tipo, bultos, descripcion));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Map<String, Object>> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        String estado = body.get("estado");
        EstadoEquipaje nuevo;
        try {
            nuevo = estado == null ? null : EstadoEquipaje.valueOf(estado);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Estado de equipaje inválido: " + estado);
        }
        return ResponseEntity.ok(equipajeService.cambiarEstado(id, nuevo));
    }

    private static Integer entero(Object v) {
        if (v == null || String.valueOf(v).isBlank()) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.valueOf(String.valueOf(v).trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Valor numérico inválido: " + v);
        }
    }
}
