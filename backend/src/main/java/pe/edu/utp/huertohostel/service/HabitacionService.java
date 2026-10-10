package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.NuevaHabitacionRequest;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class HabitacionService {

    private final HabitacionRepository habitacionRepository;
    private final TipoHabitacionRepository tipoHabitacionRepository;

    public HabitacionService(HabitacionRepository habitacionRepository,
                             TipoHabitacionRepository tipoHabitacionRepository) {
        this.habitacionRepository = habitacionRepository;
        this.tipoHabitacionRepository = tipoHabitacionRepository;
    }

    public List<Habitacion> listarTodas() {
        return habitacionRepository.findAll();
    }

    public Habitacion obtenerPorId(@NonNull Integer id) {
        return habitacionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada con id: " + id));
    }

    public List<Habitacion> listarPorEstado(EstadoOperativoHab estado) {
        return habitacionRepository.findByEstadoOperativo(estado);
    }

    @Transactional
    public Habitacion crear(NuevaHabitacionRequest req) {
        TipoHabitacion tipo = tipoHabitacionRepository.findById(req.getIdTipoHabitacion())
                .orElseThrow(() -> new EntityNotFoundException("Tipo de habitacion no encontrado: " + req.getIdTipoHabitacion()));

        if (habitacionRepository.existsByNumero(req.getNumero())) {
            throw new IllegalStateException("Ya existe una habitacion con el numero: " + req.getNumero());
        }

        Habitacion habitacion = new Habitacion();
        habitacion.setTipoHabitacion(tipo);
        habitacion.setNumero(req.getNumero());
        habitacion.setPiso(req.getPiso());
        habitacion.setDescripcion(req.getDescripcion());
        habitacion.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
        habitacion.setEstado(true);
        return habitacionRepository.save(habitacion);
    }

    @Transactional
    public Habitacion cambiarEstado(@NonNull Integer id, EstadoOperativoHab nuevoEstado) {
        Habitacion habitacion = obtenerPorId(id);
        habitacion.setEstadoOperativo(nuevoEstado);
        return habitacionRepository.save(habitacion);
    }

    public long contarPorEstado(EstadoOperativoHab estado) {
        return habitacionRepository.countByEstadoOperativo(estado);
    }
}
