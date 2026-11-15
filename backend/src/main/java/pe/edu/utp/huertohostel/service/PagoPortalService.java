package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.dto.PagoPortalRequest;
import pe.edu.utp.huertohostel.entity.Cliente;
import pe.edu.utp.huertohostel.entity.ConceptoPago;
import pe.edu.utp.huertohostel.entity.Estadia;
import pe.edu.utp.huertohostel.entity.EstadoEstadia;
import pe.edu.utp.huertohostel.entity.EstadoReserva;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.Reserva;
import pe.edu.utp.huertohostel.exception.PagoRechazadoException;
import pe.edu.utp.huertohostel.repository.EstadiaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.ReservaRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * El huesped paga desde su portal con la pasarela simulada (RF24, HU11):
 * <ul>
 *   <li>sin reserva indicada: el saldo de su estadia en curso (alojamiento + consumos - pagos);</li>
 *   <li>con reserva: lo que falta del alojamiento de una reserva suya pendiente o confirmada, aun sin ingresar.
 *   Si estaba pendiente de adelanto, queda confirmada.</li>
 * </ul>
 * Nunca se cobra mas de lo pendiente (no se crea saldo a favor desde la web) y solo lo propio. La fila de la reserva
 * se bloquea: dos clics o dos pestanas pagando a la vez hacen fila y la segunda ya ve el saldo nuevo. El pago no
 * entra a ningun turno de caja (es digital y el huesped no abre caja), igual que el adelanto de la reserva web.
 */
@Service
@Transactional(readOnly = true)
public class PagoPortalService {

    private static final Pattern CODIGO_YAPE = Pattern.compile("^[0-9A-Za-z-]{4,30}$");

    private final UsuarioActualService usuarioActualService;
    private final EstadiaRepository estadiaRepository;
    private final ReservaRepository reservaRepository;
    private final PagoRepository pagoRepository;
    private final EstadiaService estadiaService;
    private final PagoService pagoService;

    public PagoPortalService(UsuarioActualService usuarioActualService,
                             EstadiaRepository estadiaRepository,
                             ReservaRepository reservaRepository,
                             PagoRepository pagoRepository,
                             EstadiaService estadiaService,
                             PagoService pagoService) {
        this.usuarioActualService = usuarioActualService;
        this.estadiaRepository = estadiaRepository;
        this.reservaRepository = reservaRepository;
        this.pagoRepository = pagoRepository;
        this.estadiaService = estadiaService;
        this.pagoService = pagoService;
    }

    @Transactional
    public Map<String, Object> pagar(PagoPortalRequest req) {
        String metodo = req.getMetodo() == null ? "" : req.getMetodo().trim().toUpperCase(Locale.ROOT);
        if (!metodo.equals("TARJETA") && !metodo.equals("YAPE")) {
            throw new IllegalArgumentException("Elige cómo pagar: tarjeta o Yape/Plin.");
        }
        String codigoYape = req.getCodigoOperacion() == null ? "" : req.getCodigoOperacion().trim();
        if (metodo.equals("YAPE") && !CODIGO_YAPE.matcher(codigoYape).matches()) {
            throw new IllegalArgumentException("Ingresa el código de operación que te muestra la app de Yape o Plin.");
        }
        Cliente cliente = usuarioActualService.obtenerCliente();

        Pago pago = new Pago();
        Reserva reserva;
        Estadia estadia = null;
        BigDecimal pendiente;
        if (req.getIdReserva() == null) {
            List<Estadia> activas = estadiaRepository.findByClienteAndEstado(cliente.getIdCliente(), EstadoEstadia.EN_CURSO);
            if (activas.isEmpty()) {
                throw new IllegalStateException("No tienes una estadía en curso. Para pagar una reserva, elígela en Mis reservas.");
            }
            estadia = activas.get(0);
            reserva = bloquear(estadia.getReserva().getIdReserva());
            pendiente = estadiaService.calcularSaldo(estadia.getIdEstadia());
            pago.setEstadia(estadia);
            pago.setConcepto(ConceptoPago.PAGO_PARCIAL_ESTADIA);
        } else {
            reserva = bloquear(req.getIdReserva());
            if (reserva.getCliente() == null || !cliente.getIdCliente().equals(reserva.getCliente().getIdCliente())) {
                throw new AccessDeniedException("Solo puedes pagar tus propias reservas.");
            }
            EstadoReserva estado = reserva.getEstadoReserva();
            if (estado != EstadoReserva.PENDIENTE_ADELANTO && estado != EstadoReserva.CONFIRMADA) {
                throw new IllegalStateException("Esta reserva ya no admite pagos desde el portal.");
            }
            if (estadiaRepository.findByReservaIdReserva(reserva.getIdReserva()).isPresent()) {
                throw new IllegalStateException("Ya ingresaste con esta reserva: paga el saldo de tu estadía.");
            }
            BigDecimal pagado = pagoRepository.findDeReservaOSuEstadia(reserva.getIdReserva()).stream()
                    .map(Pago::getMonto).filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal total = reserva.getMontoAlojamientoTotal() != null ? reserva.getMontoAlojamientoTotal() : BigDecimal.ZERO;
            pendiente = total.subtract(pagado);
            pago.setReserva(reserva);
            pago.setConcepto(ConceptoPago.ADELANTO_RESERVA);
        }

        pendiente = pendiente.setScale(2, RoundingMode.HALF_UP);
        if (pendiente.signum() <= 0) {
            throw new IllegalStateException("No tienes saldo pendiente por pagar.");
        }
        BigDecimal monto = req.getMonto() == null ? pendiente : req.getMonto().setScale(2, RoundingMode.HALF_UP);
        if (monto.signum() <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        if (monto.compareTo(pendiente) > 0) {
            throw new IllegalArgumentException("El monto supera lo pendiente (S/ " + pendiente + ").");
        }

        // La pasarela responde antes de escribir: si rechaza, no queda nada.
        String codigoOperacion = "SIM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        if (req.isSimularRechazo()) {
            throw new PagoRechazadoException("Tu banco no aprobó el pago. No se cobró nada.", codigoOperacion);
        }

        pago.setMonto(monto);
        if (metodo.equals("TARJETA")) {
            pago.setMetodoPago(MetodoPago.PASARELA_ONLINE);
            pago.setNumTransaccionComprobante(codigoOperacion);
        } else {
            pago.setMetodoPago(MetodoPago.YAPE_PLIN);
            pago.setNumTransaccionComprobante("YAPE-" + codigoYape);
        }
        // Huesped: PagoService no le asigna turno ni responsable y liga el pago a la reserva de su estadia.
        Pago guardado = pagoService.registrar(pago);

        boolean confirmada = false;
        if (estadia == null && reserva.getEstadoReserva() == EstadoReserva.PENDIENTE_ADELANTO) {
            reserva.setEstadoReserva(EstadoReserva.CONFIRMADA);
            reservaRepository.save(reserva);
            confirmada = true;
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("aprobado", true);
        r.put("idPago", guardado.getIdPago());
        r.put("codigoOperacion", guardado.getNumTransaccionComprobante());
        r.put("monto", monto);
        r.put("metodo", guardado.getMetodoPago());
        r.put("pendienteRestante", pendiente.subtract(monto));
        r.put("reservaConfirmada", confirmada);
        return r;
    }

    private Reserva bloquear(Integer idReserva) {
        return reservaRepository.findByIdParaActualizar(idReserva)
                .orElseThrow(() -> new EntityNotFoundException("Reserva no encontrada."));
    }
}
