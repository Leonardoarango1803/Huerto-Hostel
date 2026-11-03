package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class PagoService {

    private final PagoRepository pagoRepository;
    private final EstadiaRepository estadiaRepository;
    private final ReservaRepository reservaRepository;
    private final CajaService cajaService;
    private final UsuarioActualService usuarioActualService;

    public PagoService(PagoRepository pagoRepository,
                       EstadiaRepository estadiaRepository,
                       ReservaRepository reservaRepository,
                       CajaService cajaService,
                       UsuarioActualService usuarioActualService) {
        this.pagoRepository = pagoRepository;
        this.estadiaRepository = estadiaRepository;
        this.reservaRepository = reservaRepository;
        this.cajaService = cajaService;
        this.usuarioActualService = usuarioActualService;
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
        pago.setIdPago(null); // un POST nunca puede pisar un pago existente
        pago.setFechaPago(LocalDateTime.now());
        asignarTurnoYResponsable(pago);
        return pagoRepository.save(pago);
    }

    /**
     * Unico lugar donde un pago recibe su turno y su responsable. El servidor lo decide,
     * nunca el cuerpo de la peticion. El personal exige la caja abierta y el pago entra a su
     * arqueo; el huesped (portal) paga sin turno porque no abre ni cierra caja.
     */
    private void asignarTurnoYResponsable(Pago pago) {
        pago.setTurnoCaja(null);
        pago.setEmpleadoRegistra(null);
        if (usuarioActualService.esPersonal()) {
            pago.setTurnoCaja(cajaService.exigirCajaAbierta());
            pago.setEmpleadoRegistra(usuarioActualService.obtenerEmpleado());
        }
    }

    /** Un huesped solo puede pagar con la pasarela sus propias reservas y estadias. */
    private void verificarQueEsSuyo(Pago pago) {
        Integer idCliente = usuarioActualService.obtenerCliente().getIdCliente();
        boolean reservaAjena = pago.getReserva() != null
                && !idCliente.equals(duenoDe(pago.getReserva()));
        boolean estadiaAjena = pago.getEstadia() != null
                && !idCliente.equals(duenoDe(pago.getEstadia().getReserva()));
        if (reservaAjena || estadiaAjena) {
            throw new AccessDeniedException("Solo puedes pagar tus propias reservas y estadias.");
        }
    }

    private Integer duenoDe(pe.edu.utp.huertohostel.entity.Reserva reserva) {
        return reserva != null && reserva.getCliente() != null ? reserva.getCliente().getIdCliente() : null;
    }

    /**
     * Pasarela de pago simulada (sandbox, RF24). No hay integracion externa ni se
     * manejan datos reales de tarjeta: se genera un codigo de operacion y, si la
     * operacion es aprobada, se registra el pago.
     */
    @Transactional
    public Map<String, Object> procesarPasarela(Integer idEstadia, Integer idReserva,
                                                BigDecimal monto, ConceptoPago concepto,
                                                boolean simularRechazo) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("El monto a procesar debe ser mayor a cero.");
        }
        if (idEstadia == null && idReserva == null) {
            throw new IllegalStateException("El pago debe referirse a una reserva o a una estadia.");
        }

        String codigoOperacion = "SIM-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("codigoOperacion", codigoOperacion);

        if (simularRechazo) {
            resultado.put("aprobado", false);
            resultado.put("mensaje", "Operacion rechazada por la pasarela simulada.");
            return resultado;
        }

        Pago pago = new Pago();
        pago.setMonto(monto);
        pago.setMetodoPago(MetodoPago.PASARELA_ONLINE);
        pago.setConcepto(concepto != null ? concepto : ConceptoPago.PAGO_PARCIAL_ESTADIA);
        pago.setNumTransaccionComprobante(codigoOperacion);

        if (idEstadia != null) {
            pago.setEstadia(estadiaRepository.findById(idEstadia)
                    .orElseThrow(() -> new EntityNotFoundException("Estadia no encontrada con id: " + idEstadia)));
        }
        if (idReserva != null) {
            pago.setReserva(reservaRepository.findById(idReserva)
                    .orElseThrow(() -> new EntityNotFoundException("Reserva no encontrada con id: " + idReserva)));
        }

        if (!usuarioActualService.esPersonal()) {
            verificarQueEsSuyo(pago);
        }

        Pago guardado = registrar(pago);

        resultado.put("aprobado", true);
        resultado.put("mensaje", "Pago aprobado por la pasarela simulada.");
        resultado.put("pago", guardado);
        return resultado;
    }
}
