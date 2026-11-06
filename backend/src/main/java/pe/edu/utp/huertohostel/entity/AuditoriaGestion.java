package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Bitacora de lo sensible que hace el administrador con usuarios y turnos (claves, roles, bajas, horarios). */
@Entity
@Table(name = "auditoria_gestion")
public class AuditoriaGestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_auditoria")
    private Integer idAuditoria;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @Column(name = "accion")
    private String accion;

    @Column(name = "actor_username")
    private String actorUsername;

    @Column(name = "id_empleado_objetivo")
    private Integer idEmpleadoObjetivo;

    @Column(name = "objetivo")
    private String objetivo;

    @Column(name = "detalle")
    private String detalle;

    public AuditoriaGestion() {}

    public Integer getIdAuditoria() { return idAuditoria; }
    public void setIdAuditoria(Integer idAuditoria) { this.idAuditoria = idAuditoria; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }
    public String getActorUsername() { return actorUsername; }
    public void setActorUsername(String actorUsername) { this.actorUsername = actorUsername; }
    public Integer getIdEmpleadoObjetivo() { return idEmpleadoObjetivo; }
    public void setIdEmpleadoObjetivo(Integer idEmpleadoObjetivo) { this.idEmpleadoObjetivo = idEmpleadoObjetivo; }
    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
}
