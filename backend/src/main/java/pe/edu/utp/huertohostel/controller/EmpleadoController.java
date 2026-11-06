package pe.edu.utp.huertohostel.controller;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.dto.EmpleadoRequest;
import pe.edu.utp.huertohostel.entity.AuditoriaGestion;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.repository.EmpleadoRepository;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.EmpleadoAdminService;

import java.util.List;
import java.util.Map;

/** Empleados y sus cuentas de ingreso. Solo el administrador: crear, editar, dar de baja y restablecer claves. */
@RestController
@RequestMapping("/api/v1/empleados")
@PreAuthorize(Roles.SOLO_ADMIN)
public class EmpleadoController {

    private final EmpleadoAdminService service;
    private final EmpleadoRepository empleadoRepository;

    public EmpleadoController(EmpleadoAdminService service, EmpleadoRepository empleadoRepository) {
        this.service = service;
        this.empleadoRepository = empleadoRepository;
    }

    /** Cada empleado con el estado de su cuenta (sin cuenta, activa o bloqueada). */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listarTodos() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Empleado> obtenerPorId(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(empleadoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Empleado no encontrado con id: " + id)));
    }

    /** Crea al empleado y, si se pide, su cuenta con una clave temporal (se devuelve una sola vez). */
    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(@RequestBody EmpleadoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizar(@PathVariable @NonNull Integer id,
                                                          @RequestBody EmpleadoRequest request) {
        return ResponseEntity.ok(service.actualizar(id, request));
    }

    /** Activar o desactivar al empleado: su cuenta de ingreso se habilita o se bloquea con el. */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Map<String, Object>> cambiarEstado(@PathVariable @NonNull Integer id,
                                                             @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(service.cambiarEstado(id, Boolean.TRUE.equals(body.get("estado"))));
    }

    @PatchMapping("/{id}/turno")
    public ResponseEntity<Map<String, Object>> asignarTurno(@PathVariable @NonNull Integer id,
                                                            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(service.asignarTurno(id, body.get("idTurno")));
    }

    /** Da acceso a un empleado que no tiene cuenta: usuario sugerido y clave temporal. */
    @PostMapping("/{id}/acceso")
    public ResponseEntity<Map<String, Object>> crearAcceso(@PathVariable @NonNull Integer id,
                                                           @RequestBody(required = false) Map<String, String> body) {
        Map<String, String> datos = body != null ? body : Map.of();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.crearAcceso(id, datos.get("username"), datos.get("password")));
    }

    /** Restablece la clave de otro usuario confirmando la contrasena del administrador. */
    @PostMapping("/{id}/acceso/restablecer")
    public ResponseEntity<Map<String, Object>> restablecer(@PathVariable @NonNull Integer id,
                                                           @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.restablecerPassword(id, body.get("passwordAdmin"), body.get("passwordNueva")));
    }

    /** Ultimos movimientos sensibles: altas, bajas, cambios de rol, claves y horarios. */
    @GetMapping("/auditoria")
    public ResponseEntity<List<AuditoriaGestion>> auditoria() {
        return ResponseEntity.ok(service.historial());
    }
}
