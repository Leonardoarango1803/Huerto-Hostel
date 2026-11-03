package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.BitacoraTurno;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.EstadoTurno;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.TurnoCaja;
import pe.edu.utp.huertohostel.repository.BitacoraTurnoRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.TurnoCajaRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CajaService {

    private final TurnoCajaRepository turnoCajaRepository;
    private final BitacoraTurnoRepository bitacoraRepository;
    private final PagoRepository pagoRepository;
    private final UsuarioActualService usuarioActualService;

    public CajaService(TurnoCajaRepository turnoCajaRepository,
                       BitacoraTurnoRepository bitacoraRepository,
                       PagoRepository pagoRepository,
                       UsuarioActualService usuarioActualService) {
        this.turnoCajaRepository = turnoCajaRepository;
        this.bitacoraRepository = bitacoraRepository;
        this.pagoRepository = pagoRepository;
        this.usuarioActualService = usuarioActualService;
    }

    private static final DateTimeFormatter FORMATO_APERTURA = DateTimeFormatter.ofPattern("dd/MM HH:mm");

    /** El unico turno abierto del hotel: es el mismo para recepcion, cajero y administrador. */
    public Optional<TurnoCaja> turnoAbierto() {
        return turnoCajaRepository.findFirstByEstadoOrderByFechaAperturaDesc(EstadoTurno.ABIERTO);
    }

    /** Devuelve el turno abierto o corta la operacion con un 409 que el front puede mostrar tal cual. */
    public TurnoCaja exigirCajaAbierta() {
        return turnoAbierto().orElseThrow(() -> new IllegalStateException(
                "La caja esta cerrada. Abre un turno de caja antes de continuar."));
    }

    /** Igual que exigirCajaAbierta, pero un huesped (rol CLIENTE) nunca depende de la caja. */
    public void exigirCajaAbiertaSiEsPersonal() {
        if (usuarioActualService.esPersonal()) {
            exigirCajaAbierta();
        }
    }

    /** Estado publico de la caja (sin montos) para los banners y botones de las pantallas. */
    public Map<String, Object> estadoCaja() {
        Map<String, Object> estado = new HashMap<>();
        Optional<TurnoCaja> turno = turnoAbierto();
        estado.put("abierta", turno.isPresent());
        turno.ifPresent(t -> {
            estado.put("idTurnoCaja", t.getIdTurnoCaja());
            estado.put("abiertaPor", nombreCompleto(t.getEmpleado()));
            estado.put("fechaApertura", t.getFechaApertura());
        });
        return estado;
    }

    private String nombreCompleto(Empleado e) {
        return e == null ? "—" : (e.getNombres() + " " + e.getApellidos()).trim();
    }

    public TurnoCaja obtenerPorId(@NonNull Integer id) {
        return turnoCajaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Turno de caja no encontrado con id: " + id));
    }

    public List<TurnoCaja> listarHistorial() {
        return turnoCajaRepository.findAllByOrderByFechaAperturaDesc();
    }

    @Transactional
    public TurnoCaja abrir(BigDecimal fondoInicial) {
        Optional<TurnoCaja> abierto = turnoAbierto();
        if (abierto.isPresent()) {
            TurnoCaja t = abierto.get();
            throw new IllegalStateException("La caja ya esta abierta por " + nombreCompleto(t.getEmpleado())
                    + " desde " + t.getFechaApertura().format(FORMATO_APERTURA)
                    + ". Opera sobre ese turno o cierralo antes de abrir otro.");
        }
        TurnoCaja turno = new TurnoCaja();
        turno.setEmpleado(usuarioActualService.obtenerEmpleado());
        turno.setFondoInicialEfectivo(fondoInicial != null ? fondoInicial : BigDecimal.ZERO);
        turno.setEstado(EstadoTurno.ABIERTO);
        turno.setFechaApertura(LocalDateTime.now());
        try {
            return turnoCajaRepository.saveAndFlush(turno);
        } catch (DataIntegrityViolationException e) {
            // Dos personas abrieron a la vez: el indice unico parcial deja pasar solo a una.
            throw new IllegalStateException("La caja acaba de ser abierta por otra persona. Actualiza la pantalla.");
        }
    }

    /**
     * Arqueo ciego: mientras el turno esta ABIERTO el cajero ve sus transacciones
     * pero NO el efectivo esperado; ese dato solo se revela una vez cerrado.
     */
    public Map<String, Object> resumenTurno(@NonNull Integer idTurnoCaja, boolean revelarEsperado) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        List<Pago> pagos = pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(idTurnoCaja);

        Map<MetodoPago, BigDecimal> porMetodo = new EnumMap<>(MetodoPago.class);
        BigDecimal total = BigDecimal.ZERO;
        for (Pago p : pagos) {
            BigDecimal monto = p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO;
            porMetodo.merge(p.getMetodoPago(), monto, BigDecimal::add);
            total = total.add(monto);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("turno", turno);
        result.put("pagos", pagos);
        result.put("totalPorMetodo", porMetodo);
        result.put("totalCobrado", total);
        result.put("cantidadTransacciones", pagos.size());
        result.put("cierreCiego", turno.getEstado() == EstadoTurno.ABIERTO && !revelarEsperado);

        if (turno.getEstado() != EstadoTurno.ABIERTO || revelarEsperado) {
            result.put("efectivoEsperado", efectivoEsperado(turno, pagos));
        }
        return result;
    }

    /** Fondo inicial + lo cobrado en efectivo durante el turno. */
    private BigDecimal efectivoEsperado(TurnoCaja turno, List<Pago> pagos) {
        BigDecimal fondo = turno.getFondoInicialEfectivo() != null
                ? turno.getFondoInicialEfectivo() : BigDecimal.ZERO;
        BigDecimal efectivo = pagos.stream()
                .filter(p -> p.getMetodoPago() == MetodoPago.EFECTIVO)
                .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return fondo.add(efectivo);
    }

    /**
     * Cierra el turno comparando lo declarado por el cajero contra lo esperado.
     * La diferencia queda registrada para auditoria.
     */
    @Transactional
    public TurnoCaja cerrar(@NonNull Integer idTurnoCaja, BigDecimal efectivoDeclarado, String observaciones) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        if (turno.getEstado() != EstadoTurno.ABIERTO) {
            throw new IllegalStateException("El turno ya fue cerrado.");
        }
        if (efectivoDeclarado == null || efectivoDeclarado.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Debes declarar el efectivo contado en caja.");
        }

        List<Pago> pagos = pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(idTurnoCaja);
        BigDecimal esperado = efectivoEsperado(turno, pagos);

        turno.setEfectivoSistemaEsperado(esperado);
        turno.setEfectivoRealDeclarado(efectivoDeclarado);
        turno.setDiferenciaCuadre(efectivoDeclarado.subtract(esperado));
        turno.setObservacionesCierre(observaciones);
        turno.setEstado(EstadoTurno.CERRADO);
        turno.setFechaCierre(LocalDateTime.now());
        turno.setEmpleadoCierre(usuarioActualService.obtenerEmpleado());
        return turnoCajaRepository.save(turno);
    }

    @Transactional
    public TurnoCaja auditar(@NonNull Integer idTurnoCaja) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        if (turno.getEstado() != EstadoTurno.CERRADO) {
            throw new IllegalStateException("Solo se pueden auditar turnos cerrados.");
        }
        turno.setEstado(EstadoTurno.AUDITADO);
        return turnoCajaRepository.save(turno);
    }

    // ---------- Bitacora de relevo ----------

    public List<BitacoraTurno> listarBitacora(@NonNull Integer idTurnoCaja) {
        return bitacoraRepository.findByTurnoCajaIdTurnoCajaOrderByFechaHoraDesc(idTurnoCaja);
    }

    @Transactional
    public BitacoraTurno registrarEnBitacora(@NonNull Integer idTurnoCaja, String categoria,
                                             String mensaje, String prioridad) {
        if (mensaje == null || mensaje.isBlank()) {
            throw new IllegalStateException("La nota de bitacora necesita un mensaje.");
        }
        TurnoCaja turno = obtenerPorId(idTurnoCaja);

        BitacoraTurno nota = new BitacoraTurno();
        nota.setTurnoCaja(turno);
        nota.setCategoria(categoria != null && !categoria.isBlank() ? categoria : "GENERAL");
        nota.setMensaje(mensaje);
        nota.setPrioridad(prioridad != null && !prioridad.isBlank() ? prioridad : "MEDIA");
        nota.setResuelto(false);
        nota.setFechaHora(LocalDateTime.now());
        return bitacoraRepository.save(nota);
    }

    @Transactional
    public BitacoraTurno marcarResuelto(@NonNull Integer idBitacora, boolean resuelto) {
        BitacoraTurno nota = bitacoraRepository.findById(idBitacora)
                .orElseThrow(() -> new EntityNotFoundException("Nota de bitacora no encontrada: " + idBitacora));
        nota.setResuelto(resuelto);
        return bitacoraRepository.save(nota);
    }

    /** Notas sin resolver de todos los turnos cerrados: lo que hereda el relevo. */
    public List<BitacoraTurno> pendientesDeRelevo() {
        List<BitacoraTurno> pendientes = new ArrayList<>();
        for (TurnoCaja t : turnoCajaRepository.findAllByOrderByFechaAperturaDesc()) {
            bitacoraRepository.findByTurnoCajaIdTurnoCajaOrderByFechaHoraDesc(t.getIdTurnoCaja())
                    .stream()
                    .filter(n -> !Boolean.TRUE.equals(n.getResuelto()))
                    .forEach(pendientes::add);
        }
        return pendientes;
    }
}
