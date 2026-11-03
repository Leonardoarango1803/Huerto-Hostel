package pe.edu.utp.huertohostel.controller;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import pe.edu.utp.huertohostel.security.Roles;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import pe.edu.utp.huertohostel.entity.Producto;
import pe.edu.utp.huertohostel.repository.ProductoRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/productos")
public class ProductoController {

    private final ProductoRepository productoRepository;

    public ProductoController(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    @GetMapping
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<List<Producto>> listarTodos() {
        return ResponseEntity.ok(productoRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize(Roles.COCINA_BAR)
    public ResponseEntity<Producto> obtenerPorId(@PathVariable @NonNull Integer id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        return ResponseEntity.ok(producto);
    }

    @PostMapping
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Producto> crear(@RequestBody Producto producto) {
        producto.setIdProducto(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(productoRepository.save(producto));
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Producto> actualizar(@PathVariable @NonNull Integer id, @RequestBody Producto datos) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        producto.setNombre(datos.getNombre());
        producto.setDescripcion(datos.getDescripcion());
        producto.setCategoria(datos.getCategoria());
        producto.setPrecioVenta(datos.getPrecioVenta());
        return ResponseEntity.ok(productoRepository.save(producto));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Producto> cambiarEstado(@PathVariable @NonNull Integer id, @RequestBody Map<String, Boolean> body) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        producto.setEstado(body.get("estado"));
        return ResponseEntity.ok(productoRepository.save(producto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(Roles.SOLO_ADMIN)
    public ResponseEntity<Void> eliminar(@PathVariable @NonNull Integer id) {
        productoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));
        try {
            productoRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException(
                    "No se puede eliminar: el producto tiene receta o ventas registradas. Desactivalo para que deje de ofrecerse.");
        }
        return ResponseEntity.noContent().build();
    }
}
