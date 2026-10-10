package pe.edu.utp.huertohostel.dto;

import java.math.BigDecimal;

public class NuevoAdelantoRequest {

    private BigDecimal monto;
    private String metodoPago;

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
}
