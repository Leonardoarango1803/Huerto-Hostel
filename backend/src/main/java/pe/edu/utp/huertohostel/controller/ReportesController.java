package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/reportes")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class ReportesController {

    private final PagoRepository pagoRepository;
    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;

    public ReportesController(PagoRepository pagoRepository,
                               HabitacionRepository habitacionRepository,
                               ReservaRepository reservaRepository) {
        this.pagoRepository = pagoRepository;
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
    }

    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> resumen(
            @RequestParam(defaultValue = "6") int meses,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {

        Map<String, Object> resultado = new LinkedHashMap<>();
        List<Pago> todosPagos = pagoRepository.findAll();
        LocalDate hoy = LocalDate.now();

        // Determine mode: date range or months
        boolean usarRango = desde != null && !desde.isBlank() && hasta != null && !hasta.isBlank();
        LocalDate fechaDesde = null, fechaHasta = null;
        if (usarRango) {
            try {
                fechaDesde = LocalDate.parse(desde);
                fechaHasta = LocalDate.parse(hasta);
                if (fechaDesde.isAfter(fechaHasta)) usarRango = false;
            } catch (Exception e) {
                usarRango = false;
            }
        }

        List<Pago> pagosFiltrados;
        List<Map<String, Object>> ingresosPorPeriodo = new ArrayList<>();

        if (usarRango) {
            final LocalDate rangoDesde = fechaDesde;
            final LocalDate rangoHasta = fechaHasta;

            pagosFiltrados = todosPagos.stream()
                    .filter(p -> p.getFechaPago() != null)
                    .filter(p -> {
                        LocalDate fecha = p.getFechaPago().toLocalDate();
                        return !fecha.isBefore(rangoDesde) && !fecha.isAfter(rangoHasta);
                    })
                    .toList();

            // Daily breakdown
            for (LocalDate fecha = rangoDesde; !fecha.isAfter(rangoHasta); fecha = fecha.plusDays(1)) {
                final LocalDate f = fecha;
                BigDecimal total = pagosFiltrados.stream()
                        .filter(p -> p.getFechaPago().toLocalDate().equals(f))
                        .map(Pago::getMonto)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                Map<String, Object> dia = new LinkedHashMap<>();
                dia.put("mes", fecha.toString()); // YYYY-MM-DD for daily
                dia.put("ingresos", total);
                ingresosPorPeriodo.add(dia);
            }
        } else {
            pagosFiltrados = todosPagos;

            // Monthly breakdown
            for (int i = meses - 1; i >= 0; i--) {
                YearMonth ym = YearMonth.from(hoy).minusMonths(i);
                BigDecimal total = todosPagos.stream()
                        .filter(p -> p.getFechaPago() != null && YearMonth.from(p.getFechaPago()).equals(ym))
                        .map(Pago::getMonto)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                Map<String, Object> mes = new LinkedHashMap<>();
                mes.put("mes", ym.toString()); // YYYY-MM for monthly
                mes.put("ingresos", total);
                ingresosPorPeriodo.add(mes);
            }
        }

        resultado.put("ingresosPorMes", ingresosPorPeriodo);

        // Occupation (always current snapshot)
        long totalHabitaciones = habitacionRepository.count();
        long ocupadas = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.OCUPADA);
        long reservadas = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.RESERVADO);
        long disponibles = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
        resultado.put("totalHabitaciones", totalHabitaciones);
        resultado.put("habitacionesOcupadas", ocupadas);
        resultado.put("habitacionesReservadas", reservadas);
        resultado.put("habitacionesDisponibles", disponibles);
        resultado.put("tasaOcupacion", totalHabitaciones > 0 ? Math.round((double) ocupadas / totalHabitaciones * 100) : 0);

        // Income total: filtered when using date range, historical total otherwise
        BigDecimal ingresoTotal = pagosFiltrados.stream()
                .map(Pago::getMonto)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        resultado.put("ingresoTotal", ingresoTotal);

        // Reservas por estado (current snapshot)
        List<Reserva> todasReservas = reservaRepository.findAll();
        Map<String, Long> reservasPorEstado = todasReservas.stream()
                .collect(Collectors.groupingBy(r -> r.getEstadoReserva().name(), Collectors.counting()));
        resultado.put("reservasPorEstado", reservasPorEstado);

        return ResponseEntity.ok(resultado);
    }
}
