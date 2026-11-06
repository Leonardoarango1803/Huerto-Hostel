package pe.edu.utp.huertohostel.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.Periodo;
import pe.edu.utp.huertohostel.service.ReportesService;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteCaja;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteConsumos;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteIngresos;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteOcupacion;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteOperacion;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteReservas;
import pe.edu.utp.huertohostel.service.ReportesService.ReporteResumen;

import java.time.LocalDate;

/**
 * Reportes gerenciales (RF34, RF35). Todos reciben el mismo rango {@code desde}/{@code hasta} (por defecto los
 * ultimos 30 dias) y {@code refrescar=true} para saltarse la memoria y recalcular.
 */
@RestController
@RequestMapping("/api/v1/reportes")
@PreAuthorize(Roles.SOLO_ADMIN)
public class ReportesController {

    private final ReportesService reportes;

    public ReportesController(ReportesService reportes) {
        this.reportes = reportes;
    }

    private Periodo periodo(LocalDate desde, LocalDate hasta) {
        return reportes.periodo(desde, hasta);
    }

    @GetMapping("/resumen")
    public ResponseEntity<ReporteResumen> resumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.resumen(periodo(desde, hasta), refrescar));
    }

    @GetMapping("/ingresos")
    public ResponseEntity<ReporteIngresos> ingresos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.ingresos(periodo(desde, hasta), refrescar));
    }

    @GetMapping("/ocupacion")
    public ResponseEntity<ReporteOcupacion> ocupacion(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.ocupacion(periodo(desde, hasta), refrescar));
    }

    @GetMapping("/reservas")
    public ResponseEntity<ReporteReservas> reservas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.reservas(periodo(desde, hasta), refrescar));
    }

    @GetMapping("/consumos")
    public ResponseEntity<ReporteConsumos> consumos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.consumos(periodo(desde, hasta), refrescar));
    }

    @GetMapping("/caja")
    public ResponseEntity<ReporteCaja> caja(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.caja(periodo(desde, hasta), refrescar));
    }

    @GetMapping("/operacion")
    public ResponseEntity<ReporteOperacion> operacion(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean refrescar) {
        return ResponseEntity.ok(reportes.operacion(periodo(desde, hasta), refrescar));
    }
}
