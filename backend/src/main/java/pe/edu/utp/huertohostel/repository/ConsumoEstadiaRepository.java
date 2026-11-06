package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utp.huertohostel.entity.ConsumoEstadia;

import java.math.BigDecimal;
import java.util.List;

public interface ConsumoEstadiaRepository extends JpaRepository<ConsumoEstadia, Integer> {
    List<ConsumoEstadia> findByEstadiaIdEstadia(Integer idEstadia);

    @Query("SELECT COALESCE(SUM(c.totalConsumo), 0) FROM ConsumoEstadia c WHERE c.estadia.idEstadia = :idEstadia")
    BigDecimal sumTotalByEstadia(@Param("idEstadia") Integer idEstadia);

    /** Productos activos mas vendidos desde una fecha (idProducto, unidades): para los accesos rapidos. */
    @Query("""
            SELECT c.producto.idProducto, SUM(c.cantidad)
            FROM ConsumoEstadia c
            WHERE c.fechaRegistro >= :desde AND c.producto.estado = true
            GROUP BY c.producto.idProducto
            ORDER BY SUM(c.cantidad) DESC, c.producto.idProducto
            """)
    List<Object[]> frecuentes(@Param("desde") java.time.LocalDateTime desde, org.springframework.data.domain.Pageable limite);

    /** Consumo acumulado por categoria de producto (COCINA, BAR, DIRECTO). */
    @Query("""
            SELECT c.producto.categoria, COALESCE(SUM(c.totalConsumo), 0)
            FROM ConsumoEstadia c
            WHERE c.producto IS NOT NULL
            GROUP BY c.producto.categoria
            """)
    List<Object[]> sumTotalPorCategoria();
}
