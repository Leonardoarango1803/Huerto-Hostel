package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.service.PagoService;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pagos")
public class PagoController {

    private final PagoService pagoService;

    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @PostMapping
    @PreAuthorize(Roles.COBRO)
    public ResponseEntity<Pago> registrar(@RequestBody Pago pago) {
        Pago creado = pagoService.registrar(pago);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    /** Pasarela simulada (sandbox): no procesa datos reales de tarjeta. */
    @PostMapping("/pasarela/simular")
    @PreAuthorize(Roles.PASARELA)
    public ResponseEntity<Map<String, Object>> simularPasarela(@RequestBody Map<String, Object> body) {
        Integer idEstadia = body.get("idEstadia") != null
                ? Integer.valueOf(String.valueOf(body.get("idEstadia"))) : null;
        Integer idReserva = body.get("idReserva") != null
                ? Integer.valueOf(String.valueOf(body.get("idReserva"))) : null;
        BigDecimal monto = body.get("monto") != null
                ? new BigDecimal(String.valueOf(body.get("monto"))) : null;
        ConceptoPago concepto = body.get("concepto") != null
                ? ConceptoPago.valueOf(String.valueOf(body.get("concepto"))) : null;
        boolean simularRechazo = Boolean.parseBoolean(String.valueOf(body.get("simularRechazo")));

        Map<String, Object> resultado =
                pagoService.procesarPasarela(idEstadia, idReserva, monto, concepto, simularRechazo);
        return ResponseEntity.ok(resultado);
    }
}
