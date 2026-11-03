package pe.edu.utp.huertohostel.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Libera las reservas que no se usaron para que la habitacion no quede RESERVADA para siempre.
 *
 * <ul>
 *   <li>{@code PENDIENTE_ADELANTO}: no confirmo (no pago el adelanto). Se libera al llegar su dia de
 *       check-in; si se hizo el mismo dia de la llegada, se le da hasta el cierre de ese dia.</li>
 *   <li>{@code CONFIRMADA} sin estadia: el cliente pago pero no llego. Se libera al terminar su dia de
 *       check-in.</li>
 *   <li>{@code EN_CURSO}, {@code COMPLETADA} y {@code CANCELADA}: nunca se tocan.</li>
 * </ul>
 *
 * Queda {@code CANCELADA} con una nota automatica. No mueve dinero ni exige caja: un adelanto ya
 * cobrado queda registrado como pago y su devolucion o retencion es manual.
 *
 * <p>"Hoy" se calcula en la zona del hotel (America/Lima), no en la del servidor: Render corre en UTC
 * y a partir de las 19:00 de Lima el dia ya seria el siguiente.
 */
@Service
public class LiberacionReservasService {

    public static final String ZONA = "America/Lima";

    private static final Logger log = LoggerFactory.getLogger(LiberacionReservasService.class);
    private static final Duration MINIMO_ENTRE_CORRIDAS = Duration.ofMinutes(1);
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final List<EstadoReserva> ACTIVAS =
            List.of(EstadoReserva.PENDIENTE_ADELANTO, EstadoReserva.CONFIRMADA);

    private final ReservaRepository reservaRepository;
    private final HabitacionRepository habitacionRepository;
    private final EstadiaRepository estadiaRepository;
    private final Clock clock;
    private final TransactionTemplate transaccion;
    private final AtomicReference<Instant> ultimaCorrida = new AtomicReference<>(Instant.EPOCH);

    public LiberacionReservasService(ReservaRepository reservaRepository,
                                     HabitacionRepository habitacionRepository,
                                     EstadiaRepository estadiaRepository,
                                     PlatformTransactionManager transactionManager,
                                     Clock clock) {
        this.reservaRepository = reservaRepository;
        this.habitacionRepository = habitacionRepository;
        this.estadiaRepository = estadiaRepository;
        this.clock = clock;
        // Transaccion propia: quien la llama puede estar en una lectura de solo lectura.
        this.transaccion = new TransactionTemplate(transactionManager);
        this.transaccion.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Corrida programada (cada 15 minutos por defecto, en hora de Lima). */
    @Scheduled(cron = "${app.reservas.liberacion-cron:0 */15 * * * *}", zone = ZONA)
    public void liberarProgramado() {
        ejecutarSinRomper();
    }

    /**
     * Para engancharla al listar reservas y habitaciones. Una vez por minuto como maximo.
     * Respaldo de la corrida programada: un servicio gratuito de Render puede estar dormido
     * justo cuando tocaba ejecutarla.
     */
    public void liberarSiHaceFalta() {
        Instant ahora = clock.instant();
        Instant previa = ultimaCorrida.get();
        if (Duration.between(previa, ahora).compareTo(MINIMO_ENTRE_CORRIDAS) < 0) {
            return;
        }
        if (!ultimaCorrida.compareAndSet(previa, ahora)) {
            return; // otra peticion ya la esta corriendo
        }
        ejecutarSinRomper();
    }

    /** Una falla aqui nunca debe tumbar una lectura de reservas o habitaciones. */
    private void ejecutarSinRomper() {
        try {
            int liberadas = liberarVencidas();
            if (liberadas > 0) {
                log.info("Reservas liberadas automaticamente: {}", liberadas);
            }
        } catch (RuntimeException e) {
            log.warn("No se pudieron liberar las reservas vencidas: {}", e.getMessage());
        }
    }

    /** Devuelve cuantas reservas se liberaron. */
    public int liberarVencidas() {
        Integer liberadas = transaccion.execute(status -> aplicar(LocalDate.now(clock)));
        return liberadas == null ? 0 : liberadas;
    }

    int aplicar(LocalDate hoy) {
        int liberadas = 0;
        for (Reserva reserva : reservaRepository.findByEstadoReservaIn(ACTIVAS)) {
            if (!debeLiberarse(reserva, hoy)) {
                continue;
            }
            // Si ya ingreso (tiene estadia) no es una reserva sin usar, aunque el estado quedara atrasado.
            if (estadiaRepository.findByReservaIdReserva(reserva.getIdReserva()).isPresent()) {
                continue;
            }
            liberar(reserva, hoy);
            liberadas++;
        }
        return liberadas;
    }

    /** La regla, sin tocar base de datos. {@code hoy} es la fecha en la zona del hotel. */
    static boolean debeLiberarse(Reserva reserva, LocalDate hoy) {
        LocalDate checkin = reserva.getFechaCheckinPrevisto();
        if (checkin == null || reserva.getEstadoReserva() == null) {
            return false;
        }
        switch (reserva.getEstadoReserva()) {
            case PENDIENTE_ADELANTO:
                if (hoy.isAfter(checkin)) {
                    return true;
                }
                // Dia de la llegada: solo si no se registro ese mismo dia (una reserva recien creada
                // para hoy conserva su dia completo).
                return hoy.isEqual(checkin) && registradaAntesDe(reserva, checkin);
            case CONFIRMADA:
                return hoy.isAfter(checkin);
            default:
                return false;
        }
    }

    private static boolean registradaAntesDe(Reserva reserva, LocalDate dia) {
        return reserva.getFechaRegistro() != null && reserva.getFechaRegistro().toLocalDate().isBefore(dia);
    }

    private void liberar(Reserva reserva, LocalDate hoy) {
        boolean teniaAdelanto = reserva.getEstadoReserva() == EstadoReserva.CONFIRMADA;
        String nota = "Liberada automaticamente el " + hoy.format(FECHA) + ": no se registro check-in"
                + (teniaAdelanto ? " (tenia adelanto pagado; revisar su devolucion o retencion)" : "");
        String previa = reserva.getObservaciones();
        reserva.setObservaciones(previa == null || previa.isBlank() ? nota : previa + " | " + nota);
        reserva.setEstadoReserva(EstadoReserva.CANCELADA);
        reservaRepository.save(reserva);

        if (reserva.getHabitacion() != null) {
            liberarHabitacionSiNoQuedanReservas(reserva.getHabitacion());
        }
    }

    /**
     * RESERVADO -> DISPONIBLE solo si la habitacion estaba reservada y no queda otra reserva activa
     * sobre ella. Nunca toca una habitacion OCUPADA, en limpieza o en mantenimiento.
     */
    public void liberarHabitacionSiNoQuedanReservas(Habitacion habitacion) {
        if (habitacion.getEstadoOperativo() != EstadoOperativoHab.RESERVADO) {
            return;
        }
        boolean quedanActivas = !reservaRepository
                .findByHabitacionIdHabitacionAndEstadoReservaIn(habitacion.getIdHabitacion(), ACTIVAS)
                .isEmpty();
        if (!quedanActivas) {
            habitacion.setEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
            habitacionRepository.save(habitacion);
        }
    }
}
