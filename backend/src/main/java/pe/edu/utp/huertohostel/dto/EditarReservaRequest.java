package pe.edu.utp.huertohostel.dto;

import java.time.LocalDate;

/**
 * Cambios a una reserva que aun no ingreso (RF05). Lo que llega en null se deja como estaba.
 * El canal y el estado no se editan: el canal es historia y el estado lo mueven adelanto, check-in y cancelar.
 */
public class EditarReservaRequest {
    private Integer idCliente;
    private Integer idHabitacion;
    private LocalDate fechaCheckinPrevisto;
    private LocalDate fechaCheckoutPrevisto;
    private String observaciones;

    public Integer getIdCliente() { return idCliente; }
    public void setIdCliente(Integer idCliente) { this.idCliente = idCliente; }
    public Integer getIdHabitacion() { return idHabitacion; }
    public void setIdHabitacion(Integer idHabitacion) { this.idHabitacion = idHabitacion; }
    public LocalDate getFechaCheckinPrevisto() { return fechaCheckinPrevisto; }
    public void setFechaCheckinPrevisto(LocalDate fechaCheckinPrevisto) { this.fechaCheckinPrevisto = fechaCheckinPrevisto; }
    public LocalDate getFechaCheckoutPrevisto() { return fechaCheckoutPrevisto; }
    public void setFechaCheckoutPrevisto(LocalDate fechaCheckoutPrevisto) { this.fechaCheckoutPrevisto = fechaCheckoutPrevisto; }
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}
