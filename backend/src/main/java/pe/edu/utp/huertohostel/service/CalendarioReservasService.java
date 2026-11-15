package pe.edu.utp.huertohostel.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.Habitacion;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Disponibilidad por fechas en forma de calendario (RF04): todas las habitaciones activas y las reservas que tocan
 * el rango. Dos consultas, sin importar cuantos dias o habitaciones haya. El frontend dibuja la rejilla
 * habitacion x dia y tambien lo usa para saber que habitaciones estan libres al elegir fechas en un formulario.
 *
 * Las canceladas no ocupan y no se devuelven. Las completadas si (son historia de dias pasados).
 */
@Service
@Transactional(readOnly = true)
public class CalendarioReservasService {

    /** Mas de dos meses en pantalla ya no se lee; tambien acota la consulta. */
    static final int MAXIMO_DIAS = 62;
    static final int DIAS_POR_DEFECTO = 14;

    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final Clock clock;

    public CalendarioReservasService(HabitacionRepository habitacionRepository,
                                     ReservaRepository reservaRepository,
                                     Clock clock) {
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
        this.clock = clock;
    }

    /** @param hasta exclusivo: la ultima noche que se muestra es hasta - 1. */
    public Map<String, Object> calendario(LocalDate desde, LocalDate hasta) {
        LocalDate inicio = desde != null ? desde : LocalDate.now(clock);
        LocalDate fin = hasta != null ? hasta : inicio.plusDays(DIAS_POR_DEFECTO);
        long dias = ChronoUnit.DAYS.between(inicio, fin);
        if (dias <= 0) {
            throw new IllegalArgumentException("La fecha final debe ser posterior a la inicial.");
        }
        if (dias > MAXIMO_DIAS) {
            throw new IllegalArgumentException("El calendario muestra hasta " + MAXIMO_DIAS + " días a la vez.");
        }

        List<Map<String, Object>> habitaciones = habitacionRepository.findAll().stream()
                .filter(h -> !Boolean.FALSE.equals(h.getEstado()))
                .sorted(Comparator.comparing(CalendarioReservasService::ordenNumero).thenComparing(Habitacion::getNumero))
                .map(CalendarioReservasService::habitacion)
                .toList();

        List<Map<String, Object>> reservas = reservaRepository
                .findEnRango(inicio, fin, List.of(EstadoReserva.CANCELADA)).stream()
                .sorted(Comparator.comparing(Reserva::getFechaCheckinPrevisto))
                .map(CalendarioReservasService::reserva)
                .toList();

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("desde", inicio);
        r.put("hasta", fin);
        r.put("hoy", LocalDate.now(clock));
        r.put("habitaciones", habitaciones);
        r.put("reservas", reservas);
        return r;
    }

    private static int ordenNumero(Habitacion h) {
        String digitos = h.getNumero() == null ? "" : h.getNumero().replaceAll("\\D", "");
        try {
            return digitos.isEmpty() ? Integer.MAX_VALUE : Integer.parseInt(digitos);
        } catch (NumberFormatException e) {
            return Integer.MAX_VALUE;
        }
    }

    private static Map<String, Object> habitacion(Habitacion h) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idHabitacion", h.getIdHabitacion());
        m.put("numero", h.getNumero());
        m.put("piso", h.getPiso());
        m.put("estadoOperativo", h.getEstadoOperativo());
        m.put("idTipoHabitacion", h.getTipoHabitacion() != null ? h.getTipoHabitacion().getIdTipoHabitacion() : null);
        m.put("tipo", h.getTipoHabitacion() != null ? h.getTipoHabitacion().getNombre() : null);
        m.put("precioNoche", h.getTipoHabitacion() != null ? h.getTipoHabitacion().getPrecioNoche() : null);
        return m;
    }

    private static Map<String, Object> reserva(Reserva r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idReserva", r.getIdReserva());
        m.put("idHabitacion", r.getHabitacion().getIdHabitacion());
        m.put("huesped", ((r.getCliente().getNombres() == null ? "" : r.getCliente().getNombres()) + " "
                + (r.getCliente().getApellidos() == null ? "" : r.getCliente().getApellidos())).trim());
        m.put("checkin", r.getFechaCheckinPrevisto());
        m.put("checkout", r.getFechaCheckoutPrevisto());
        m.put("noches", r.getNumNoches());
        m.put("estado", r.getEstadoReserva());
        m.put("canal", r.getCanalReserva());
        return m;
    }
}
