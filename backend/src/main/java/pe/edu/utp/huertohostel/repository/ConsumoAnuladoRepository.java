package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.ConsumoAnulado;

import java.util.List;

public interface ConsumoAnuladoRepository extends JpaRepository<ConsumoAnulado, Integer> {

    List<ConsumoAnulado> findByEstadiaIdEstadiaOrderByFechaAnulacionDesc(Integer idEstadia);
}
