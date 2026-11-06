package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Constancia de un consumo anulado: lo que era, quien lo registro, quien lo anulo y por que. */
@Entity
@Table(name = "consumo_anulado")
public class ConsumoAnulado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_anulacion")
    private Integer idAnulacion;

    @Column(name = "id_consumo_original")
    private Integer idConsumoOriginal;

    @ManyToOne
    @JoinColumn(name = "id_estadia")
    private Estadia estadia;

    @ManyToOne
    @JoinColumn(name = "id_producto")
    private Producto producto;

    @Column(name = "cantidad")
    private Short cantidad;

    @Column(name = "precio_unitario", precision = 10, scale = 2)
    private BigDecimal precioUnitario;

    @Column(name = "total_consumo", precision = 10, scale = 2)
    private BigDecimal totalConsumo;

    @Column(name = "origen")
    private String origen;

    @Column(name = "fecha_registro_original")
    private LocalDateTime fechaRegistroOriginal;

    @ManyToOne
    @JoinColumn(name = "id_empleado_registra")
    private Empleado empleadoRegistra;

    @ManyToOne
    @JoinColumn(name = "id_empleado_anula")
    private Empleado empleadoAnula;

    @Column(name = "motivo")
    private String motivo;

    @Column(name = "fecha_anulacion")
    private LocalDateTime fechaAnulacion;

    public ConsumoAnulado() {}

    public Integer getIdAnulacion() { return idAnulacion; }
    public void setIdAnulacion(Integer idAnulacion) { this.idAnulacion = idAnulacion; }
    public Integer getIdConsumoOriginal() { return idConsumoOriginal; }
    public void setIdConsumoOriginal(Integer idConsumoOriginal) { this.idConsumoOriginal = idConsumoOriginal; }
    public Estadia getEstadia() { return estadia; }
    public void setEstadia(Estadia estadia) { this.estadia = estadia; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Short getCantidad() { return cantidad; }
    public void setCantidad(Short cantidad) { this.cantidad = cantidad; }
    public BigDecimal getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    public BigDecimal getTotalConsumo() { return totalConsumo; }
    public void setTotalConsumo(BigDecimal totalConsumo) { this.totalConsumo = totalConsumo; }
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }
    public LocalDateTime getFechaRegistroOriginal() { return fechaRegistroOriginal; }
    public void setFechaRegistroOriginal(LocalDateTime fechaRegistroOriginal) { this.fechaRegistroOriginal = fechaRegistroOriginal; }
    public Empleado getEmpleadoRegistra() { return empleadoRegistra; }
    public void setEmpleadoRegistra(Empleado empleadoRegistra) { this.empleadoRegistra = empleadoRegistra; }
    public Empleado getEmpleadoAnula() { return empleadoAnula; }
    public void setEmpleadoAnula(Empleado empleadoAnula) { this.empleadoAnula = empleadoAnula; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public LocalDateTime getFechaAnulacion() { return fechaAnulacion; }
    public void setFechaAnulacion(LocalDateTime fechaAnulacion) { this.fechaAnulacion = fechaAnulacion; }
}
