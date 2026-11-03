package pe.edu.utp.huertohostel.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utp.huertohostel.entity.AreaDestino;
import pe.edu.utp.huertohostel.entity.Comanda;
import pe.edu.utp.huertohostel.entity.EstadoComanda;

import java.util.List;
import java.util.Optional;

public interface ComandaRepository extends JpaRepository<Comanda, Integer> {
    /**
     * Bloquea la fila hasta el fin de la transaccion: dos clics simultaneos en "Entregar" se atienden uno
     * tras otro y el segundo ya ve la comanda ENTREGADA, en vez de descontar el inventario dos veces.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comanda c WHERE c.idComanda = :id")
    Optional<Comanda> findByIdParaActualizar(Integer id);

    List<Comanda> findByEstadiaIdEstadia(Integer idEstadia);

    List<Comanda> findByAreaDestinoOrderByFechaRegistroAsc(AreaDestino areaDestino);

    List<Comanda> findByAreaDestinoAndEstadoComandaOrderByFechaRegistroAsc(
            AreaDestino areaDestino, EstadoComanda estadoComanda);

    List<Comanda> findByEstadoComandaOrderByFechaRegistroAsc(EstadoComanda estadoComanda);

    List<Comanda> findByEstadoComandaInOrderByFechaRegistroAsc(List<EstadoComanda> estados);
}
