package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.NuevaReservaRequest;
import pe.edu.utp.huertohostel.dto.NuevoAdelantoRequest;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.entity.CanalReserva;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ReservaService {

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final EstadiaRepository estadiaRepository;
    private final ClienteRepository clienteRepository;
    private final PagoRepository pagoRepository;

    public ReservaService(ReservaRepository reservaRepository,
                          HabitacionRepository habitacionRepository,
                          EstadiaRepository estadiaRepository,
                          ClienteRepository clienteRepository,
                          PagoRepository pagoRepository) {
        this.reservaRepository = reservaRepository;
        this.habitacionRepository = habitacionRepository;
        this.estadiaRepository = estadiaRepository;
        this.clienteRepository = clienteRepository;
        this.pagoRepository = pagoRepository;
    }

    public List<Reserva> listarTodas() {
        return reservaRepository.findAll();
    }

    public Reserva obtenerPorId(@NonNull Integer id) {
        return reservaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reserva no encontrada con id: " + id));
    }

    @Transactional
    public Reserva registrar(NuevaReservaRequest req) {
        Cliente cliente = clienteRepository.findById(req.getIdCliente())
                .orElseThrow(() -> new EntityNotFoundException("Cliente no encontrado: " + req.getIdCliente()));
        Habitacion habitacion = habitacionRepository.findById(req.getIdHabitacion())
                .orElseThrow(() -> new EntityNotFoundException("Habitacion no encontrada: " + req.getIdHabitacion()));

        LocalDate checkin = req.getFechaCheckinPrevisto();
        LocalDate checkout = req.getFechaCheckoutPrevisto();
        long noches = ChronoUnit.DAYS.between(checkin, checkout);
        if (noches <= 0) {
            throw new IllegalArgumentException("La fecha de checkout debe ser posterior al checkin.");
        }

        List<Reserva> conflictos = reservaRepository.findConflictos(
                habitacion.getIdHabitacion(),
                checkin,
                checkout,
                Arrays.asList(EstadoReserva.CANCELADA, EstadoReserva.COMPLETADA)
        );
        if (!conflictos.isEmpty()) {
            throw new IllegalStateException("La habitacion ya tiene reservas en conflicto para las fechas indicadas.");
        }

        BigDecimal precioNoche = habitacion.getTipoHabitacion().getPrecioNoche();
        BigDecimal montoTotal = precioNoche.multiply(BigDecimal.valueOf(noches));

        Reserva reserva = new Reserva();
        reserva.setCliente(cliente);
        reserva.setHabitacion(habitacion);
        reserva.setFechaCheckinPrevisto(checkin);
        reserva.setFechaCheckoutPrevisto(checkout);
        reserva.setNumNoches((short) noches);
        reserva.setMontoAlojamientoTotal(montoTotal);
        reserva.setCanalReserva(req.getCanalReserva() != null ? req.getCanalReserva() : CanalReserva.PRESENCIAL);
        reserva.setObservaciones(req.getObservaciones());
        reserva.setEstadoReserva(EstadoReserva.PENDIENTE_ADELANTO);
        reserva.setFechaRegistro(LocalDateTime.now());

        Reserva guardada = reservaRepository.save(reserva);

        habitacion.setEstadoOperativo(EstadoOperativoHab.RESERVADO);
        habitacionRepository.save(habitacion);

        return guardada;
    }

    @Transactional
    public Reserva cambiarEstado(@NonNull Integer id, EstadoReserva nuevoEstado) {
        Reserva reserva = obtenerPorId(id);
        reserva.setEstadoReserva(nuevoEstado);
        if (nuevoEstado == EstadoReserva.CANCELADA) {
            Habitacion habitacion = Objects.requireNonNull(reserva.getHabitacion());
            habitacion.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
            habitacionRepository.save(habitacion);
        }
        return reservaRepository.save(reserva);
    }

    @Transactional
    public Pago registrarAdelanto(@NonNull Integer idReserva, NuevoAdelantoRequest req) {
        Reserva reserva = obtenerPorId(idReserva);

        Pago pago = new Pago();
        pago.setReserva(reserva);
        pago.setMonto(req.getMonto());
        pago.setMetodoPago(MetodoPago.valueOf(req.getMetodoPago()));
        pago.setConcepto(ConceptoPago.ADELANTO_RESERVA);
        pago.setFechaPago(LocalDateTime.now());

        if (reserva.getEstadoReserva() == EstadoReserva.PENDIENTE_ADELANTO) {
            reserva.setEstadoReserva(EstadoReserva.CONFIRMADA);
            reservaRepository.save(reserva);
        }

        return pagoRepository.save(pago);
    }

    @Transactional
    public Estadia realizarCheckin(@NonNull Integer idReserva) {
        Reserva reserva = obtenerPorId(idReserva);

        estadiaRepository.findByReservaIdReserva(idReserva).ifPresent(e -> {
            throw new IllegalStateException("Esta reserva ya tiene un check-in registrado (Estadía #" + e.getIdEstadia() + ").");
        });

        Habitacion habitacionCheckin = Objects.requireNonNull(reserva.getHabitacion());

        if (reserva.getEstadoReserva() == EstadoReserva.PENDIENTE_ADELANTO
                || reserva.getEstadoReserva() == EstadoReserva.CONFIRMADA) {
            reserva.setEstadoReserva(EstadoReserva.EN_CURSO);
            reservaRepository.save(reserva);
        }

        Estadia estadia = new Estadia();
        estadia.setReserva(reserva);
        estadia.setHabitacion(habitacionCheckin);
        estadia.setEstadoEstadia(EstadoEstadia.EN_CURSO);
        estadia.setFechaCheckinReal(LocalDateTime.now());

        habitacionCheckin.setEstadoOperativo(EstadoOperativoHab.OCUPADA);
        habitacionRepository.save(habitacionCheckin);

        return estadiaRepository.save(estadia);
    }

    @Transactional
    public void cancelarReservaPorHabitacion(@NonNull Integer idHabitacion) {
        List<Reserva> activas = reservaRepository.findByHabitacionIdHabitacionAndEstadoReservaIn(
                idHabitacion,
                Arrays.asList(EstadoReserva.PENDIENTE_ADELANTO, EstadoReserva.CONFIRMADA)
        );
        for (Reserva r : activas) {
            r.setEstadoReserva(EstadoReserva.CANCELADA);
            reservaRepository.save(r);
        }
        habitacionRepository.findById(idHabitacion).ifPresent(h -> {
            if (h.getEstadoOperativo() == EstadoOperativoHab.RESERVADO) {
                h.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
                habitacionRepository.save(h);
            }
        });
    }
}
