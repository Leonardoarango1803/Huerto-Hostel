package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Retiro a custodia o gasto menor en efectivo: sale de la caja y baja el efectivo que el sistema espera. */
@Entity
@Table(name = "movimiento_caja")
public class MovimientoCaja {

    public static final String RETIRO = "RETIRO";
    public static final String GASTO = "GASTO";
    /** Efectivo devuelto al huesped por un saldo a su favor al salir (ligado a su estadia). */
    public static final String DEVOLUCION = "DEVOLUCION";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_movimiento_caja")
    private Integer idMovimientoCaja;

    @ManyToOne
    @JoinColumn(name = "id_turno_caja")
    private TurnoCaja turnoCaja;

    @Column(name = "tipo")
    private String tipo;

    @Column(name = "monto", precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "motivo")
    private String motivo;

    @ManyToOne
    @JoinColumn(name = "id_empleado")
    private Empleado empleado;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @Column(name = "id_estadia")
    private Integer idEstadia;

    public MovimientoCaja() {}

    public Integer getIdMovimientoCaja() {
        return idMovimientoCaja;
    }

    public void setIdMovimientoCaja(Integer idMovimientoCaja) {
        this.idMovimientoCaja = idMovimientoCaja;
    }

    public TurnoCaja getTurnoCaja() {
        return turnoCaja;
    }

    public void setTurnoCaja(TurnoCaja turnoCaja) {
        this.turnoCaja = turnoCaja;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
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

    public Integer getIdEstadia() {
        return idEstadia;
    }

    public void setIdEstadia(Integer idEstadia) {
        this.idEstadia = idEstadia;
    }
}
