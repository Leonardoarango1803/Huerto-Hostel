package pe.edu.utp.huertohostel.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.repository.PagoRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PagoService {

    private final PagoRepository pagoRepository;

    public PagoService(PagoRepository pagoRepository) {
        this.pagoRepository = pagoRepository;
    }

    public List<Pago> listarPorReserva(Integer idReserva) {
        return pagoRepository.findByReservaIdReserva(idReserva);
    }

    public List<Pago> listarPorEstadia(Integer idEstadia) {
        return pagoRepository.findByEstadiaIdEstadia(idEstadia);
    }

    @Transactional
    public Pago registrar(Pago pago) {
        if (pago.getMonto() == null || pago.getMonto().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("El monto del pago debe ser mayor a cero.");
        }
        pago.setFechaPago(LocalDateTime.now());
        return pagoRepository.save(pago);
    }
}
