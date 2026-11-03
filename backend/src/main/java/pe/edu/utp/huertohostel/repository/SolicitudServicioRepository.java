package pe.edu.utp.huertohostel.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utp.huertohostel.entity.EstadoSolicitud;
import pe.edu.utp.huertohostel.entity.SolicitudServicio;

import java.util.List;

public interface SolicitudServicioRepository extends JpaRepository<SolicitudServicio, Integer> {

    List<SolicitudServicio> findByEstadiaIdEstadiaOrderByFechaSolicitudDesc(Integer idEstadia);

    List<SolicitudServicio> findByEstadoOrderByFechaSolicitudAsc(EstadoSolicitud estado);

    List<SolicitudServicio> findByEstadoInOrderByFechaSolicitudAsc(List<EstadoSolicitud> estados);
}
