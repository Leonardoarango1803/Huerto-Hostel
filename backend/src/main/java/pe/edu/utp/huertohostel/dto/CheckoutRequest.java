package pe.edu.utp.huertohostel.dto;

import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.MetodoPago;

import java.math.BigDecimal;

/**
 * Salida del huesped: el pago final (si hay saldo que cobrar) y lo que decide quien la hace. Todo es opcional: un cuerpo vacio
 * es una salida simple (saldo 0).
 *
 * @param ajustarNoches cobrar las noches realmente usadas (menos si se va antes, mas si se quedo de mas)
 * @param devolverSaldo devolver en efectivo de la caja un saldo a favor del huesped
 * @param forzar        solo administrador: salir con saldo pendiente (queda como deuda registrada)
 * @param motivo        obligatorio al forzar la salida
 */
public record CheckoutRequest(
        MetodoPago metodoPago,
        BigDecimal monto,
        ConceptoPago concepto,
        String numTransaccionComprobante,
        Boolean ajustarNoches,
        Boolean devolverSaldo,
        Boolean forzar,
        String motivo) {
}
