package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.DetalleComanda;

import java.util.List;

public interface DetalleComandaRepository extends JpaRepository<DetalleComanda, Integer> {
    List<DetalleComanda> findByComandaIdComanda(Integer idComanda);

    List<DetalleComanda> findByComandaIdComandaIn(List<Integer> idsComanda);
}
