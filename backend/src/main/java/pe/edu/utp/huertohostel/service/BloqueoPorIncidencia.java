package pe.edu.utp.huertohostel.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.EstadoIncidencia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.repository.IncidenciaMantenimientoRepository;

/**
 * Una habitacion con una incidencia abierta que la bloquea no vuelve a venderse porque se termino una limpieza, salio un
 * huesped o se cancelo una reserva: sigue en MANTENIMIENTO hasta que la incidencia se resuelva o se libere el bloqueo.
 * Quienes devuelven una habitacion al uso consultan aqui en vez de pasarla a DISPONIBLE directamente.
 */
@Component
@Transactional(readOnly = true)
public class BloqueoPorIncidencia {

    private final IncidenciaMantenimientoRepository incidenciaRepository;

    public BloqueoPorIncidencia(IncidenciaMantenimientoRepository incidenciaRepository) {
        this.incidenciaRepository = incidenciaRepository;
    }

    public boolean hayBloqueo(Integer idHabitacion) {
        return idHabitacion != null && incidenciaRepository
                .existsByHabitacionIdHabitacionAndBloqueaHabitacionTrueAndEstadoIn(idHabitacion, EstadoIncidencia.ABIERTAS);
    }

    /** MANTENIMIENTO si una incidencia abierta bloquea la habitacion; si no, el estado normal que le tocaba. */
    public EstadoOperativoHab estadoAlLiberar(Habitacion habitacion, EstadoOperativoHab normal) {
        return hayBloqueo(habitacion.getIdHabitacion()) ? EstadoOperativoHab.MANTENIMIENTO : normal;
    }
}
