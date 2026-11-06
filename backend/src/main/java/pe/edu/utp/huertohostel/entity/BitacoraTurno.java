package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bitacora_turno")
public class BitacoraTurno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bitacora")
    private Integer idBitacora;

    @ManyToOne
    @JoinColumn(name = "id_turno_caja")
    private TurnoCaja turnoCaja;

    @Column(name = "prioridad")
    private String prioridad = "MEDIA";

    @Column(name = "categoria")
    private String categoria;

    @Column(name = "mensaje")
    private String mensaje;

    @Column(name = "resuelto")
    private Boolean resuelto = false;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    /** Monto de la diferencia (negativo = faltante) en las notas de DESCUADRE y APERTURA. */
    @Column(name = "monto", precision = 10, scale = 2)
    private BigDecimal monto;

    @ManyToOne
    @JoinColumn(name = "id_empleado_resolvio")
    private Empleado empleadoResolvio;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    @Column(name = "comentario_resolucion")
    private String comentarioResolucion;

    public BitacoraTurno() {}

    public Integer getIdBitacora() {
        return idBitacora;
    }

    public void setIdBitacora(Integer idBitacora) {
        this.idBitacora = idBitacora;
    }

    public TurnoCaja getTurnoCaja() {
        return turnoCaja;
    }

    public void setTurnoCaja(TurnoCaja turnoCaja) {
        this.turnoCaja = turnoCaja;
    }

    public String getPrioridad() {
        return prioridad;
    }

    public void setPrioridad(String prioridad) {
        this.prioridad = prioridad;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public Boolean getResuelto() {
        return resuelto;
    }

    public void setResuelto(Boolean resuelto) {
        this.resuelto = resuelto;
    }

    public LocalDateTime getFechaHora() {
        return fechaHora;
    }

    public void setFechaHora(LocalDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public Empleado getEmpleadoResolvio() {
        return empleadoResolvio;
    }

    public void setEmpleadoResolvio(Empleado empleadoResolvio) {
        this.empleadoResolvio = empleadoResolvio;
    }

    public LocalDateTime getFechaResolucion() {
        return fechaResolucion;
    }

    public void setFechaResolucion(LocalDateTime fechaResolucion) {
        this.fechaResolucion = fechaResolucion;
    }

    public String getComentarioResolucion() {
        return comentarioResolucion;
    }

    public void setComentarioResolucion(String comentarioResolucion) {
        this.comentarioResolucion = comentarioResolucion;
    }
}
