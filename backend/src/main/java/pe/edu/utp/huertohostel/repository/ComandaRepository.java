package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.Comanda;

import java.util.List;

public interface ComandaRepository extends JpaRepository<Comanda, Integer> {
    List<Comanda> findByEstadiaIdEstadia(Integer idEstadia);
}
