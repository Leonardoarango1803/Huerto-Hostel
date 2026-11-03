package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utp.huertohostel.entity.AreaInsumo;
import pe.edu.utp.huertohostel.entity.Insumo;

import java.util.List;

public interface InsumoRepository extends JpaRepository<Insumo, Integer> {

    List<Insumo> findByEstadoTrue();

    List<Insumo> findByAreaOrderByNombre(AreaInsumo area);

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdInsumoNot(String nombre, Integer idInsumo);

    /** Insumos cuyo stock cayo al minimo o por debajo (alerta de reposicion). */
    @Query("SELECT i FROM Insumo i WHERE i.estado = true AND i.stockActual <= i.stockMinimo ORDER BY i.nombre")
    List<Insumo> findConStockBajo();

    @Query("SELECT i FROM Insumo i WHERE i.estado = true AND i.area = :area AND i.stockActual <= i.stockMinimo ORDER BY i.nombre")
    List<Insumo> findConStockBajoDeArea(AreaInsumo area);

    @Query("SELECT COUNT(i) FROM Insumo i WHERE i.estado = true AND i.stockActual <= i.stockMinimo")
    long countConStockBajo();

    @Query("SELECT COUNT(i) FROM Insumo i WHERE i.estado = true AND i.stockActual <= 0")
    long countAgotados();
}
