package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.lang.NonNull;
import pe.edu.utp.huertohostel.dto.AccesoPortalResponse;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.service.AccesoPortalService;
import pe.edu.utp.huertohostel.service.ClienteService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/clientes")
@PreAuthorize(Roles.RECEPCION)
public class ClienteController {

    private final ClienteService clienteService;
    private final AccesoPortalService accesoPortalService;

    public ClienteController(ClienteService clienteService,
                             AccesoPortalService accesoPortalService) {
        this.clienteService = clienteService;
        this.accesoPortalService = accesoPortalService;
    }

    // ---------- Acceso al Portal del Huesped (RF32) ----------

    @GetMapping("/{id}/acceso")
    public ResponseEntity<AccesoPortalResponse> consultarAcceso(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(accesoPortalService.consultar(id));
    }

    /** Crea el acceso. Sin username/password, el sistema los propone y devuelve la clave una sola vez. */
    @PostMapping("/{id}/acceso")
    public ResponseEntity<AccesoPortalResponse> crearAcceso(@PathVariable @NonNull Integer id,
                                                            @RequestBody(required = false) Map<String, String> body) {
        String username = body != null ? body.get("username") : null;
        String password = body != null ? body.get("password") : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accesoPortalService.crear(id, username, password));
    }

    @PatchMapping("/{id}/acceso")
    public ResponseEntity<AccesoPortalResponse> cambiarEstadoAcceso(@PathVariable @NonNull Integer id,
                                                                    @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(
                accesoPortalService.cambiarEstado(id, Boolean.TRUE.equals(body.get("activo"))));
    }

    @PostMapping("/{id}/acceso/password")
    public ResponseEntity<AccesoPortalResponse> restablecerPassword(@PathVariable @NonNull Integer id,
                                                                    @RequestBody(required = false) Map<String, String> body) {
        String password = body != null ? body.get("password") : null;
        return ResponseEntity.ok(accesoPortalService.restablecerPassword(id, password));
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping
    public ResponseEntity<List<Cliente>> listarTodos() {
        return ResponseEntity.ok(clienteService.listarTodos());
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/{id}")
    public ResponseEntity<Cliente> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(clienteService.obtenerPorId(id));
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/buscar")
    public ResponseEntity<Cliente> buscarPorDocumento(@RequestParam String documento) {
        return ResponseEntity.ok(clienteService.buscarPorDocumento(documento));
    }

    @PostMapping
    public ResponseEntity<Cliente> registrar(@RequestBody Cliente cliente) {
        Cliente creado = clienteService.registrar(cliente);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Long>> estadisticas() {
        return ResponseEntity.ok(clienteService.estadisticas());
    }

    @GetMapping("/consultar-dni")
    public ResponseEntity<Map<String, String>> consultarDni(@RequestParam String dni) {
        return ResponseEntity.ok(clienteService.consultarDni(dni));
    }

    @GetMapping("/consultar-ruc")
    public ResponseEntity<Map<String, String>> consultarRuc(@RequestParam String ruc) {
        return ResponseEntity.ok(clienteService.consultarRuc(ruc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> actualizar(
            @PathVariable Integer id,
            @RequestBody Cliente cliente) {
        return ResponseEntity.ok(clienteService.actualizar(id, cliente));
    }
}
