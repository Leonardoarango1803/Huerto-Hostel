package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;

@Service
@Transactional(readOnly = true)
public class EstadiaService {

    private final EstadiaRepository estadiaRepository;
    private final ConsumoEstadiaRepository consumoEstadiaRepository;
    private final PagoRepository pagoRepository;
    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;

    public EstadiaService(EstadiaRepository estadiaRepository,
                          ConsumoEstadiaRepository consumoEstadiaRepository,
                          PagoRepository pagoRepository,
                          HabitacionRepository habitacionRepository,
                          ReservaRepository reservaRepository) {
        this.estadiaRepository = estadiaRepository;
        this.consumoEstadiaRepository = consumoEstadiaRepository;
        this.pagoRepository = pagoRepository;
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
    }

    public List<Estadia> listarTodas() {
        return estadiaRepository.findAll();
    }

    public List<Estadia> listarPorEstado(EstadoEstadia estado) {
        return estadiaRepository.findByEstadoEstadia(estado);
    }

    public Estadia obtenerPorId(@NonNull Integer id) {
        return estadiaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Estadia no encontrada con id: " + id));
    }

    public List<ConsumoEstadia> listarConsumos(@NonNull Integer idEstadia) {
        obtenerPorId(idEstadia);
        return consumoEstadiaRepository.findByEstadiaIdEstadia(idEstadia);
    }

    public Map<String, Object> resumenCheckout() {
        LocalDate hoy = LocalDate.now();
        List<Estadia> activas = estadiaRepository.findByEstadoEstadia(EstadoEstadia.EN_CURSO);

        long salidaHoy = activas.stream()
                .filter(e -> hoy.equals(e.getReserva().getFechaCheckoutPrevisto()))
                .count();

        BigDecimal pendienteCobro = activas.stream()
                .map(e -> calcularSaldo(Objects.requireNonNull(e.getIdEstadia())))
                .filter(s -> s.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal liquidadoHoy = pagoRepository.findAll().stream()
                .filter(p -> p.getConcepto() == ConceptoPago.LIQUIDACION_CHECKOUT
                        && p.getFechaPago() != null
                        && p.getFechaPago().toLocalDate().equals(hoy))
                .map(pe.edu.utp.huertohostel.entity.Pago::getMonto)
                .filter(m -> m != null)
                .map(Objects::requireNonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long aCuartoLimpieza = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);

        Map<String, Object> result = new HashMap<>();
        result.put("salidaHoy", salidaHoy);
        result.put("pendienteCobro", pendienteCobro);
        result.put("liquidadoHoy", liquidadoHoy);
        result.put("aCuartoLimpieza", aCuartoLimpieza);
        return result;
    }

    public BigDecimal calcularSaldo(@NonNull Integer idEstadia) {
        Estadia estadia = obtenerPorId(idEstadia);
        Reserva reserva = Objects.requireNonNull(estadia.getReserva());
        Integer idReserva = reserva.getIdReserva();

        BigDecimal montoAlojamiento = reserva.getMontoAlojamientoTotal() != null
                ? reserva.getMontoAlojamientoTotal()
                : BigDecimal.ZERO;

        BigDecimal sumConsumos = consumoEstadiaRepository.sumTotalByEstadia(idEstadia);
        if (sumConsumos == null) sumConsumos = BigDecimal.ZERO;
        BigDecimal sumPagos = pagoRepository.sumMontoByReservaOrEstadia(idEstadia, idReserva);
        if (sumPagos == null) sumPagos = BigDecimal.ZERO;

        return montoAlojamiento.add(sumConsumos).subtract(sumPagos);
    }

    public Map<String, Object> obtenerSaldoDetallado(@NonNull Integer idEstadia) {
        Estadia estadia = obtenerPorId(idEstadia);
        Reserva reserva = Objects.requireNonNull(estadia.getReserva());
        Integer idReserva = reserva.getIdReserva();

        BigDecimal alojamiento = reserva.getMontoAlojamientoTotal() != null
                ? reserva.getMontoAlojamientoTotal() : BigDecimal.ZERO;

        BigDecimal consumos = consumoEstadiaRepository.sumTotalByEstadia(idEstadia);
        if (consumos == null) consumos = BigDecimal.ZERO;
        BigDecimal pagos = pagoRepository.sumMontoByReservaOrEstadia(idEstadia, idReserva);
        if (pagos == null) pagos = BigDecimal.ZERO;

        BigDecimal saldo = alojamiento.add(consumos).subtract(pagos);

        Map<String, Object> result = new HashMap<>();
        result.put("idEstadia", idEstadia);
        result.put("totalAlojamiento", alojamiento);
        result.put("totalConsumos", consumos);
        result.put("totalPagos", pagos);
        result.put("saldoPendiente", saldo);
        return result;
    }

    @Transactional
    public ConsumoEstadia registrarConsumo(@NonNull Integer idEstadia, ConsumoEstadia consumo) {
        Estadia estadia = obtenerPorId(idEstadia);
        consumo.setEstadia(estadia);
        BigDecimal total = consumo.getPrecioUnitario().multiply(
                BigDecimal.valueOf(consumo.getCantidad()));
        consumo.setTotalConsumo(total);
        consumo.setFechaRegistro(LocalDateTime.now());
        ConsumoEstadia saved = consumoEstadiaRepository.save(consumo);
        return consumoEstadiaRepository.findById(saved.getIdConsumo()).orElse(saved);
    }

    @Transactional
    public Estadia realizarCheckout(@NonNull Integer idEstadia, Pago pagoFinal) {
        Estadia estadia = obtenerPorId(idEstadia);

        if (pagoFinal != null && pagoFinal.getMonto() != null
                && pagoFinal.getMonto().compareTo(BigDecimal.ZERO) > 0) {
            pagoFinal.setEstadia(estadia);
            pagoFinal.setFechaPago(LocalDateTime.now());
            pagoRepository.save(pagoFinal);
        }

        BigDecimal saldo = calcularSaldo(idEstadia);
        if (saldo.compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalStateException("No se puede realizar el checkout. Saldo pendiente: " + saldo);
        }

        estadia.setEstadoEstadia(EstadoEstadia.FINALIZADA);
        estadia.setFechaCheckoutReal(LocalDateTime.now());
        estadiaRepository.save(estadia);

        Reserva reservaCheckout = Objects.requireNonNull(estadia.getReserva());
        reservaCheckout.setEstadoReserva(EstadoReserva.COMPLETADA);
        reservaRepository.save(reservaCheckout);

        Habitacion habitacionCheckout = Objects.requireNonNull(estadia.getHabitacion());
        habitacionCheckout.setEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        habitacionRepository.save(habitacionCheckout);

        return estadia;
    }
}
