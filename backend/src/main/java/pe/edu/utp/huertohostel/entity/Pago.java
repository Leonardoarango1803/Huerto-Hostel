package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "pago")
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pago")
    private Integer idPago;

    @ManyToOne
    @JoinColumn(name = "id_reserva")
    private Reserva reserva;

    @ManyToOne
    @JoinColumn(name = "id_estadia")
    private Estadia estadia;

    @ManyToOne
    @JoinColumn(name = "id_empleado_registra")
    private Empleado empleadoRegistra;

    @Column(name = "monto", precision = 10, scale = 2)
    private BigDecimal monto;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "metodo_pago", columnDefinition = "metodo_pago_enum")
    private MetodoPago metodoPago;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "concepto", columnDefinition = "concepto_pago_enum")
    private ConceptoPago concepto;

    @Column(name = "num_transaccion_comprobante")
    private String numTransaccionComprobante;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    public Pago() {}

    public Integer getIdPago() {
        return idPago;
    }

    public void setIdPago(Integer idPago) {
        this.idPago = idPago;
    }

    public Reserva getReserva() {
        return reserva;
    }

    public void setReserva(Reserva reserva) {
        this.reserva = reserva;
    }

    public Estadia getEstadia() {
        return estadia;
    }

    public void setEstadia(Estadia estadia) {
        this.estadia = estadia;
    }

    public Empleado getEmpleadoRegistra() {
        return empleadoRegistra;
    }

    public void setEmpleadoRegistra(Empleado empleadoRegistra) {
        this.empleadoRegistra = empleadoRegistra;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public MetodoPago getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(MetodoPago metodoPago) {
        this.metodoPago = metodoPago;
    }

    public ConceptoPago getConcepto() {
        return concepto;
    }

    public void setConcepto(ConceptoPago concepto) {
        this.concepto = concepto;
    }

    public String getNumTransaccionComprobante() {
        return numTransaccionComprobante;
    }

    public void setNumTransaccionComprobante(String numTransaccionComprobante) {
        this.numTransaccionComprobante = numTransaccionComprobante;
    }

    public LocalDateTime getFechaPago() {
        return fechaPago;
    }

    public void setFechaPago(LocalDateTime fechaPago) {
        this.fechaPago = fechaPago;
    }
}
