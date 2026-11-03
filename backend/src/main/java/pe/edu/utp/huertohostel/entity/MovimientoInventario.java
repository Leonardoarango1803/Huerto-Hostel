package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "movimiento_inventario")
public class MovimientoInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento")
    private Integer idMovimiento;

    @ManyToOne
    @JoinColumn(name = "id_insumo")
    private Insumo insumo;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo_movimiento", columnDefinition = "tipo_mov_inventario_enum")
    private TipoMovInventario tipoMovimiento;

    @Column(name = "cantidad", precision = 10, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "stock_resultante", precision = 10, scale = 2)
    private BigDecimal stockResultante;

    @Column(name = "referencia_origen")
    private String referenciaOrigen;

    @ManyToOne
    @JoinColumn(name = "id_empleado")
    private Empleado empleado;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    /** Parte de la cantidad pedida que el almacen no tenia (la receta pidio mas de lo registrado). */
    @Column(name = "cantidad_faltante", precision = 10, scale = 3)
    private BigDecimal cantidadFaltante = BigDecimal.ZERO;

    /** Costo por unidad de la compra (solo ENTRADA). */
    @Column(name = "costo_unitario", precision = 10, scale = 4)
    private BigDecimal costoUnitario;

    @ManyToOne
    @JoinColumn(name = "id_proveedor")
    private Proveedor proveedor;

    public MovimientoInventario() {}

    public BigDecimal getCantidadFaltante() {
        return cantidadFaltante;
    }

    public void setCantidadFaltante(BigDecimal cantidadFaltante) {
        this.cantidadFaltante = cantidadFaltante;
    }

    public BigDecimal getCostoUnitario() {
        return costoUnitario;
    }

    public void setCostoUnitario(BigDecimal costoUnitario) {
        this.costoUnitario = costoUnitario;
    }

    public Proveedor getProveedor() {
        return proveedor;
    }

    public void setProveedor(Proveedor proveedor) {
        this.proveedor = proveedor;
    }

    public Integer getIdMovimiento() {
        return idMovimiento;
    }

    public void setIdMovimiento(Integer idMovimiento) {
        this.idMovimiento = idMovimiento;
    }

    public Insumo getInsumo() {
        return insumo;
    }

    public void setInsumo(Insumo insumo) {
        this.insumo = insumo;
    }

    public TipoMovInventario getTipoMovimiento() {
        return tipoMovimiento;
    }

    public void setTipoMovimiento(TipoMovInventario tipoMovimiento) {
        this.tipoMovimiento = tipoMovimiento;
    }

    public BigDecimal getCantidad() {
        return cantidad;
    }

    public void setCantidad(BigDecimal cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getStockResultante() {
        return stockResultante;
    }

    public void setStockResultante(BigDecimal stockResultante) {
        this.stockResultante = stockResultante;
    }

    public String getReferenciaOrigen() {
        return referenciaOrigen;
    }

    public void setReferenciaOrigen(String referenciaOrigen) {
        this.referenciaOrigen = referenciaOrigen;
    }

    public Empleado getEmpleado() {
        return empleado;
    }

    public void setEmpleado(Empleado empleado) {
        this.empleado = empleado;
    }

    public LocalDateTime getFechaHora() {
        return fechaHora;
    }

    public void setFechaHora(LocalDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }
}
