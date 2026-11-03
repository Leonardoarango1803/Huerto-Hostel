package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utp.huertohostel.entity.RecetaDetalle;
import pe.edu.utp.huertohostel.entity.RecetaDetalleId;

import java.util.List;

public interface RecetaDetalleRepository extends JpaRepository<RecetaDetalle, RecetaDetalleId> {
    List<RecetaDetalle> findByProductoIdProducto(Integer idProducto);

    void deleteByProductoIdProducto(Integer idProducto);

    /** Todas las lineas de receta con su insumo, para calcular costos sin una consulta por producto. */
    @Query("SELECT r FROM RecetaDetalle r JOIN FETCH r.insumo")
    List<RecetaDetalle> findAllConInsumo();
}
