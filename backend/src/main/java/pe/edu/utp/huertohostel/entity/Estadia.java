package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "estadia")
public class Estadia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_estadia")
    private Integer idEstadia;

    @OneToOne
    @JoinColumn(name = "id_reserva", unique = true)
    private Reserva reserva;

    @ManyToOne
    @JoinColumn(name = "id_habitacion")
    private Habitacion habitacion;

    @Column(name = "fecha_checkin_real")
    private LocalDateTime fechaCheckinReal;

    @Column(name = "fecha_checkout_real")
    private LocalDateTime fechaCheckoutReal;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado_estadia", columnDefinition = "estado_estadia_enum")
    private EstadoEstadia estadoEstadia;

    /** Salida autorizada por el administrador con saldo pendiente: quien la autorizo y lo que quedo debiendo. */
    @Column(name = "salida_forzada", nullable = false)
    private boolean salidaForzada = false;

    @Column(name = "motivo_salida_forzada", length = 200)
    private String motivoSalidaForzada;

    @Column(name = "saldo_al_salir", precision = 10, scale = 2)
    private BigDecimal saldoAlSalir;

    public Estadia() {}

    public Integer getIdEstadia() {
        return idEstadia;
    }

    public void setIdEstadia(Integer idEstadia) {
        this.idEstadia = idEstadia;
    }

    public Reserva getReserva() {
        return reserva;
    }

    public void setReserva(Reserva reserva) {
        this.reserva = reserva;
    }

    public Habitacion getHabitacion() {
        return habitacion;
    }

    public void setHabitacion(Habitacion habitacion) {
        this.habitacion = habitacion;
    }

    public LocalDateTime getFechaCheckinReal() {
        return fechaCheckinReal;
    }

    public void setFechaCheckinReal(LocalDateTime fechaCheckinReal) {
        this.fechaCheckinReal = fechaCheckinReal;
    }

    public LocalDateTime getFechaCheckoutReal() {
        return fechaCheckoutReal;
    }

    public void setFechaCheckoutReal(LocalDateTime fechaCheckoutReal) {
        this.fechaCheckoutReal = fechaCheckoutReal;
    }

    public EstadoEstadia getEstadoEstadia() {
        return estadoEstadia;
    }

    public void setEstadoEstadia(EstadoEstadia estadoEstadia) {
        this.estadoEstadia = estadoEstadia;
    }

    public boolean isSalidaForzada() {
        return salidaForzada;
    }

    public void setSalidaForzada(boolean salidaForzada) {
        this.salidaForzada = salidaForzada;
    }

    public String getMotivoSalidaForzada() {
        return motivoSalidaForzada;
    }

    public void setMotivoSalidaForzada(String motivoSalidaForzada) {
        this.motivoSalidaForzada = motivoSalidaForzada;
    }

    public BigDecimal getSaldoAlSalir() {
        return saldoAlSalir;
    }

    public void setSaldoAlSalir(BigDecimal saldoAlSalir) {
        this.saldoAlSalir = saldoAlSalir;
    }
}
