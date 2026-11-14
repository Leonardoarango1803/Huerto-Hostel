package pe.edu.utp.huertohostel.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.dto.ReservaWebRequest;
import pe.edu.utp.huertohostel.service.ReservaWebService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Web publica de El Huerto: sin sesion. Solo expone lo que un visitante necesita para reservar
 * (tipos, precios y cuantas habitaciones quedan libres); nunca datos de otros huespedes ni numeros
 * de habitacion antes de reservar. Abierto en SecurityConfig (/api/v1/publico/**).
 */
@RestController
@RequestMapping("/api/v1/publico")
public class PublicoController {

    private final ReservaWebService reservaWebService;

    public PublicoController(ReservaWebService reservaWebService) {
        this.reservaWebService = reservaWebService;
    }

    @GetMapping("/tipos-habitacion")
    public ResponseEntity<List<Map<String, Object>>> tipos() {
        return ResponseEntity.ok(reservaWebService.tiposPublicos());
    }

    @GetMapping("/disponibilidad")
    public ResponseEntity<Map<String, Object>> disponibilidad(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate llegada,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate salida,
            @RequestParam(required = false) Integer huespedes) {
        return ResponseEntity.ok(reservaWebService.disponibilidad(llegada, salida, huespedes));
    }

    /** Crea la cuenta del huesped, la reserva y cobra el adelanto en un solo paso (todo o nada). */
    @PostMapping("/reservas")
    public ResponseEntity<Map<String, Object>> reservar(@RequestBody ReservaWebRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservaWebService.reservarComoNuevo(req));
    }
}
