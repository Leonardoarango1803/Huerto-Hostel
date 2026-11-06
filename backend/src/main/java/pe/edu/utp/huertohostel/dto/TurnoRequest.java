package pe.edu.utp.huertohostel.dto;

/** Edicion de un turno laboral. Las horas llegan como "HH:mm". */
public record TurnoRequest(String nombre, String horaInicio, String horaFin, String descripcion, Boolean estado) {
}
