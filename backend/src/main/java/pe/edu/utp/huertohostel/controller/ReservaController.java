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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.EditarReservaRequest;
import pe.edu.utp.huertohostel.dto.NuevaReservaRequest;
import pe.edu.utp.huertohostel.dto.NuevoAdelantoRequest;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.service.CalendarioReservasService;
import pe.edu.utp.huertohostel.service.EdicionReservaService;
import pe.edu.utp.huertohostel.service.LiberacionReservasService;
import pe.edu.utp.huertohostel.service.PagoService;
import pe.edu.utp.huertohostel.service.ReservaService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reservas")
@PreAuthorize(Roles.RECEPCION)
public class ReservaController {

    private final ReservaService reservaService;
    private final PagoService pagoService;
    private final LiberacionReservasService liberacionReservasService;
    private final EdicionReservaService edicionReservaService;
    private final CalendarioReservasService calendarioReservasService;

    public ReservaController(ReservaService reservaService, PagoService pagoService,
                             LiberacionReservasService liberacionReservasService,
                             EdicionReservaService edicionReservaService,
                             CalendarioReservasService calendarioReservasService) {
        this.reservaService = reservaService;
        this.pagoService = pagoService;
        this.liberacionReservasService = liberacionReservasService;
        this.edicionReservaService = edicionReservaService;
        this.calendarioReservasService = calendarioReservasService;
    }

    /** Rejilla habitacion x dia (RF04). hasta es exclusivo; por defecto 14 dias desde hoy, maximo 62. */
    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/calendario")
    public ResponseEntity<Map<String, Object>> calendario(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        liberacionReservasService.liberarSiHaceFalta();
        return ResponseEntity.ok(calendarioReservasService.calendario(desde, hasta));
    }

    /** Modificar huesped, habitacion, fechas u observaciones antes del check-in (RF05). */
    @PutMapping("/{id}")
    public ResponseEntity<Reserva> editar(@PathVariable Integer id, @RequestBody EditarReservaRequest req) {
        return ResponseEntity.ok(edicionReservaService.editar(id, req));
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping
    public ResponseEntity<List<Reserva>> listarTodas() {
        liberacionReservasService.liberarSiHaceFalta();
        return ResponseEntity.ok(reservaService.listarTodas());
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
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
    @PreAuthorize(Roles.RECEPCION)
    public ResponseEntity<Estadia> realizarCheckin(@PathVariable Integer id) {
        Estadia estadia = reservaService.realizarCheckin(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(estadia);
    }

    @PreAuthorize(Roles.COBRO)
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

    @PreAuthorize(Roles.COBRO)
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
