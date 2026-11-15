package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.NuevaHabitacionRequest;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Catalogo de habitaciones del administrador (RF13): editar numero, piso, tipo y descripcion, y dar de baja o de alta.
 * La tarifa y la capacidad viven en el tipo de habitacion (Configuracion).
 *
 * <ul>
 *   <li>Cambiar el tipo no toca las reservas ya hechas: conservan el precio pactado; la nueva tarifa rige para las
 *   reservas que se creen o modifiquen despues.</li>
 *   <li>Dar de baja exige que no haya nadie adentro ni reservas vigentes (pendientes, confirmadas o en curso): primero
 *   se mueven o cancelan. Una habitacion de baja no se ofrece en la web, en el calendario ni al reservar.</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class GestionHabitacionesService {

    private static final List<EstadoReserva> VIGENTES =
            List.of(EstadoReserva.PENDIENTE_ADELANTO, EstadoReserva.CONFIRMADA, EstadoReserva.EN_CURSO);

    private final HabitacionRepository habitacionRepository;
    private final TipoHabitacionRepository tipoHabitacionRepository;
    private final ReservaRepository reservaRepository;
    private final AuditoriaGestionService auditoria;

    public GestionHabitacionesService(HabitacionRepository habitacionRepository,
                                      TipoHabitacionRepository tipoHabitacionRepository,
                                      ReservaRepository reservaRepository,
                                      AuditoriaGestionService auditoria) {
        this.habitacionRepository = habitacionRepository;
        this.tipoHabitacionRepository = tipoHabitacionRepository;
        this.reservaRepository = reservaRepository;
        this.auditoria = auditoria;
    }

    @Transactional
    public Habitacion editar(@NonNull Integer id, NuevaHabitacionRequest req) {
        Habitacion h = habitacionRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada con id: " + id));
        List<String> cambios = new ArrayList<>();

        if (req.getNumero() != null) {
            String numero = req.getNumero().trim();
            if (numero.isEmpty() || numero.length() > 10) {
                throw new IllegalArgumentException("El número de habitación debe tener entre 1 y 10 caracteres.");
            }
            if (!numero.equals(h.getNumero())) {
                if (habitacionRepository.existsByNumero(numero)) {
                    throw new IllegalStateException("Ya existe una habitación con el número " + numero + ".");
                }
                cambios.add("número " + h.getNumero() + " → " + numero);
                h.setNumero(numero);
            }
        }
        if (req.getPiso() != null && !req.getPiso().equals(h.getPiso())) {
            if (req.getPiso() < 0 || req.getPiso() > 50) {
                throw new IllegalArgumentException("Revisa el piso.");
            }
            cambios.add("piso " + h.getPiso() + " → " + req.getPiso());
            h.setPiso(req.getPiso());
        }
        if (req.getIdTipoHabitacion() != null
                && (h.getTipoHabitacion() == null || !req.getIdTipoHabitacion().equals(h.getTipoHabitacion().getIdTipoHabitacion()))) {
            TipoHabitacion tipo = tipoHabitacionRepository.findById(req.getIdTipoHabitacion())
                    .orElseThrow(() -> new EntityNotFoundException("Tipo de habitacion no encontrado: " + req.getIdTipoHabitacion()));
            if (Boolean.FALSE.equals(tipo.getEstado())) {
                throw new IllegalStateException("Ese tipo de habitación está desactivado.");
            }
            cambios.add("tipo " + (h.getTipoHabitacion() != null ? h.getTipoHabitacion().getNombre() : "—") + " → " + tipo.getNombre());
            h.setTipoHabitacion(tipo);
        }
        if (req.getDescripcion() != null) {
            String d = req.getDescripcion().trim();
            String valor = d.isEmpty() ? null : d;
            if (!Objects.equals(valor, h.getDescripcion())) {
                h.setDescripcion(valor);
                cambios.add("descripción");
            }
        }
        if (cambios.isEmpty()) {
            return h;
        }
        Habitacion guardada = habitacionRepository.save(h);
        auditoria.registrar("HABITACION_EDITADA", null, "Hab. " + guardada.getNumero() + ": " + String.join("; ", cambios));
        return guardada;
    }

    @Transactional
    public Habitacion cambiarActiva(@NonNull Integer id, boolean activa) {
        Habitacion h = habitacionRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada con id: " + id));
        boolean actual = !Boolean.FALSE.equals(h.getEstado());
        if (actual == activa) {
            return h;
        }
        if (!activa) {
            if (h.getEstadoOperativo() == EstadoOperativoHab.OCUPADA || h.getEstadoOperativo() == EstadoOperativoHab.RESERVADO) {
                throw new IllegalStateException("La habitación " + h.getNumero() + " está ocupada o reservada para hoy: no se puede dar de baja.");
            }
            List<Reserva> vigentes = reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(id, VIGENTES);
            if (!vigentes.isEmpty()) {
                throw new IllegalStateException("La habitación " + h.getNumero() + " tiene " + vigentes.size()
                        + " reserva(s) vigente(s) (por ejemplo RES-" + vigentes.get(0).getIdReserva()
                        + "). Muévelas a otra habitación o cancélalas antes de darla de baja.");
            }
        }
        h.setEstado(activa);
        Habitacion guardada = habitacionRepository.save(h);
        auditoria.registrar(activa ? "HABITACION_ALTA" : "HABITACION_BAJA", null, "Hab. " + guardada.getNumero());
        return guardada;
    }
}
