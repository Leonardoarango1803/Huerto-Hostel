package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoSolicitud;
import pe.edu.utp.huertohostel.entity.SolicitudServicio;
import pe.edu.utp.huertohostel.service.PortalService;

import java.util.List;
import java.util.Map;

/** Bandeja del personal para atender las solicitudes del portal del huesped. */
@RestController
@RequestMapping("/api/v1/solicitudes")
@PreAuthorize(Roles.LIMPIEZA)
public class SolicitudServicioController {

    private final PortalService portalService;

    public SolicitudServicioController(PortalService portalService) {
        this.portalService = portalService;
    }

    @GetMapping
    public ResponseEntity<List<SolicitudServicio>> listar(
            @RequestParam(required = false) EstadoSolicitud estado) {
        return ResponseEntity.ok(portalService.listarParaPersonal(estado));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<SolicitudServicio> cambiarEstado(@PathVariable @NonNull Integer id,
                                                           @RequestBody Map<String, String> body) {
        EstadoSolicitud nuevo = EstadoSolicitud.valueOf(body.get("estado"));
        return ResponseEntity.ok(portalService.cambiarEstado(id, nuevo));
    }

    @PostMapping("/{id}/cargar-folio")
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<ConsumoEstadia> cargarAlFolio(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(portalService.cargarAlFolio(id));
    }
}
