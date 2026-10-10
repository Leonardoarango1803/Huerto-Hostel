package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.entity.EstadoOperativoHab;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.repository.ClienteRepository;
import pe.edu.utp.huertohostel.repository.HabitacionRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class DashboardController {

    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;
    private final ClienteRepository clienteRepository;

    public DashboardController(
            HabitacionRepository habitacionRepository,
            ReservaRepository reservaRepository,
            ClienteRepository clienteRepository) {
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
        this.clienteRepository = clienteRepository;
    }

    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> resumen() {
        long totalHabitaciones = habitacionRepository.count();
        long disponibles = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.DISPONIBLE);
        long ocupadas = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.OCUPADA);
        long pendienteLimpieza = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.PENDIENTE_LIMPIEZA);
        long mantenimiento = habitacionRepository.countByEstadoOperativo(EstadoOperativoHab.MANTENIMIENTO);
        long totalReservas = reservaRepository.countByEstadoReservaNotIn(
                List.of(EstadoReserva.CANCELADA, EstadoReserva.COMPLETADA));
        long totalClientes = clienteRepository.count();

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("totalHabitaciones", totalHabitaciones);
        resumen.put("disponibles", disponibles);
        resumen.put("ocupadas", ocupadas);
        resumen.put("pendienteLimpieza", pendienteLimpieza);
        resumen.put("mantenimiento", mantenimiento);
        resumen.put("totalReservas", totalReservas);
        resumen.put("totalClientes", totalClientes);

        return ResponseEntity.ok(resumen);
    }
}
