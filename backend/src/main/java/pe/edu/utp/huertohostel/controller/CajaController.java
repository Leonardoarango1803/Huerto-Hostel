package pe.edu.utp.huertohostel.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.BitacoraTurno;
import pe.edu.utp.huertohostel.entity.TurnoCaja;
import pe.edu.utp.huertohostel.service.CajaService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/caja")
@PreAuthorize(Roles.COBRO)
public class CajaController {

    private final CajaService cajaService;

    public CajaController(CajaService cajaService) {
        this.cajaService = cajaService;
    }

    /** Estado de la caja del hotel, igual para recepcion, cajero y administrador. */
    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        return ResponseEntity.ok(cajaService.estadoCaja());
    }

    /** Turno abierto del hotel (204 si la caja esta cerrada). */
    @GetMapping("/turno-actual")
    public ResponseEntity<Map<String, Object>> turnoActual() {
        return cajaService.turnoAbierto()
                .map(t -> ResponseEntity.ok(cajaService.resumenTurno(t.getIdTurnoCaja(), false)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/abrir")
    public ResponseEntity<TurnoCaja> abrir(@RequestBody Map<String, String> body) {
        BigDecimal fondo = body.get("fondoInicialEfectivo") != null
                ? new BigDecimal(body.get("fondoInicialEfectivo"))
                : BigDecimal.ZERO;
        return ResponseEntity.status(HttpStatus.CREATED).body(cajaService.abrir(fondo));
    }

    @GetMapping("/turnos/{id}")
    public ResponseEntity<Map<String, Object>> resumen(@PathVariable @NonNull Integer id) {
        // El esperado solo se revela en turnos ya cerrados (arqueo ciego).
        return ResponseEntity.ok(cajaService.resumenTurno(id, false));
    }

    @GetMapping("/turnos")
    public ResponseEntity<List<TurnoCaja>> historial() {
        return ResponseEntity.ok(cajaService.listarHistorial());
    }

    @PostMapping("/turnos/{id}/cerrar")
    public ResponseEntity<TurnoCaja> cerrar(@PathVariable @NonNull Integer id,
                                            @RequestBody Map<String, String> body) {
        BigDecimal declarado = body.get("efectivoRealDeclarado") != null
                ? new BigDecimal(body.get("efectivoRealDeclarado"))
                : null;
        return ResponseEntity.ok(
                cajaService.cerrar(id, declarado, body.get("observacionesCierre")));
    }

    @PostMapping("/turnos/{id}/auditar")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<TurnoCaja> auditar(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(cajaService.auditar(id));
    }

    // ---------- Bitacora ----------

    @GetMapping("/turnos/{id}/bitacora")
    public ResponseEntity<List<BitacoraTurno>> bitacora(@PathVariable @NonNull Integer id) {
        return ResponseEntity.ok(cajaService.listarBitacora(id));
    }

    @PostMapping("/turnos/{id}/bitacora")
    public ResponseEntity<BitacoraTurno> registrarNota(@PathVariable @NonNull Integer id,
                                                       @RequestBody Map<String, String> body) {
        BitacoraTurno nota = cajaService.registrarEnBitacora(
                id, body.get("categoria"), body.get("mensaje"), body.get("prioridad"));
        return ResponseEntity.status(HttpStatus.CREATED).body(nota);
    }

    @PatchMapping("/bitacora/{idBitacora}")
    public ResponseEntity<BitacoraTurno> marcarResuelto(@PathVariable @NonNull Integer idBitacora,
                                                        @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(
                cajaService.marcarResuelto(idBitacora, Boolean.TRUE.equals(body.get("resuelto"))));
    }

    @GetMapping("/bitacora/pendientes")
    public ResponseEntity<List<BitacoraTurno>> pendientes() {
        return ResponseEntity.ok(cajaService.pendientesDeRelevo());
    }
}
