package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.service.ClienteService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/clientes")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public ResponseEntity<List<Cliente>> listarTodos() {
        return ResponseEntity.ok(clienteService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cliente> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(clienteService.obtenerPorId(id));
    }

    @GetMapping("/buscar")
    public ResponseEntity<Cliente> buscarPorDocumento(@RequestParam String documento) {
        return ResponseEntity.ok(clienteService.buscarPorDocumento(documento));
    }

    @PostMapping
    public ResponseEntity<Cliente> registrar(@RequestBody Cliente cliente) {
        Cliente creado = clienteService.registrar(cliente);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

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
