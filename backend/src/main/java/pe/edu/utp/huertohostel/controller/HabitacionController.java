package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.NuevaHabitacionRequest;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.service.HabitacionService;
import pe.edu.utp.huertohostel.service.LiberacionReservasService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/habitaciones")
public class HabitacionController {

    private final HabitacionService habitacionService;
    private final LiberacionReservasService liberacionReservasService;

    public HabitacionController(HabitacionService habitacionService,
                                LiberacionReservasService liberacionReservasService) {
        this.habitacionService = habitacionService;
        this.liberacionReservasService = liberacionReservasService;
    }

    @GetMapping
    @PreAuthorize(Roles.HABITACIONES_LISTA)
    public ResponseEntity<List<Habitacion>> listarTodas(
            @RequestParam(required = false) EstadoOperativoHab estado) {
        liberacionReservasService.liberarSiHaceFalta();
        if (estado != null) {
            return ResponseEntity.ok(habitacionService.listarPorEstado(estado));
        }
        return ResponseEntity.ok(habitacionService.listarTodas());
    }

    @PostMapping
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<Habitacion> crear(@RequestBody NuevaHabitacionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(habitacionService.crear(req));
    }

    @GetMapping("/{id}")
    @PreAuthorize(Roles.HABITACION_DETALLE)
    public ResponseEntity<Habitacion> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(habitacionService.obtenerPorId(id));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<Habitacion> cambiarEstado(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        EstadoOperativoHab nuevoEstado = EstadoOperativoHab.valueOf(body.get("estado"));
        return ResponseEntity.ok(habitacionService.cambiarEstado(id, nuevoEstado));
    }

    @GetMapping("/resumen")
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<Map<String, Long>> resumen() {
        liberacionReservasService.liberarSiHaceFalta();
        Map<String, Long> resumen = Map.of(
                "disponibles",        habitacionService.contarPorEstado(EstadoOperativoHab.DISPONIBLE),
                "ocupadas",           habitacionService.contarPorEstado(EstadoOperativoHab.OCUPADA),
                "pendienteLimpieza",  habitacionService.contarPorEstado(EstadoOperativoHab.PENDIENTE_LIMPIEZA),
                "enLimpieza",         habitacionService.contarPorEstado(EstadoOperativoHab.EN_LIMPIEZA),
                "mantenimiento",      habitacionService.contarPorEstado(EstadoOperativoHab.MANTENIMIENTO)
        );
        return ResponseEntity.ok(resumen);
    }
}
