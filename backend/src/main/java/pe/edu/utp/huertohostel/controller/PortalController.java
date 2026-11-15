package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.SolicitudServicio;
import pe.edu.utp.huertohostel.dto.ReservaWebRequest;
import pe.edu.utp.huertohostel.dto.PagoPortalRequest;
import pe.edu.utp.huertohostel.service.PagoPortalService;
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
    private final PagoPortalService pagoPortalService;
    private final pe.edu.utp.huertohostel.service.UsuarioActualService usuarioActualService;

    public PortalController(PortalService portalService, ReservaWebService reservaWebService,
                            PagoPortalService pagoPortalService,
                            pe.edu.utp.huertohostel.service.UsuarioActualService usuarioActualService) {
        this.portalService = portalService;
        this.reservaWebService = reservaWebService;
        this.pagoPortalService = pagoPortalService;
        this.usuarioActualService = usuarioActualService;
    }

    /** Con quien hablamos: nombre para saludarlo en su portal y si entra con Google. */
    @GetMapping("/perfil")
    public ResponseEntity<Map<String, Object>> perfil() {
        pe.edu.utp.huertohostel.entity.Usuario u = usuarioActualService.obtenerUsuario();
        pe.edu.utp.huertohostel.entity.Cliente c = usuarioActualService.obtenerCliente();
        Map<String, Object> r = new java.util.LinkedHashMap<>();
        r.put("nombres", c.getNombres());
        r.put("apellidos", c.getApellidos());
        r.put("correo", c.getCorreo());
        r.put("usuario", u.getUsername());
        r.put("google", u.getGoogleSub() != null);
        // Sin documento (cuenta creada con Google): la primera reserva lo pide como titular.
        r.put("tieneDocumento", c.getNumeroDocumento() != null && !c.getNumeroDocumento().isBlank());
        return ResponseEntity.ok(r);
    }

    /**
     * Pagar con la pasarela simulada (RF24): el saldo de la estadia en curso o, con idReserva, lo pendiente de una
     * reserva propia que aun no ingreso. 402 PAGO_RECHAZADO si la pasarela no aprueba (no queda nada registrado).
     */
    @PostMapping("/pagos")
    public ResponseEntity<Map<String, Object>> pagar(@RequestBody PagoPortalRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pagoPortalService.pagar(req));
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

    /** 204 sin contenido si el huesped no esta alojado ahora: el portal muestra entonces solo sus reservas. */
    @GetMapping("/folio")
    public ResponseEntity<Map<String, Object>> miFolio() {
        return portalService.miFolioSiHay()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Catalogo para pedir servicios a la habitacion (el catalogo interno /productos es solo del personal). */
    @GetMapping("/productos")
    public ResponseEntity<List<Map<String, Object>>> productosParaPedir() {
        return ResponseEntity.ok(portalService.productosParaPedir());
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
