package pe.edu.utp.huertohostel.dto;

import java.time.LocalDate;

/**
 * Alta o edicion de un empleado. Los ids planos (rol, area, turno) reemplazan los objetos anidados de antes.
 * {@code crearAcceso} y {@code username} solo se usan al crear: generan la cuenta de ingreso con clave temporal.
 */
public record EmpleadoRequest(
        String nombres,
        String apellidos,
        String tipoDocumento,
        String numeroDocumento,
        String correo,
        String telefono,
        LocalDate fechaIngreso,
        Integer idRol,
        Integer idArea,
        Integer idTurno,
        Boolean crearAcceso,
        String username) {
}
