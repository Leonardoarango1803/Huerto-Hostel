package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "reserva")
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reserva")
    private Integer idReserva;

    @ManyToOne
    @JoinColumn(name = "id_cliente")
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "id_habitacion")
    private Habitacion habitacion;

    @Column(name = "fecha_checkin_previsto")
    private LocalDate fechaCheckinPrevisto;

    @Column(name = "fecha_checkout_previsto")
    private LocalDate fechaCheckoutPrevisto;

    @Column(name = "num_noches")
    private Short numNoches;

    @Column(name = "monto_alojamiento_total", precision = 10, scale = 2)
    private BigDecimal montoAlojamientoTotal;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "canal_reserva", columnDefinition = "canal_reserva_enum")
    private CanalReserva canalReserva;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado_reserva", columnDefinition = "estado_reserva_enum")
    private EstadoReserva estadoReserva;

    @Column(name = "observaciones")
    private String observaciones;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    public Reserva() {}

    public Integer getIdReserva() {
        return idReserva;
    }

    public void setIdReserva(Integer idReserva) {
        this.idReserva = idReserva;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public Habitacion getHabitacion() {
        return habitacion;
    }

    public void setHabitacion(Habitacion habitacion) {
        this.habitacion = habitacion;
    }

    public LocalDate getFechaCheckinPrevisto() {
        return fechaCheckinPrevisto;
    }

    public void setFechaCheckinPrevisto(LocalDate fechaCheckinPrevisto) {
        this.fechaCheckinPrevisto = fechaCheckinPrevisto;
    }

    public LocalDate getFechaCheckoutPrevisto() {
        return fechaCheckoutPrevisto;
    }

    public void setFechaCheckoutPrevisto(LocalDate fechaCheckoutPrevisto) {
        this.fechaCheckoutPrevisto = fechaCheckoutPrevisto;
    }

    public Short getNumNoches() {
        return numNoches;
    }

    public void setNumNoches(Short numNoches) {
        this.numNoches = numNoches;
    }

    public BigDecimal getMontoAlojamientoTotal() {
        return montoAlojamientoTotal;
    }

    public void setMontoAlojamientoTotal(BigDecimal montoAlojamientoTotal) {
        this.montoAlojamientoTotal = montoAlojamientoTotal;
    }

    public CanalReserva getCanalReserva() {
        return canalReserva;
    }

    public void setCanalReserva(CanalReserva canalReserva) {
        this.canalReserva = canalReserva;
    }

    public EstadoReserva getEstadoReserva() {
        return estadoReserva;
    }

    public void setEstadoReserva(EstadoReserva estadoReserva) {
        this.estadoReserva = estadoReserva;
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
