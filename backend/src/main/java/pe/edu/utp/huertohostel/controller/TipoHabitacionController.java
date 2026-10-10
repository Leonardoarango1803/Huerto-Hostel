package pe.edu.utp.huertohostel.controller;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.TipoHabitacion;
import pe.edu.utp.huertohostel.repository.TipoHabitacionRepository;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tipos-habitacion")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')")
public class TipoHabitacionController {

    private final TipoHabitacionRepository tipoHabitacionRepository;

    public TipoHabitacionController(TipoHabitacionRepository tipoHabitacionRepository) {
        this.tipoHabitacionRepository = tipoHabitacionRepository;
    }

    @GetMapping
    public ResponseEntity<List<TipoHabitacion>> listarTodos() {
        return ResponseEntity.ok(tipoHabitacionRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<TipoHabitacion> crear(@RequestBody TipoHabitacion tipo) {
        tipo.setIdTipoHabitacion(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(tipoHabitacionRepository.save(tipo));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<TipoHabitacion> actualizar(@PathVariable @NonNull Integer id, @RequestBody TipoHabitacion datos) {
        TipoHabitacion tipo = tipoHabitacionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TipoHabitacion no encontrado con id: " + id));
        tipo.setNombre(datos.getNombre());
        tipo.setDescripcion(datos.getDescripcion());
        tipo.setCapacidadPersonas(datos.getCapacidadPersonas());
        tipo.setPrecioNoche(datos.getPrecioNoche());
        tipo.setEstado(datos.getEstado());
        return ResponseEntity.ok(tipoHabitacionRepository.save(tipo));
    }
}
