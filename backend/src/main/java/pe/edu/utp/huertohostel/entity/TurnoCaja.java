package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "turno_caja")
public class TurnoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_turno_caja")
    private Integer idTurnoCaja;

    @ManyToOne
    @JoinColumn(name = "id_empleado")
    private Empleado empleado;

    @ManyToOne
    @JoinColumn(name = "id_empleado_cierre")
    private Empleado empleadoCierre;

    @Column(name = "fondo_inicial_efectivo", precision = 10, scale = 2)
    private BigDecimal fondoInicialEfectivo;

    @Column(name = "efectivo_sistema_esperado", precision = 10, scale = 2)
    private BigDecimal efectivoSistemaEsperado;

    @Column(name = "efectivo_real_declarado", precision = 10, scale = 2)
    private BigDecimal efectivoRealDeclarado;

    @Column(name = "diferencia_cuadre", precision = 10, scale = 2)
    private BigDecimal diferenciaCuadre;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "estado", columnDefinition = "estado_turno_enum")
    private EstadoTurno estado;

    @Column(name = "observaciones_cierre")
    private String observacionesCierre;

    @Column(name = "fecha_apertura")
    private LocalDateTime fechaApertura;

    @Column(name = "fecha_cierre")
    private LocalDateTime fechaCierre;

    public TurnoCaja() {}

    public Integer getIdTurnoCaja() {
        return idTurnoCaja;
    }

    public void setIdTurnoCaja(Integer idTurnoCaja) {
        this.idTurnoCaja = idTurnoCaja;
    }

    public Empleado getEmpleado() {
        return empleado;
    }

    public void setEmpleado(Empleado empleado) {
        this.empleado = empleado;
    }

    public Empleado getEmpleadoCierre() {
        return empleadoCierre;
    }

    public void setEmpleadoCierre(Empleado empleadoCierre) {
        this.empleadoCierre = empleadoCierre;
    }

    public BigDecimal getFondoInicialEfectivo() {
        return fondoInicialEfectivo;
    }

    public void setFondoInicialEfectivo(BigDecimal fondoInicialEfectivo) {
        this.fondoInicialEfectivo = fondoInicialEfectivo;
    }

    public BigDecimal getEfectivoSistemaEsperado() {
        return efectivoSistemaEsperado;
    }

    public void setEfectivoSistemaEsperado(BigDecimal efectivoSistemaEsperado) {
        this.efectivoSistemaEsperado = efectivoSistemaEsperado;
    }

    public BigDecimal getEfectivoRealDeclarado() {
        return efectivoRealDeclarado;
    }

    public void setEfectivoRealDeclarado(BigDecimal efectivoRealDeclarado) {
        this.efectivoRealDeclarado = efectivoRealDeclarado;
    }

    public BigDecimal getDiferenciaCuadre() {
        return diferenciaCuadre;
    }

    public void setDiferenciaCuadre(BigDecimal diferenciaCuadre) {
        this.diferenciaCuadre = diferenciaCuadre;
    }

    public EstadoTurno getEstado() {
        return estado;
    }

    public void setEstado(EstadoTurno estado) {
        this.estado = estado;
    }

    public String getObservacionesCierre() {
        return observacionesCierre;
    }

    public void setObservacionesCierre(String observacionesCierre) {
        this.observacionesCierre = observacionesCierre;
    }

    public LocalDateTime getFechaApertura() {
        return fechaApertura;
    }

    public void setFechaApertura(LocalDateTime fechaApertura) {
        this.fechaApertura = fechaApertura;
    }

    public LocalDateTime getFechaCierre() {
        return fechaCierre;
    }

    public void setFechaCierre(LocalDateTime fechaCierre) {
        this.fechaCierre = fechaCierre;
    }
}
