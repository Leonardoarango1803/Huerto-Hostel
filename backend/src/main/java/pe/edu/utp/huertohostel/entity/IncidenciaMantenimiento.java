package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "incidencia_mantenimiento")
public class IncidenciaMantenimiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_incidencia")
    private Integer idIncidencia;

    @ManyToOne
    @JoinColumn(name = "id_habitacion")
    private Habitacion habitacion;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "tipo_incidencia", columnDefinition = "tipo_incidencia_enum")
    private TipoIncidencia tipoIncidencia;

    @Column(name = "descripcion")
    private String descripcion;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", columnDefinition = "estado_incidencia_enum")
    private EstadoIncidencia estado;

    @ManyToOne
    @JoinColumn(name = "id_empleado_reporta")
    private Empleado empleadoReporta;

    @ManyToOne
    @JoinColumn(name = "id_empleado_responsable")
    private Empleado empleadoResponsable;

    @Column(name = "observaciones")
    private String observaciones;

    @Column(name = "fecha_reporte")
    private LocalDateTime fechaReporte;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    /** true si la averia impide usar la habitacion: mientras este abierta, la habitacion no se vende. */
    @Column(name = "bloquea_habitacion")
    private Boolean bloqueaHabitacion = false;

    /** Cuando se empezo a atender: de aqui sale el tiempo de respuesta. */
    @Column(name = "fecha_inicio_reparacion")
    private LocalDateTime fechaInicioReparacion;

    @Column(name = "veces_reabierta")
    private Short vecesReabierta = 0;

    public IncidenciaMantenimiento() {}

    public Integer getIdIncidencia() {
        return idIncidencia;
    }

    public void setIdIncidencia(Integer idIncidencia) {
        this.idIncidencia = idIncidencia;
    }

    public Habitacion getHabitacion() {
        return habitacion;
    }

    public void setHabitacion(Habitacion habitacion) {
        this.habitacion = habitacion;
    }

    public TipoIncidencia getTipoIncidencia() {
        return tipoIncidencia;
    }

    public void setTipoIncidencia(TipoIncidencia tipoIncidencia) {
        this.tipoIncidencia = tipoIncidencia;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public EstadoIncidencia getEstado() {
        return estado;
    }

    public void setEstado(EstadoIncidencia estado) {
        this.estado = estado;
    }

    public Empleado getEmpleadoReporta() {
        return empleadoReporta;
    }

    public void setEmpleadoReporta(Empleado empleadoReporta) {
        this.empleadoReporta = empleadoReporta;
    }

    public Empleado getEmpleadoResponsable() {
        return empleadoResponsable;
    }

    public void setEmpleadoResponsable(Empleado empleadoResponsable) {
        this.empleadoResponsable = empleadoResponsable;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public LocalDateTime getFechaReporte() {
        return fechaReporte;
    }

    public void setFechaReporte(LocalDateTime fechaReporte) {
        this.fechaReporte = fechaReporte;
    }

    public LocalDateTime getFechaResolucion() {
        return fechaResolucion;
    }

    public void setFechaResolucion(LocalDateTime fechaResolucion) {
        this.fechaResolucion = fechaResolucion;
    }

    public Boolean getBloqueaHabitacion() {
        return bloqueaHabitacion;
    }

    public void setBloqueaHabitacion(Boolean bloqueaHabitacion) {
        this.bloqueaHabitacion = bloqueaHabitacion;
    }

    public LocalDateTime getFechaInicioReparacion() {
        return fechaInicioReparacion;
    }

    public void setFechaInicioReparacion(LocalDateTime fechaInicioReparacion) {
        this.fechaInicioReparacion = fechaInicioReparacion;
    }

    public Short getVecesReabierta() {
        return vecesReabierta;
    }

    public void setVecesReabierta(Short vecesReabierta) {
        this.vecesReabierta = vecesReabierta;
    }
}
