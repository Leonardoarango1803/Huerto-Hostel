package pe.edu.utp.huertohostel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Conteo de efectivo a mitad de turno (sin cerrar la caja). Lo esperado y la diferencia solo los ve el administrador. */
@Entity
@Table(name = "arqueo_parcial")
public class ArqueoParcial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_arqueo")
    private Integer idArqueo;

    @ManyToOne
    @JoinColumn(name = "id_turno_caja")
    private TurnoCaja turnoCaja;

    @ManyToOne
    @JoinColumn(name = "id_empleado")
    private Empleado empleado;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @Column(name = "efectivo_contado", precision = 10, scale = 2)
    private BigDecimal efectivoContado;

    @Column(name = "efectivo_esperado", precision = 10, scale = 2)
    private BigDecimal efectivoEsperado;

    @Column(name = "diferencia", precision = 10, scale = 2)
    private BigDecimal diferencia;

    public ArqueoParcial() {}

    public Integer getIdArqueo() { return idArqueo; }
    public void setIdArqueo(Integer idArqueo) { this.idArqueo = idArqueo; }
    public TurnoCaja getTurnoCaja() { return turnoCaja; }
    public void setTurnoCaja(TurnoCaja turnoCaja) { this.turnoCaja = turnoCaja; }
    public Empleado getEmpleado() { return empleado; }
    public void setEmpleado(Empleado empleado) { this.empleado = empleado; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public BigDecimal getEfectivoContado() { return efectivoContado; }
    public void setEfectivoContado(BigDecimal efectivoContado) { this.efectivoContado = efectivoContado; }
    public BigDecimal getEfectivoEsperado() { return efectivoEsperado; }
    public void setEfectivoEsperado(BigDecimal efectivoEsperado) { this.efectivoEsperado = efectivoEsperado; }
    public BigDecimal getDiferencia() { return diferencia; }
    public void setDiferencia(BigDecimal diferencia) { this.diferencia = diferencia; }
}
