package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "comanda")
public class Comanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comanda")
    private Integer idComanda;

    @ManyToOne
    @JoinColumn(name = "id_estadia")
    private Estadia estadia;

    @ManyToOne
    @JoinColumn(name = "id_empleado")
    private Empleado empleado;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "area_destino", columnDefinition = "area_destino_enum")
    private AreaDestino areaDestino;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado_comanda", columnDefinition = "estado_comanda_enum")
    private EstadoComanda estadoComanda;

    @Column(name = "observaciones")
    private String observaciones;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    /** Cuando paso a cada estado: con esto los reportes miden cuanto tarda cocina o bar. */
    @Column(name = "fecha_en_preparacion")
    private LocalDateTime fechaEnPreparacion;

    @Column(name = "fecha_preparada")
    private LocalDateTime fechaPreparada;

    @Column(name = "fecha_entregada")
    private LocalDateTime fechaEntregada;

    @Column(name = "fecha_cancelada")
    private LocalDateTime fechaCancelada;

    public Comanda() {}

    public LocalDateTime getFechaEnPreparacion() {
        return fechaEnPreparacion;
    }

    public void setFechaEnPreparacion(LocalDateTime fechaEnPreparacion) {
        this.fechaEnPreparacion = fechaEnPreparacion;
    }

    public LocalDateTime getFechaPreparada() {
        return fechaPreparada;
    }

    public void setFechaPreparada(LocalDateTime fechaPreparada) {
        this.fechaPreparada = fechaPreparada;
    }

    public LocalDateTime getFechaEntregada() {
        return fechaEntregada;
    }

    public void setFechaEntregada(LocalDateTime fechaEntregada) {
        this.fechaEntregada = fechaEntregada;
    }

    public LocalDateTime getFechaCancelada() {
        return fechaCancelada;
    }

    public void setFechaCancelada(LocalDateTime fechaCancelada) {
        this.fechaCancelada = fechaCancelada;
    }

    public Integer getIdComanda() {
        return idComanda;
    }

    public void setIdComanda(Integer idComanda) {
        this.idComanda = idComanda;
    }

    public Estadia getEstadia() {
        return estadia;
    }

    public void setEstadia(Estadia estadia) {
        this.estadia = estadia;
    }

    public Empleado getEmpleado() {
        return empleado;
    }

    public void setEmpleado(Empleado empleado) {
        this.empleado = empleado;
    }

    public AreaDestino getAreaDestino() {
        return areaDestino;
    }

    public void setAreaDestino(AreaDestino areaDestino) {
        this.areaDestino = areaDestino;
    }

    public EstadoComanda getEstadoComanda() {
        return estadoComanda;
    }

    public void setEstadoComanda(EstadoComanda estadoComanda) {
        this.estadoComanda = estadoComanda;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }
}
