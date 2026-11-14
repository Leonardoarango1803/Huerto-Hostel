package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.SolicitudServicio;
import pe.edu.utp.huertohostel.dto.ReservaWebRequest;
import pe.edu.utp.huertohostel.service.PortalService;
import pe.edu.utp.huertohostel.service.ReservaWebService;

import java.util.List;
import java.util.Map;

/** Autoservicio del huesped: siempre opera sobre SU estadia activa. */
@RestController
@RequestMapping("/api/v1/portal")
@PreAuthorize(Roles.SOLO_CLIENTE)
public class PortalController {

    private final PortalService portalService;
    private final ReservaWebService reservaWebService;

    public PortalController(PortalService portalService, ReservaWebService reservaWebService) {
        this.portalService = portalService;
        this.reservaWebService = reservaWebService;
    }

    /** Todas las reservas del huesped (proximas, pasadas y canceladas) con lo pagado y el saldo. */
    @GetMapping("/reservas")
    public ResponseEntity<List<Map<String, Object>>> misReservas() {
        return ResponseEntity.ok(reservaWebService.misReservas());
    }

    /** El huesped con cuenta reserva otra vez desde la web sin volver a registrarse. */
    @PostMapping("/reservas")
    public ResponseEntity<Map<String, Object>> reservar(@RequestBody ReservaWebRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservaWebService.reservarComoCliente(req));
    }

    @GetMapping("/folio")
    public ResponseEntity<Map<String, Object>> miFolio() {
        return ResponseEntity.ok(portalService.miFolio());
    }

    @GetMapping("/consumos")
    public ResponseEntity<List<ConsumoEstadia>> misConsumos() {
        return ResponseEntity.ok(portalService.misConsumos());
    }

    @GetMapping("/solicitudes")
    public ResponseEntity<List<SolicitudServicio>> misSolicitudes() {
        return ResponseEntity.ok(portalService.misSolicitudes());
    }

    @PostMapping("/solicitudes")
    public ResponseEntity<SolicitudServicio> solicitar(@RequestBody Map<String, Object> body) {
        String descripcion = body.get("descripcion") != null
                ? String.valueOf(body.get("descripcion")) : null;
        Integer idProducto = body.get("idProducto") != null
                ? Integer.valueOf(String.valueOf(body.get("idProducto"))) : null;
        Short cantidad = body.get("cantidad") != null
                ? Short.valueOf(String.valueOf(body.get("cantidad"))) : null;

        SolicitudServicio creada = portalService.solicitarServicio(descripcion, idProducto, cantidad);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }
}
