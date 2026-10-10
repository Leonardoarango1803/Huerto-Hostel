package pe.edu.utp.huertohostel.dto;

public class NuevaHabitacionRequest {

    private Integer idTipoHabitacion;
    private String numero;
    private Short piso;
    private String descripcion;

    public Integer getIdTipoHabitacion() { return idTipoHabitacion; }
    public void setIdTipoHabitacion(Integer idTipoHabitacion) { this.idTipoHabitacion = idTipoHabitacion; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public Short getPiso() { return piso; }
    public void setPiso(Short piso) { this.piso = piso; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
