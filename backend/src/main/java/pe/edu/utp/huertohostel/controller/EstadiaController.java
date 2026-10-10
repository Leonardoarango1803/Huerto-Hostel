package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.service.EstadiaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/estadias")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
public class EstadiaController {

    private final EstadiaService estadiaService;

    public EstadiaController(EstadiaService estadiaService) {
        this.estadiaService = estadiaService;
    }

    @GetMapping
    public ResponseEntity<List<Estadia>> listarPorEstado(
            @org.springframework.web.bind.annotation.RequestParam(required = false) EstadoEstadia estado) {
        if (estado != null) {
            return ResponseEntity.ok(estadiaService.listarPorEstado(estado));
        }
        return ResponseEntity.ok(estadiaService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Estadia> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.obtenerPorId(id));
    }

    @GetMapping("/{id}/consumos")
    public ResponseEntity<List<ConsumoEstadia>> listarConsumos(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.listarConsumos(id));
    }

    @PostMapping("/{id}/consumos")
    public ResponseEntity<ConsumoEstadia> registrarConsumo(
            @PathVariable Integer id,
            @RequestBody ConsumoEstadia consumo) {
        ConsumoEstadia creado = estadiaService.registrarConsumo(id, consumo);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @GetMapping("/resumen-checkout")
    public ResponseEntity<Map<String, Object>> resumenCheckout() {
        return ResponseEntity.ok(estadiaService.resumenCheckout());
    }

    @GetMapping("/{id}/saldo")
    public ResponseEntity<Map<String, Object>> getSaldo(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.obtenerSaldoDetallado(id));
    }

    @PostMapping("/{id}/checkout")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
    public ResponseEntity<Estadia> realizarCheckout(
            @PathVariable Integer id,
            @RequestBody(required = false) Pago pago) {
        return ResponseEntity.ok(estadiaService.realizarCheckout(id, pago));
    }
}
