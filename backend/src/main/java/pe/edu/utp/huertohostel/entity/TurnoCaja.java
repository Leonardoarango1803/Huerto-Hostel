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

    /** Veces que el conteo declarado no cuadro al verificar antes de cerrar. */
    @Column(name = "reconteos_cierre")
    private Short reconteosCierre = 0;

    /** true si, tras fallar el conteo, se le mostro al cajero lo que esperaba el sistema. */
    @Column(name = "esperado_revelado")
    private Boolean esperadoRevelado = false;

    @Column(name = "motivo_diferencia")
    private String motivoDiferencia;

    /** Billetes y monedas contados al cerrar, como texto JSON {"100":2,"0.5":3}. */
    @Column(name = "desglose_cierre")
    private String desgloseCierre;

    /** Lo que el turno anterior declaro al cerrar: contra eso se compara el fondo con el que se recibe la caja. */
    @Column(name = "efectivo_apertura_esperado", precision = 10, scale = 2)
    private BigDecimal efectivoAperturaEsperado;

    @Column(name = "diferencia_apertura", precision = 10, scale = 2)
    private BigDecimal diferenciaApertura;

    @Column(name = "motivo_diferencia_apertura")
    private String motivoDiferenciaApertura;

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

    public Short getReconteosCierre() {
        return reconteosCierre;
    }

    public void setReconteosCierre(Short reconteosCierre) {
        this.reconteosCierre = reconteosCierre;
    }

    public Boolean getEsperadoRevelado() {
        return esperadoRevelado;
    }

    public void setEsperadoRevelado(Boolean esperadoRevelado) {
        this.esperadoRevelado = esperadoRevelado;
    }

    public String getMotivoDiferencia() {
        return motivoDiferencia;
    }

    public void setMotivoDiferencia(String motivoDiferencia) {
        this.motivoDiferencia = motivoDiferencia;
    }

    public String getDesgloseCierre() {
        return desgloseCierre;
    }

    public void setDesgloseCierre(String desgloseCierre) {
        this.desgloseCierre = desgloseCierre;
    }

    public BigDecimal getEfectivoAperturaEsperado() {
        return efectivoAperturaEsperado;
    }

    public void setEfectivoAperturaEsperado(BigDecimal efectivoAperturaEsperado) {
        this.efectivoAperturaEsperado = efectivoAperturaEsperado;
    }

    public BigDecimal getDiferenciaApertura() {
        return diferenciaApertura;
    }

    public void setDiferenciaApertura(BigDecimal diferenciaApertura) {
        this.diferenciaApertura = diferenciaApertura;
    }

    public String getMotivoDiferenciaApertura() {
        return motivoDiferenciaApertura;
    }

    public void setMotivoDiferenciaApertura(String motivoDiferenciaApertura) {
        this.motivoDiferenciaApertura = motivoDiferenciaApertura;
    }
}
