package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "consumo_estadia")
public class ConsumoEstadia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_consumo")
    private Integer idConsumo;

    @ManyToOne
    @JoinColumn(name = "id_estadia")
    private Estadia estadia;

    @ManyToOne
    @JoinColumn(name = "id_comanda")
    private Comanda comanda;

    @ManyToOne
    @JoinColumn(name = "id_producto")
    private Producto producto;

    @Column(name = "cantidad")
    private Short cantidad;

    @Column(name = "precio_unitario", precision = 10, scale = 2)
    private BigDecimal precioUnitario;

    @Column(name = "total_consumo", precision = 10, scale = 2)
    private BigDecimal totalConsumo;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    /** De donde viene el cargo: COMANDA, DIRECTO (recepcion) o SOLICITUD (pedido del huesped). */
    @Column(name = "origen")
    private String origen = "DIRECTO";

    @ManyToOne
    @JoinColumn(name = "id_empleado_registra")
    private Empleado empleadoRegistra;

    public ConsumoEstadia() {}

    public Integer getIdConsumo() {
        return idConsumo;
    }

    public void setIdConsumo(Integer idConsumo) {
        this.idConsumo = idConsumo;
    }

    public Estadia getEstadia() {
        return estadia;
    }

    public void setEstadia(Estadia estadia) {
        this.estadia = estadia;
    }

    public Comanda getComanda() {
        return comanda;
    }

    public void setComanda(Comanda comanda) {
        this.comanda = comanda;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public Short getCantidad() {
        return cantidad;
    }

    public void setCantidad(Short cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getPrecioUnitario() {
        return precioUnitario;
    }

    public void setPrecioUnitario(BigDecimal precioUnitario) {
        this.precioUnitario = precioUnitario;
    }

    public BigDecimal getTotalConsumo() {
        return totalConsumo;
    }

    public void setTotalConsumo(BigDecimal totalConsumo) {
        this.totalConsumo = totalConsumo;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }

    public String getOrigen() {
        return origen;
    }

    public void setOrigen(String origen) {
        this.origen = origen;
    }

    public Empleado getEmpleadoRegistra() {
        return empleadoRegistra;
    }

    public void setEmpleadoRegistra(Empleado empleadoRegistra) {
        this.empleadoRegistra = empleadoRegistra;
    }
}
