package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.AuditoriaGestion;

import java.util.List;

public interface AuditoriaGestionRepository extends JpaRepository<AuditoriaGestion, Integer> {

    List<AuditoriaGestion> findTop100ByOrderByFechaHoraDesc();
}
