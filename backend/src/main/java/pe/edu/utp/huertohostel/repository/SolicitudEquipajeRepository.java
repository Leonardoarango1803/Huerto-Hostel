package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.EstadoEquipaje;
import pe.edu.utp.huertohostel.entity.SolicitudEquipaje;

import java.util.List;

public interface SolicitudEquipajeRepository extends JpaRepository<SolicitudEquipaje, Integer> {

    List<SolicitudEquipaje> findByEstadoInOrderByFechaSolicitudAsc(List<EstadoEquipaje> estados);

    List<SolicitudEquipaje> findTop60ByOrderByFechaSolicitudDesc();

    List<SolicitudEquipaje> findByEstadiaReservaClienteIdClienteOrderByFechaSolicitudDesc(Integer idCliente);

    boolean existsByEstadiaIdEstadiaAndTipoSolicitudAndEstadoIn(Integer idEstadia, String tipo, List<EstadoEquipaje> estados);
}
