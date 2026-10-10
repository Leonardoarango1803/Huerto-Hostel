package pe.edu.utp.huertohostel.dto;

import pe.edu.utp.huertohostel.entity.CanalReserva;
import java.time.LocalDate;

public class NuevaReservaRequest {

    private Integer idCliente;
    private Integer idHabitacion;
    private LocalDate fechaCheckinPrevisto;
    private LocalDate fechaCheckoutPrevisto;
    private CanalReserva canalReserva;
    private String observaciones;

    public Integer getIdCliente() { return idCliente; }
    public void setIdCliente(Integer idCliente) { this.idCliente = idCliente; }

    public Integer getIdHabitacion() { return idHabitacion; }
    public void setIdHabitacion(Integer idHabitacion) { this.idHabitacion = idHabitacion; }

    public LocalDate getFechaCheckinPrevisto() { return fechaCheckinPrevisto; }
    public void setFechaCheckinPrevisto(LocalDate fechaCheckinPrevisto) { this.fechaCheckinPrevisto = fechaCheckinPrevisto; }

    public LocalDate getFechaCheckoutPrevisto() { return fechaCheckoutPrevisto; }
    public void setFechaCheckoutPrevisto(LocalDate fechaCheckoutPrevisto) { this.fechaCheckoutPrevisto = fechaCheckoutPrevisto; }

    public CanalReserva getCanalReserva() { return canalReserva; }
    public void setCanalReserva(CanalReserva canalReserva) { this.canalReserva = canalReserva; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}
