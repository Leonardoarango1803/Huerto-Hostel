package pe.edu.utp.huertohostel.dto;

import java.math.BigDecimal;

/**
 * Pago del huesped desde su portal con la pasarela simulada (RF24). Sin idReserva paga el saldo de su estadia en
 * curso; con idReserva paga lo pendiente de una reserva suya que aun no ingreso. Ningun dato de tarjeta viaja:
 * la web decide simularRechazo con la tarjeta de prueba, igual que al reservar.
 */
public class PagoPortalRequest {
    private Integer idReserva;
    /** Null = todo lo pendiente. */
    private BigDecimal monto;
    /** TARJETA o YAPE. */
    private String metodo;
    /** Codigo que muestra la app de Yape/Plin (obligatorio con YAPE). */
    private String codigoOperacion;
    private boolean simularRechazo;

    public Integer getIdReserva() { return idReserva; }
    public void setIdReserva(Integer idReserva) { this.idReserva = idReserva; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMetodo() { return metodo; }
    public void setMetodo(String metodo) { this.metodo = metodo; }
    public String getCodigoOperacion() { return codigoOperacion; }
    public void setCodigoOperacion(String codigoOperacion) { this.codigoOperacion = codigoOperacion; }
    public boolean isSimularRechazo() { return simularRechazo; }
    public void setSimularRechazo(boolean simularRechazo) { this.simularRechazo = simularRechazo; }
}
