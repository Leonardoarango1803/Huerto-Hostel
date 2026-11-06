package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.ConsumoAnulado;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.dto.CheckoutRequest;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.service.EstadiaService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/estadias")
@PreAuthorize(Roles.RECEPCION)
public class EstadiaController {

    private final EstadiaService estadiaService;
    private final pe.edu.utp.huertohostel.service.ComprobanteService comprobanteService;

    public EstadiaController(EstadiaService estadiaService,
                             pe.edu.utp.huertohostel.service.ComprobanteService comprobanteService) {
        this.estadiaService = estadiaService;
        this.comprobanteService = comprobanteService;
    }

    @PreAuthorize(Roles.COBRO)
    @GetMapping
    public ResponseEntity<List<Estadia>> listarPorEstado(
            @org.springframework.web.bind.annotation.RequestParam(required = false) EstadoEstadia estado) {
        if (estado != null) {
            return ResponseEntity.ok(estadiaService.listarPorEstado(estado));
        }
        return ResponseEntity.ok(estadiaService.listarTodas());
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/{id}")
    public ResponseEntity<Estadia> obtenerPorId(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.obtenerPorId(id));
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/{id}/consumos")
    public ResponseEntity<List<ConsumoEstadia>> listarConsumos(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.listarConsumos(id));
    }

    /** Accesos rapidos: los productos activos que mas se cargaron en el ultimo mes. */
    @GetMapping("/consumos/frecuentes")
    public ResponseEntity<List<Integer>> consumosFrecuentes() {
        return ResponseEntity.ok(estadiaService.productosFrecuentes());
    }

    /**
     * Carga uno o varios consumos de una vez ({@code items}: idProducto y cantidad). El precio sale del catalogo; la estadia
     * debe estar en curso. Responde lo registrado y los avisos de stock.
     */
    @PostMapping("/{id}/consumos")
    public ResponseEntity<EstadiaService.ResultadoConsumos> registrarConsumos(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estadiaService.registrarDirectos(id, leerItems(body)));
    }

    @PreAuthorize(Roles.CONSULTA_COBRO)
    @GetMapping("/{id}/consumos/anulados")
    public ResponseEntity<List<ConsumoAnulado>> consumosAnulados(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.listarAnulados(id));
    }

    /** Anula un consumo de recepcion o de una solicitud: motivo obligatorio, devuelve el stock y deja constancia. */
    @PostMapping("/{id}/consumos/{idConsumo}/anular")
    public ResponseEntity<ConsumoAnulado> anularConsumo(@PathVariable Integer id, @PathVariable Integer idConsumo,
                                                        @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(estadiaService.anularConsumo(id, idConsumo, body.get("motivo")));
    }

    /** Acepta {@code {items:[{idProducto,cantidad}]}} o un solo consumo {@code {idProducto,cantidad}} (o el formato viejo). */
    @SuppressWarnings("unchecked")
    private static List<EstadiaService.ItemConsumo> leerItems(Map<String, Object> body) {
        List<EstadiaService.ItemConsumo> items = new java.util.ArrayList<>();
        Object lista = body.get("items");
        if (lista instanceof List<?> filas) {
            for (Object fila : filas) {
                if (fila instanceof Map<?, ?> m) {
                    items.add(item((Map<String, Object>) m));
                }
            }
        } else {
            items.add(item(body));
        }
        return items;
    }

    @SuppressWarnings("unchecked")
    private static EstadiaService.ItemConsumo item(Map<String, Object> m) {
        Object idProducto = m.get("idProducto");
        if (idProducto == null && m.get("producto") instanceof Map<?, ?> p) {
            idProducto = ((Map<String, Object>) p).get("idProducto");
        }
        return new EstadiaService.ItemConsumo(entero(idProducto), entero(m.get("cantidad")));
    }

    private static Integer entero(Object valor) {
        if (valor == null) {
            return null;
        }
        try {
            return valor instanceof Number n ? Integer.valueOf(n.intValue()) : Integer.valueOf(valor.toString().trim());
        } catch (NumberFormatException e) {
            throw new IllegalStateException("Dato numerico invalido: " + valor);
        }
    }

    /**
     * Datos del comprobante de la estadia (huesped, alojamiento, consumos y pagos). Con la estadia en curso es una pre-cuenta;
     * finalizada, el comprobante del pago. La pantalla lo imprime, lo baja como PDF o como imagen.
     */
    @PreAuthorize(Roles.COBRO)
    @GetMapping("/{id}/comprobante")
    public ResponseEntity<Map<String, Object>> comprobante(@PathVariable Integer id) {
        return ResponseEntity.ok(comprobanteService.de(id));
    }

    @PreAuthorize(Roles.COBRO)
    @GetMapping("/resumen-checkout")
    public ResponseEntity<Map<String, Object>> resumenCheckout() {
        return ResponseEntity.ok(estadiaService.resumenCheckout());
    }

    @PreAuthorize(Roles.COBRO)
    @GetMapping("/{id}/saldo")
    public ResponseEntity<Map<String, Object>> getSaldo(@PathVariable Integer id) {
        return ResponseEntity.ok(estadiaService.obtenerSaldoDetallado(id));
    }

    /**
     * Cierra la estadia. El cuerpo (opcional) trae el pago final y las decisiones: ajustar noches, devolver saldo a favor o,
     * solo para el administrador, salir con saldo pendiente con su motivo.
     */
    @PostMapping("/{id}/checkout")
    @PreAuthorize(Roles.COBRO)
    public ResponseEntity<Estadia> realizarCheckout(
            @PathVariable Integer id,
            @RequestBody(required = false) CheckoutRequest cuerpo) {
        Pago pago = null;
        EstadiaService.OpcionesCheckout opciones = EstadiaService.OpcionesCheckout.NINGUNA;
        if (cuerpo != null) {
            if (cuerpo.monto() != null) {
                pago = new Pago();
                pago.setMonto(cuerpo.monto());
                pago.setMetodoPago(cuerpo.metodoPago());
                pago.setConcepto(cuerpo.concepto());
                pago.setNumTransaccionComprobante(cuerpo.numTransaccionComprobante());
            }
            opciones = new EstadiaService.OpcionesCheckout(Boolean.TRUE.equals(cuerpo.ajustarNoches()),
                    Boolean.TRUE.equals(cuerpo.devolverSaldo()), Boolean.TRUE.equals(cuerpo.forzar()), cuerpo.motivo());
        }
        return ResponseEntity.ok(estadiaService.realizarCheckout(id, pago, opciones));
    }
}
