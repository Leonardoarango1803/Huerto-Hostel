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
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.NuevaReservaRequest;
import pe.edu.utp.huertohostel.dto.NuevoAdelantoRequest;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.service.PagoService;
import pe.edu.utp.huertohostel.service.ReservaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reservas")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
public class ReservaController {

    private final ReservaService reservaService;
    private final PagoService pagoService;

    public ReservaController(ReservaService reservaService, PagoService pagoService) {
        this.reservaService = reservaService;
        this.pagoService = pagoService;
    }

    @GetMapping
    public ResponseEntity<List<Reserva>> listarTodas() {
        return ResponseEntity.ok(reservaService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reserva> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(reservaService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<Reserva> registrar(@RequestBody NuevaReservaRequest req) {
        Reserva creada = reservaService.registrar(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PostMapping("/{id}/checkin")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
    public ResponseEntity<Estadia> realizarCheckin(@PathVariable Integer id) {
        Estadia estadia = reservaService.realizarCheckin(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(estadia);
    }

    @PostMapping("/{id}/adelanto")
    public ResponseEntity<Pago> registrarAdelanto(
            @PathVariable Integer id,
            @RequestBody NuevoAdelantoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservaService.registrarAdelanto(id, req));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Reserva> cambiarEstado(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        EstadoReserva nuevoEstado = EstadoReserva.valueOf(body.get("estadoReserva"));
        return ResponseEntity.ok(reservaService.cambiarEstado(id, nuevoEstado));
    }

    @GetMapping("/{id}/pagos")
    public ResponseEntity<List<Pago>> listarPagosPorReserva(@PathVariable Integer id) {
        return ResponseEntity.ok(pagoService.listarPorReserva(id));
    }

    @PostMapping("/por-habitacion/{idHabitacion}/cancelar")
    public ResponseEntity<Void> cancelarPorHabitacion(@PathVariable Integer idHabitacion) {
        reservaService.cancelarReservaPorHabitacion(idHabitacion);
        return ResponseEntity.ok().build();
    }
}
