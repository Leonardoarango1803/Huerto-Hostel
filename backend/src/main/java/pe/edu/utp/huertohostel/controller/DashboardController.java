package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.CategoriaProducto;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.ConsumoEstadiaRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;
import pe.edu.utp.huertohostel.service.InventarioService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@PreAuthorize(Roles.SOLO_ADMIN)
public class DashboardController {

    private static final List<EstadoReserva> NO_VIGENTES =
            List.of(EstadoReserva.CANCELADA, EstadoReserva.COMPLETADA);

    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final ClienteRepository clienteRepository;
    private final ConsumoEstadiaRepository consumoEstadiaRepository;
    private final PagoRepository pagoRepository;
    private final InventarioService inventarioService;

    public DashboardController(
            HabitacionRepository habitacionRepository,
            ReservaRepository reservaRepository,
            ClienteRepository clienteRepository,
            ConsumoEstadiaRepository consumoEstadiaRepository,
            PagoRepository pagoRepository,
            InventarioService inventarioService) {
        this.inventarioService = inventarioService;
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
        this.clienteRepository = clienteRepository;
        this.consumoEstadiaRepository = consumoEstadiaRepository;
        this.pagoRepository = pagoRepository;
    }

    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> resumen() {
        long totalHabitaciones = habitacionRepository.count();
        long disponibles = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
        long ocupadas = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.OCUPADA);
        long pendienteLimpieza = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        long enLimpieza = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.EN_LIMPIEZA);
        long mantenimiento = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.MANTENIMIENTO);
        long reservadas = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.RESERVADO);
        long totalReservas = reservaRepository.countByEstadoReservaNotIn(NO_VIGENTES);
        long totalClientes = clienteRepository.count();

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("totalHabitaciones", totalHabitaciones);
        resumen.put("disponibles", disponibles);
        resumen.put("ocupadas", ocupadas);
        resumen.put("pendienteLimpieza", pendienteLimpieza);
        resumen.put("enLimpieza", enLimpieza);
        resumen.put("mantenimiento", mantenimiento);
        resumen.put("reservadas", reservadas);
        resumen.put("totalReservas", totalReservas);
        resumen.put("totalClientes", totalClientes);

        // Series para los graficos del dashboard gerencial (RF36).
        resumen.put("estadoHabitaciones", List.of(
                serie("Disponibles", disponibles),
                serie("Ocupadas", ocupadas),
                serie("Reservadas", reservadas),
                serie("Limpieza", pendienteLimpieza + enLimpieza),
                serie("Mantenimiento", mantenimiento)));

        resumen.put("inventario", inventarioService.alertas());
        resumen.put("ingresosPorArea", ingresosPorArea());
        resumen.put("ingresosUltimos7Dias", ingresosUltimos7Dias());

        return ResponseEntity.ok(resumen);
    }

    private Map<String, Object> serie(String nombre, Number valor) {
        Map<String, Object> punto = new HashMap<>();
        punto.put("nombre", nombre);
        punto.put("valor", valor);
        return punto;
    }

    /** Alojamiento frente a lo consumido en cocina, bar y venta directa. */
    private List<Map<String, Object>> ingresosPorArea() {
        BigDecimal alojamiento = reservaRepository.sumAlojamiento(List.of(EstadoReserva.CANCELADA));
        if (alojamiento == null) alojamiento = BigDecimal.ZERO;

        Map<CategoriaProducto, BigDecimal> porCategoria = new HashMap<>();
        for (Object[] fila : consumoEstadiaRepository.sumTotalPorCategoria()) {
            porCategoria.put((CategoriaProducto) fila[0], (BigDecimal) fila[1]);
        }

        List<Map<String, Object>> areas = new ArrayList<>();
        areas.add(serie("Alojamiento", alojamiento));
        areas.add(serie("Cocina", porCategoria.getOrDefault(CategoriaProducto.COCINA, BigDecimal.ZERO)));
        areas.add(serie("Bar", porCategoria.getOrDefault(CategoriaProducto.BAR, BigDecimal.ZERO)));
        areas.add(serie("Venta directa", porCategoria.getOrDefault(CategoriaProducto.DIRECTO, BigDecimal.ZERO)));
        return areas;
    }

    /** Cobros efectivamente registrados en cada uno de los ultimos 7 dias. */
    private List<Map<String, Object>> ingresosUltimos7Dias() {
        List<Map<String, Object>> series = new ArrayList<>();
        LocalDate hoy = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate dia = hoy.minusDays(i);
            BigDecimal total = pagoRepository.sumMontoEntre(
                    dia.atStartOfDay(), dia.plusDays(1).atStartOfDay());
            series.add(serie(dia.toString().substring(5), total != null ? total : BigDecimal.ZERO));
        }
        return series;
    }
}
