package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utp.huertohostel.entity.MovimientoInventario;

import java.time.LocalDateTime;
import java.util.List;

public interface MovimientoInventarioRepository
        extends JpaRepository<MovimientoInventario, Integer>, JpaSpecificationExecutor<MovimientoInventario> {

    /** Cantidades por insumo y tipo en un rango: base del reporte de consumo y mermas. */
    @Query("""
            SELECT m.insumo.idInsumo, m.tipoMovimiento, SUM(m.cantidad), SUM(m.cantidadFaltante)
            FROM MovimientoInventario m
            WHERE m.fechaHora >= :desde AND m.fechaHora < :hasta
            GROUP BY m.insumo.idInsumo, m.tipoMovimiento
            """)
    List<Object[]> totalesPorInsumoYTipo(LocalDateTime desde, LocalDateTime hasta);

    /** Movimientos de un tipo con una referencia (por ejemplo los que descontaron un consumo). */
    List<MovimientoInventario> findByReferenciaOrigenAndTipoMovimiento(String referenciaOrigen, pe.edu.utp.huertohostel.entity.TipoMovInventario tipo);

    /** Movimientos con faltante desde una fecha (el almacen no alcanzo para lo que se vendio). */
    @Query("SELECT COUNT(m) FROM MovimientoInventario m WHERE m.cantidadFaltante > 0 AND m.fechaHora >= :desde")
    long countConFaltanteDesde(LocalDateTime desde);
}
