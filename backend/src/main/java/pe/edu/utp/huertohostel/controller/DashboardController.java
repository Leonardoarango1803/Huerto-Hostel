package pe.edu.utp.huertohostel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.DashboardService;
import pe.edu.utp.huertohostel.service.DashboardService.Panel;
import pe.edu.utp.huertohostel.service.UsuarioActualService;

import java.util.List;

/** Panel de inicio (RF36): el servidor arma el del rol de quien pregunta. */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    /** En este orden: quien tenga varios roles (no deberia) recibe el panel del mas amplio. */
    private static final List<String> ROLES = List.of(Roles.ADMINISTRADOR, Roles.RECEPCIONISTA, Roles.CAJERO,
            Roles.COCINA, Roles.BAR, Roles.HOUSEKEEPING);

    private final DashboardService dashboardService;
    private final UsuarioActualService usuarioActualService;

    public DashboardController(DashboardService dashboardService, UsuarioActualService usuarioActualService) {
        this.dashboardService = dashboardService;
        this.usuarioActualService = usuarioActualService;
    }

    @GetMapping("/panel")
    @PreAuthorize(Roles.PANEL)
    public ResponseEntity<Panel> panel(@RequestParam(defaultValue = "false") boolean refrescar) {
        String rol = ROLES.stream().filter(usuarioActualService::tieneRol).findFirst()
                .orElseThrow(() -> new AccessDeniedException("Este rol no tiene panel."));
        return ResponseEntity.ok(dashboardService.panel(rol, refrescar));
    }
}
