package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.EditarReservaRequest;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Modificar una reserva antes del check-in (RF05): huesped, habitacion, fechas y observaciones.
 *
 * Reglas:
 * <ul>
 *   <li>Solo reservas PENDIENTE_ADELANTO o CONFIRMADA sin estadia: lo demas ya ingreso, salio o se cancelo.</li>
 *   <li>Cambiar de habitacion o de fechas bloquea las filas de las habitaciones involucradas (en orden de id, para
 *   que dos ediciones cruzadas no se esperen entre si) y revisa el cruce sin contar la propia reserva. La regla
 *   ex_reserva_sin_cruce de la base (V29) respalda lo mismo.</li>
 *   <li>El total se recalcula con la tarifa vigente solo si cambian la habitacion o las fechas; si solo cambian las
 *   observaciones o el huesped, el precio pactado se respeta.</li>
 *   <li>El huesped solo cambia si la reserva aun no tiene pagos: un adelanto es de quien lo pago.</li>
 *   <li>La nueva llegada no puede quedar en el pasado (salvo que no se toque).</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class EdicionReservaService {

    private static final List<EstadoReserva> NO_OCUPAN = List.of(EstadoReserva.CANCELADA, EstadoReserva.COMPLETADA);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final ClienteRepository clienteRepository;
    private final EstadiaRepository estadiaRepository;
    private final PagoRepository pagoRepository;
    private final LiberacionReservasService liberacionReservasService;
    private final AuditoriaGestionService auditoria;
    private final Clock clock;

    public EdicionReservaService(ReservaRepository reservaRepository,
                                 HabitacionRepository habitacionRepository,
                                 ClienteRepository clienteRepository,
                                 EstadiaRepository estadiaRepository,
                                 PagoRepository pagoRepository,
                                 LiberacionReservasService liberacionReservasService,
                                 AuditoriaGestionService auditoria,
                                 Clock clock) {
        this.reservaRepository = reservaRepository;
        this.habitacionRepository = habitacionRepository;
        this.clienteRepository = clienteRepository;
        this.estadiaRepository = estadiaRepository;
        this.pagoRepository = pagoRepository;
        this.liberacionReservasService = liberacionReservasService;
        this.auditoria = auditoria;
        this.clock = clock;
    }

    @Transactional
    public Reserva editar(@NonNull Integer idReserva, EditarReservaRequest req) {
        Reserva reserva = reservaRepository.findById(idReserva)
                .orElseThrow(() -> new EntityNotFoundException("Reserva no encontrada con id: " + idReserva));
        EstadoReserva estado = reserva.getEstadoReserva();
        if (estado != EstadoReserva.PENDIENTE_ADELANTO && estado != EstadoReserva.CONFIRMADA) {
            throw new IllegalStateException("Solo se puede modificar una reserva pendiente o confirmada que aún no ingresó.");
        }
        if (estadiaRepository.findByReservaIdReserva(idReserva).isPresent()) {
            throw new IllegalStateException("Esta reserva ya tiene check-in: los cambios se hacen sobre la estadía.");
        }

        Habitacion anterior = Objects.requireNonNull(reserva.getHabitacion());
        LocalDate checkinAntes = reserva.getFechaCheckinPrevisto();
        LocalDate checkoutAntes = reserva.getFechaCheckoutPrevisto();

        Integer idHabNueva = req.getIdHabitacion() != null ? req.getIdHabitacion() : anterior.getIdHabitacion();
        LocalDate checkin = req.getFechaCheckinPrevisto() != null ? req.getFechaCheckinPrevisto() : checkinAntes;
        LocalDate checkout = req.getFechaCheckoutPrevisto() != null ? req.getFechaCheckoutPrevisto() : checkoutAntes;

        boolean cambiaHabitacion = !idHabNueva.equals(anterior.getIdHabitacion());
        boolean cambianFechas = !checkin.equals(checkinAntes) || !checkout.equals(checkoutAntes);
        List<String> cambios = new ArrayList<>();

        // Huesped
        if (req.getIdCliente() != null && !req.getIdCliente().equals(reserva.getCliente().getIdCliente())) {
            if (!pagoRepository.findDeReservaOSuEstadia(idReserva).isEmpty()) {
                throw new IllegalStateException("La reserva ya tiene pagos registrados: no se puede pasar a otro huésped. "
                        + "Cancélala y crea una nueva a nombre del otro huésped.");
            }
            Cliente nuevo = clienteRepository.findById(req.getIdCliente())
                    .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado: " + req.getIdCliente()));
            cambios.add("huésped " + nombre(reserva.getCliente()) + " → " + nombre(nuevo));
            reserva.setCliente(nuevo);
        }

        Habitacion nueva = anterior;
        if (cambiaHabitacion || cambianFechas) {
            long noches = ChronoUnit.DAYS.between(checkin, checkout);
            if (noches <= 0) {
                throw new IllegalArgumentException("La fecha de salida debe ser posterior a la de llegada.");
            }
            if (noches > Short.MAX_VALUE) {
                throw new IllegalArgumentException("La estadía es demasiado larga.");
            }
            LocalDate hoy = LocalDate.now(clock);
            if (!checkin.equals(checkinAntes) && checkin.isBefore(hoy)) {
                throw new IllegalArgumentException("La nueva fecha de llegada no puede ser anterior a hoy.");
            }

            // Bloqueo en orden de id: dos ediciones que intercambian habitaciones no se quedan esperando una a otra.
            Integer idA = anterior.getIdHabitacion();
            Integer primero = Math.min(idA, idHabNueva);
            Integer segundo = Math.max(idA, idHabNueva);
            Habitacion bloqueada1 = habitacionRepository.findByIdParaActualizar(primero)
                    .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada: " + primero));
            Habitacion bloqueada2 = primero.equals(segundo) ? bloqueada1 : habitacionRepository.findByIdParaActualizar(segundo)
                    .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada: " + segundo));
            nueva = idHabNueva.equals(bloqueada1.getIdHabitacion()) ? bloqueada1 : bloqueada2;
            if (cambiaHabitacion && Boolean.FALSE.equals(nueva.getEstado())) {
                throw new IllegalStateException("La habitación " + nueva.getNumero() + " está dada de baja.");
            }

            List<Reserva> conflictos = reservaRepository.findConflictosExcepto(
                    nueva.getIdHabitacion(), idReserva, checkin, checkout, NO_OCUPAN);
            if (!conflictos.isEmpty()) {
                Reserva otra = conflictos.get(0);
                throw new IllegalStateException("La habitación " + nueva.getNumero() + " ya está reservada del "
                        + otra.getFechaCheckinPrevisto().format(FECHA) + " al "
                        + otra.getFechaCheckoutPrevisto().format(FECHA) + " (RES-" + otra.getIdReserva() + ").");
            }

            BigDecimal totalAntes = reserva.getMontoAlojamientoTotal();
            BigDecimal total = nueva.getTipoHabitacion().getPrecioNoche().multiply(BigDecimal.valueOf(noches));
            if (cambiaHabitacion) {
                cambios.add("habitación " + anterior.getNumero() + " → " + nueva.getNumero());
            }
            if (cambianFechas) {
                cambios.add("fechas " + checkinAntes.format(FECHA) + "–" + checkoutAntes.format(FECHA)
                        + " → " + checkin.format(FECHA) + "–" + checkout.format(FECHA));
            }
            if (totalAntes == null || totalAntes.compareTo(total) != 0) {
                cambios.add("total S/ " + totalAntes + " → S/ " + total);
            }
            reserva.setHabitacion(nueva);
            reserva.setFechaCheckinPrevisto(checkin);
            reserva.setFechaCheckoutPrevisto(checkout);
            reserva.setNumNoches((short) noches);
            reserva.setMontoAlojamientoTotal(total);
        }

        if (req.getObservaciones() != null) {
            String obs = req.getObservaciones().trim();
            String valor = obs.isEmpty() ? null : obs;
            if (!Objects.equals(valor, reserva.getObservaciones())) {
                reserva.setObservaciones(valor);
                cambios.add("observaciones");
            }
        }

        if (cambios.isEmpty()) {
            return reserva;
        }
        Reserva guardada = reservaRepository.save(reserva);

        if (cambiaHabitacion || cambianFechas) {
            // La habitacion que se deja (o la misma, si la llegada se movio a otro dia) vuelve a DISPONIBLE si ya
            // nadie llega hoy; la nueva queda RESERVADO si la llegada es hoy y esta libre. Misma regla que al crear.
            liberacionReservasService.liberarHabitacionSiNoQuedanReservas(anterior);
            if (nueva.getEstadoOperativo() == EstadoOperativoHab.DISPONIBLE && !checkin.isAfter(LocalDate.now(clock))) {
                nueva.setEstadoOperativo(EstadoOperativoHab.RESERVADO);
                habitacionRepository.save(nueva);
            }
        }

        auditoria.registrar("RESERVA_MODIFICADA", null, "RES-" + idReserva + ": " + String.join("; ", cambios));
        return guardada;
    }

    private static String nombre(Cliente c) {
        return ((c.getNombres() == null ? "" : c.getNombres()) + " " + (c.getApellidos() == null ? "" : c.getApellidos())).trim();
    }
}
