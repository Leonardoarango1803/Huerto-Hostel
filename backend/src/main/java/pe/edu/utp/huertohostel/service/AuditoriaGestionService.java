package pe.edu.utp.huertohostel.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.AuditoriaGestion;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.repository.AuditoriaGestionRepository;

import java.time.LocalDateTime;
import java.util.List;

/** Deja constancia de lo sensible que hace el administrador con usuarios y turnos. */
@Service
@Transactional(readOnly = true)
public class AuditoriaGestionService {

    private static final int LARGO_DETALLE = 500;

    private final AuditoriaGestionRepository repository;

    public AuditoriaGestionService(AuditoriaGestionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void registrar(String accion, Empleado objetivo, String detalle) {
        AuditoriaGestion a = new AuditoriaGestion();
        a.setFechaHora(LocalDateTime.now());
        a.setAccion(accion);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        a.setActorUsername(auth != null ? auth.getName() : null);
        if (objetivo != null) {
            a.setIdEmpleadoObjetivo(objetivo.getIdEmpleado());
            a.setObjetivo((objetivo.getNombres() + " " + objetivo.getApellidos()).trim());
        }
        a.setDetalle(detalle != null && detalle.length() > LARGO_DETALLE ? detalle.substring(0, LARGO_DETALLE) : detalle);
        repository.save(a);
    }

    public List<AuditoriaGestion> ultimos() {
        return repository.findTop100ByOrderByFechaHoraDesc();
    }
}
