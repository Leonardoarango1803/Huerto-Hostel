package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.dto.ComandaResponse;
import pe.edu.utp.huertohostel.dto.NuevaComandaRequest;
import pe.edu.utp.huertohostel.entity.AreaDestino;
import pe.edu.utp.huertohostel.entity.EstadoComanda;
import pe.edu.utp.huertohostel.service.ComandaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/comandas")
public class ComandaController {

    private final ComandaService comandaService;

    public ComandaController(ComandaService comandaService) {
        this.comandaService = comandaService;
    }

    /** Tablero KDS: sin filtros devuelve las comandas activas (no entregadas ni canceladas). */
    @GetMapping
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<List<ComandaResponse>> listar(
            @RequestParam(required = false) AreaDestino area,
            @RequestParam(required = false) EstadoComanda estado) {
        return ResponseEntity.ok(comandaService.listarTablero(area, estado));
    }

    @GetMapping("/{id}")
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<ComandaResponse> obtener(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(comandaService.obtenerPorId(id));
    }

    /** Estadias en curso para armar una comanda: solo la habitacion, sin datos del huesped. */
    @GetMapping("/estadias-activas")
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<List<Map<String, Object>>> estadiasActivas() {
        return ResponseEntity.ok(comandaService.estadiasActivas());
    }

    @GetMapping("/estadia/{idEstadia}")
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<List<ComandaResponse>> listarPorEstadia(@PathVariable @NonNull Integer idEstadia) {
        return ResponseEntity.ok(comandaService.listarPorEstadia(idEstadia));
    }

    @PostMapping
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<ComandaResponse> crear(@RequestBody NuevaComandaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(comandaService.crear(request));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<ComandaResponse> cambiarEstado(
            @PathVariable @NonNull Integer id,
            @RequestBody Map<String, String> body) {
        EstadoComanda nuevo = EstadoComanda.valueOf(body.get("estadoComanda"));
        return ResponseEntity.ok(comandaService.cambiarEstado(id, nuevo));
    }
}
