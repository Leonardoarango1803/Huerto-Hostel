package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.lang.NonNull;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.entity.BitacoraTurno;
import pe.edu.utp.huertohostel.entity.Empleado;
import pe.edu.utp.huertohostel.entity.EstadoTurno;
import pe.edu.utp.huertohostel.entity.MetodoPago;
import pe.edu.utp.huertohostel.entity.MovimientoCaja;
import pe.edu.utp.huertohostel.entity.Pago;
import pe.edu.utp.huertohostel.entity.TurnoCaja;
import pe.edu.utp.huertohostel.entity.ArqueoParcial;
import pe.edu.utp.huertohostel.repository.ArqueoParcialRepository;
import pe.edu.utp.huertohostel.repository.BitacoraTurnoRepository;
import pe.edu.utp.huertohostel.repository.MovimientoCajaRepository;
import pe.edu.utp.huertohostel.repository.PagoRepository;
import pe.edu.utp.huertohostel.repository.TurnoCajaRepository;
import pe.edu.utp.huertohostel.security.Roles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Caja unica del hotel. El cierre es guiado: antes de cerrar se VERIFICA el conteo; si no cuadra, primero se pide
 * recontar sin dar el monto, y recien al segundo intento se muestra lo que espera el sistema. Si aun asi se cierra con
 * diferencia, queda una nota de dinero pendiente (solo el administrador la resuelve) y el turno que recibe la caja la ve.
 */
@Service
@Transactional(readOnly = true)
public class CajaService {

    /** Notas de dinero generadas por el sistema: el cajero no las puede escribir ni cerrar a mano. */
    public static final String DESCUADRE = "DESCUADRE";
    public static final String APERTURA = "APERTURA";
    private static final List<String> NOTAS_DE_DINERO = List.of(DESCUADRE, APERTURA);

    /** Otras notas que escribe solo el sistema (no son de dinero: las resuelve cualquiera de caja). */
    public static final String CIERRE_FORZADO = "CIERRE_FORZADO";
    public static final String ARQUEO = "ARQUEO";
    private static final List<String> NOTAS_DEL_SISTEMA = List.of(DESCUADRE, APERTURA, CIERRE_FORZADO, ARQUEO);

    /** Tope de arqueos parciales por turno: evita usarlos para "adivinar" lo que espera el sistema. */
    static final int MAXIMO_ARQUEOS_PARCIALES = 5;

    private static final int LARGO_MAXIMO_MOTIVO = 200;
    private static final int LARGO_MAXIMO_DESGLOSE = 1000;
    private static final DateTimeFormatter FORMATO_APERTURA = DateTimeFormatter.ofPattern("dd/MM HH:mm");
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final TurnoCajaRepository turnoCajaRepository;
    private final BitacoraTurnoRepository bitacoraRepository;
    private final PagoRepository pagoRepository;
    private final MovimientoCajaRepository movimientoRepository;
    private final ArqueoParcialRepository arqueoRepository;
    private final TurnoService turnoService;
    private final UsuarioActualService usuarioActualService;
    private final BigDecimal topeEfectivo;
    private final int horasMaximasAbierta;

    public CajaService(TurnoCajaRepository turnoCajaRepository,
                       BitacoraTurnoRepository bitacoraRepository,
                       PagoRepository pagoRepository,
                       MovimientoCajaRepository movimientoRepository,
                       ArqueoParcialRepository arqueoRepository,
                       TurnoService turnoService,
                       UsuarioActualService usuarioActualService,
                       @Value("${app.caja.tope-efectivo:1000}") BigDecimal topeEfectivo,
                       @Value("${app.caja.horas-maximas-abierta:16}") int horasMaximasAbierta) {
        this.turnoCajaRepository = turnoCajaRepository;
        this.bitacoraRepository = bitacoraRepository;
        this.pagoRepository = pagoRepository;
        this.movimientoRepository = movimientoRepository;
        this.arqueoRepository = arqueoRepository;
        this.turnoService = turnoService;
        this.usuarioActualService = usuarioActualService;
        this.topeEfectivo = topeEfectivo;
        this.horasMaximasAbierta = horasMaximasAbierta;
    }

    private long horasAbierto(TurnoCaja turno) {
        return turno.getFechaApertura() == null ? 0
                : java.time.Duration.between(turno.getFechaApertura(), LocalDateTime.now()).toHours();
    }

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
            long horas = horasAbierto(t);
            estado.put("horasAbierta", horas);
            estado.put("limiteHoras", horasMaximasAbierta);
            estado.put("excedeLimite", horas >= horasMaximasAbierta);
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

    // ---------- Apertura: recibir la caja ----------

    private Optional<TurnoCaja> ultimoCierre() {
        return turnoCajaRepository.findFirstByEstadoNotOrderByFechaCierreDesc(EstadoTurno.ABIERTO)
                .filter(t -> t.getEfectivoRealDeclarado() != null);
    }

    /** Lo que ve quien va a abrir: con cuanto efectivo quedo la caja y que diferencias siguen sin resolverse. */
    public Map<String, Object> infoApertura() {
        Map<String, Object> info = new LinkedHashMap<>();
        ultimoCierre().ifPresent(t -> {
            Map<String, Object> cierre = new LinkedHashMap<>();
            cierre.put("idTurnoCaja", t.getIdTurnoCaja());
            cierre.put("efectivoDeclarado", t.getEfectivoRealDeclarado());
            cierre.put("diferencia", t.getDiferenciaCuadre());
            cierre.put("cerroPor", nombreCompleto(t.getEmpleadoCierre() != null ? t.getEmpleadoCierre() : t.getEmpleado()));
            cierre.put("fechaCierre", t.getFechaCierre());
            info.put("ultimoCierre", cierre);
        });
        info.put("diferenciasPendientes",
                bitacoraRepository.findByResueltoFalseAndCategoriaInOrderByFechaHoraDesc(NOTAS_DE_DINERO));
        info.put("miTurno", turnoService.turnoParaAviso());
        return info;
    }

    @Transactional
    public TurnoCaja abrir(BigDecimal fondoInicial, String motivoDiferenciaApertura) {
        Optional<TurnoCaja> abierto = turnoAbierto();
        if (abierto.isPresent()) {
            TurnoCaja t = abierto.get();
            throw new IllegalStateException("La caja ya esta abierta por " + nombreCompleto(t.getEmpleado())
                    + " desde " + t.getFechaApertura().format(FORMATO_APERTURA)
                    + ". Opera sobre ese turno o cierralo antes de abrir otro.");
        }
        BigDecimal fondo = fondoInicial != null ? fondoInicial : BigDecimal.ZERO;
        if (fondo.signum() < 0) {
            throw new IllegalStateException("El fondo inicial no puede ser negativo.");
        }

        // Recibir la caja: lo contado debe coincidir con lo que dejo el turno anterior, o se explica y queda una nota.
        Optional<TurnoCaja> anterior = ultimoCierre();
        BigDecimal esperado = anterior.map(TurnoCaja::getEfectivoRealDeclarado).orElse(null);
        BigDecimal diferencia = esperado != null ? fondo.subtract(esperado) : null;
        boolean hayDiferencia = diferencia != null && diferencia.signum() != 0;
        String motivo = motivoDiferenciaApertura != null ? motivoDiferenciaApertura.trim() : "";
        if (hayDiferencia && motivo.isEmpty()) {
            throw new IllegalStateException("El efectivo que recibes no coincide con lo que dejo el turno anterior. "
                    + "Vuelve a contarlo; si el conteo es correcto, explica la diferencia para abrir la caja.");
        }
        if (motivo.length() > LARGO_MAXIMO_MOTIVO * 2) {
            throw new IllegalStateException("El motivo es demasiado largo.");
        }

        TurnoCaja turno = new TurnoCaja();
        turno.setEmpleado(usuarioActualService.obtenerEmpleado());
        turno.setFondoInicialEfectivo(fondo);
        turno.setEstado(EstadoTurno.ABIERTO);
        turno.setFechaApertura(LocalDateTime.now());
        if (esperado != null) {
            turno.setEfectivoAperturaEsperado(esperado);
            turno.setDiferenciaApertura(diferencia);
            turno.setMotivoDiferenciaApertura(hayDiferencia ? motivo : null);
        }
        TurnoCaja guardado;
        try {
            guardado = turnoCajaRepository.saveAndFlush(turno);
        } catch (DataIntegrityViolationException e) {
            // Dos personas abrieron a la vez: el indice unico parcial deja pasar solo a una.
            throw new IllegalStateException("La caja acaba de ser abierta por otra persona. Actualiza la pantalla.");
        }

        if (hayDiferencia) {
            String que = diferencia.signum() < 0 ? "FALTANTE" : "SOBRANTE";
            crearNotaDeDinero(guardado, APERTURA, diferencia,
                    "Caja recibida con " + que + " de S/ " + diferencia.abs().toPlainString()
                            + " respecto a lo que dejo el turno #" + anterior.get().getIdTurnoCaja()
                            + " (dejo S/ " + esperado.toPlainString() + ", se recibio S/ " + fondo.toPlainString()
                            + "). Motivo: " + motivo);
        }
        return guardado;
    }

    // ---------- Resumen y efectivo esperado ----------

    /**
     * Arqueo ciego: mientras el turno esta ABIERTO el cajero ve sus transacciones
     * pero NO el efectivo esperado; ese dato solo se revela una vez cerrado (o tras fallar el conteo).
     */
    public Map<String, Object> resumenTurno(@NonNull Integer idTurnoCaja, boolean revelarEsperado) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        List<Pago> pagos = pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(idTurnoCaja);
        List<MovimientoCaja> movimientos = movimientoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaHoraAsc(idTurnoCaja);

        Map<MetodoPago, BigDecimal> porMetodo = new EnumMap<>(MetodoPago.class);
        BigDecimal total = BigDecimal.ZERO;
        for (Pago p : pagos) {
            BigDecimal monto = p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO;
            porMetodo.merge(p.getMetodoPago(), monto, BigDecimal::add);
            total = total.add(monto);
        }
        BigDecimal totalMovimientos = movimientos.stream().map(MovimientoCaja::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal esperado = efectivoEsperado(turno, pagos, totalMovimientos);

        Map<String, Object> result = new HashMap<>();
        result.put("turno", turno);
        result.put("pagos", pagos);
        result.put("totalPorMetodo", porMetodo);
        result.put("totalCobrado", total);
        result.put("cantidadTransacciones", pagos.size());
        result.put("movimientos", movimientos);
        result.put("totalMovimientos", totalMovimientos);
        result.put("notas", bitacoraRepository.findByTurnoCajaIdTurnoCajaOrderByFechaHoraDesc(idTurnoCaja));
        boolean abierto = turno.getEstado() == EstadoTurno.ABIERTO;
        boolean revelado = revelarEsperado || Boolean.TRUE.equals(turno.getEsperadoRevelado());
        result.put("cierreCiego", abierto && !revelado);
        // Solo una alerta (sin monto): el cajero sabe que debe retirar, no cuanto espera el sistema.
        result.put("superaTope", abierto && esperado.compareTo(topeEfectivo) >= 0);
        result.put("topeEfectivo", topeEfectivo);

        if (!abierto || revelado) {
            result.put("efectivoEsperado", esperado);
        }
        result.put("arqueos", arqueosDelTurno(idTurnoCaja, !abierto || revelado || usuarioActualService.tieneRol(Roles.ADMINISTRADOR)));
        result.put("maximoArqueos", MAXIMO_ARQUEOS_PARCIALES);
        result.put("miTurno", turnoService.turnoParaAviso());
        return result;
    }

    /** Arqueos parciales del turno. Lo esperado y la diferencia solo salen para quien puede verlos (arqueo ciego). */
    private List<Map<String, Object>> arqueosDelTurno(Integer idTurnoCaja, boolean conMontos) {
        List<Map<String, Object>> lista = new java.util.ArrayList<>();
        for (ArqueoParcial a : arqueoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaHoraAsc(idTurnoCaja)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idArqueo", a.getIdArqueo());
            m.put("fechaHora", a.getFechaHora());
            m.put("empleado", nombreCompleto(a.getEmpleado()));
            m.put("efectivoContado", a.getEfectivoContado());
            m.put("resultado", a.getDiferencia().signum() == 0 ? "CUADRA" : a.getDiferencia().signum() < 0 ? "FALTA" : "SOBRA");
            if (conMontos) {
                m.put("efectivoEsperado", a.getEfectivoEsperado());
                m.put("diferencia", a.getDiferencia());
            }
            lista.add(m);
        }
        return lista;
    }

    private BigDecimal efectivoEsperadoDe(TurnoCaja turno) {
        return efectivoEsperado(turno,
                pagoRepository.findByTurnoCajaIdTurnoCajaOrderByFechaPagoAsc(turno.getIdTurnoCaja()),
                movimientoRepository.totalDelTurno(turno.getIdTurnoCaja()));
    }

    /** Fondo inicial + lo cobrado en efectivo - lo retirado o gastado en efectivo durante el turno. */
    private BigDecimal efectivoEsperado(TurnoCaja turno, List<Pago> pagos, BigDecimal movimientos) {
        BigDecimal fondo = turno.getFondoInicialEfectivo() != null
                ? turno.getFondoInicialEfectivo() : BigDecimal.ZERO;
        BigDecimal efectivo = pagos.stream()
                .filter(p -> p.getMetodoPago() == MetodoPago.EFECTIVO)
                .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return fondo.add(efectivo).subtract(movimientos != null ? movimientos : BigDecimal.ZERO);
    }

    // ---------- Cierre guiado ----------

    /**
     * Comprueba el conteo SIN cerrar. Si cuadra, se puede cerrar. Si no: la primera vez solo se dice si falta o sobra y
     * se pide recontar (sin dar el monto, para que el conteo sea honesto); desde la segunda se muestra lo que espera
     * el sistema. Cada intento fallido queda registrado en el turno.
     */
    @Transactional
    public Map<String, Object> verificarCierre(@NonNull Integer idTurnoCaja, BigDecimal declarado) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        exigirAbiertoYMonto(turno, declarado);

        BigDecimal esperado = efectivoEsperadoDe(turno);
        BigDecimal diferencia = declarado.subtract(esperado);
        Map<String, Object> r = new LinkedHashMap<>();

        if (diferencia.signum() == 0) {
            r.put("cuadra", true);
            r.put("mensaje", "El conteo cuadra con lo que espera el sistema. Puedes cerrar el turno.");
            r.put("reconteos", turno.getReconteosCierre());
            return r;
        }

        short previos = turno.getReconteosCierre() != null ? turno.getReconteosCierre() : 0;
        boolean revelar = previos >= 1;
        turno.setReconteosCierre((short) (previos + 1));
        if (revelar) {
            turno.setEsperadoRevelado(true);
        }
        turnoCajaRepository.save(turno);

        boolean falta = diferencia.signum() < 0;
        r.put("cuadra", false);
        r.put("direccion", falta ? "FALTA" : "SOBRA");
        r.put("intento", previos + 1);
        r.put("reconteos", previos + 1);
        r.put("revelado", revelar);
        if (revelar) {
            r.put("efectivoEsperado", esperado);
            r.put("diferencia", diferencia);
            r.put("mensaje", "Aun no cuadra: el sistema espera S/ " + esperado.toPlainString() + " y declaraste S/ "
                    + declarado.toPlainString() + " (" + (falta ? "faltan" : "sobran") + " S/ "
                    + diferencia.abs().toPlainString() + ").");
            r.put("recomendacion", falta
                    ? "Revisa si hay efectivo en otro lugar (cajon, bolsillo, sobre), si un retiro o gasto no se registro, "
                    + "o si se cobro en efectivo algo que se anoto como tarjeta. Si el conteo es definitivo puedes cerrar "
                    + "con diferencia: quedara una nota pendiente para el administrador."
                    : "Revisa si falta registrar un cobro en efectivo o si se devolvio dinero sin anotarlo. Si el conteo es "
                    + "definitivo puedes cerrar con diferencia: quedara una nota pendiente para el administrador.");
        } else {
            r.put("mensaje", falta
                    ? "No cuadra: parece que FALTA efectivo en la caja."
                    : "No cuadra: parece que SOBRA efectivo en la caja.");
            r.put("recomendacion", "Vuelve a contar billetes y monedas con calma, y revisa los retiros y gastos registrados "
                    + "en este turno. Si sigue sin cuadrar, al verificar de nuevo veras lo que espera el sistema.");
        }
        return r;
    }

    /**
     * Cierra el turno comparando lo declarado contra lo esperado. Una diferencia exige haber verificado el conteo y
     * explicar el motivo, y deja una nota de dinero pendiente de prioridad alta: no se pierde en el historial.
     */
    @Transactional
    public TurnoCaja cerrar(@NonNull Integer idTurnoCaja, BigDecimal efectivoDeclarado, String observaciones,
                            String motivoDiferencia, String desgloseCierre) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        exigirAbiertoYMonto(turno, efectivoDeclarado);

        BigDecimal esperado = efectivoEsperadoDe(turno);
        BigDecimal diferencia = efectivoDeclarado.subtract(esperado);
        boolean hayDiferencia = diferencia.signum() != 0;
        String motivo = motivoDiferencia != null ? motivoDiferencia.trim() : "";
        if (hayDiferencia) {
            short reconteos = turno.getReconteosCierre() != null ? turno.getReconteosCierre() : 0;
            if (reconteos < 1) {
                throw new IllegalStateException(
                        "Antes de cerrar con diferencia verifica el conteo y vuelve a contar el efectivo.");
            }
            if (motivo.isEmpty()) {
                throw new IllegalStateException("Explica el motivo de la diferencia antes de cerrar el turno.");
            }
        }
        if (desgloseCierre != null && desgloseCierre.length() > LARGO_MAXIMO_DESGLOSE) {
            throw new IllegalStateException("El desglose de billetes y monedas es demasiado largo.");
        }

        return registrarCierre(turno, efectivoDeclarado, esperado, diferencia, observaciones, motivo, desgloseCierre);
    }

    /** Guarda el cierre y, si hay diferencia, deja la nota de dinero pendiente. Lo comparten el cierre normal y el forzado. */
    private TurnoCaja registrarCierre(TurnoCaja turno, BigDecimal declarado, BigDecimal esperado, BigDecimal diferencia,
                                      String observaciones, String motivo, String desgloseCierre) {
        boolean hayDiferencia = diferencia.signum() != 0;
        turno.setEfectivoSistemaEsperado(esperado);
        turno.setEfectivoRealDeclarado(declarado);
        turno.setDiferenciaCuadre(diferencia);
        turno.setObservacionesCierre(observaciones);
        turno.setMotivoDiferencia(hayDiferencia ? motivo : null);
        turno.setDesgloseCierre(desgloseCierre != null && !desgloseCierre.isBlank() ? desgloseCierre : null);
        turno.setEstado(EstadoTurno.CERRADO);
        turno.setFechaCierre(LocalDateTime.now());
        Empleado quienCierra = usuarioActualService.obtenerEmpleado();
        turno.setEmpleadoCierre(quienCierra);
        TurnoCaja guardado = turnoCajaRepository.save(turno);

        if (hayDiferencia) {
            String que = diferencia.signum() < 0 ? "FALTANTE" : "SOBRANTE";
            crearNotaDeDinero(guardado, DESCUADRE, diferencia,
                    "Caja cerrada con " + que + " de S/ " + diferencia.abs().toPlainString() + " en efectivo (esperado S/ "
                            + esperado.toPlainString() + ", declarado S/ " + declarado.toPlainString()
                            + "). Cerro: " + nombreCompleto(quienCierra) + ". Motivo: " + motivo);
        }
        return guardado;
    }

    /**
     * Cierre forzado de un turno que se olvido abierto (mas horas que el limite). Solo el administrador: cuenta el
     * efectivo y explica el motivo; no pasa por la verificacion del cajero. Deja una nota de aviso para el siguiente turno
     * y, si el conteo no cuadra, la nota de dinero de siempre.
     */
    @Transactional
    public TurnoCaja cerrarForzado(@NonNull Integer idTurnoCaja, BigDecimal efectivoDeclarado, String motivo) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        exigirAbiertoYMonto(turno, efectivoDeclarado);
        long horas = horasAbierto(turno);
        if (horas < horasMaximasAbierta) {
            throw new IllegalStateException("El turno lleva " + horas + " h abierto (el limite es " + horasMaximasAbierta
                    + " h): usa el cierre normal.");
        }
        String razon = motivo != null ? motivo.trim() : "";
        if (razon.isEmpty()) {
            throw new IllegalStateException("Explica por que se fuerza el cierre (turno olvidado, relevo que no llego...).");
        }
        if (razon.length() > LARGO_MAXIMO_MOTIVO) {
            throw new IllegalStateException("El motivo no puede pasar de " + LARGO_MAXIMO_MOTIVO + " caracteres.");
        }
        BigDecimal esperado = efectivoEsperadoDe(turno);
        BigDecimal diferencia = efectivoDeclarado.subtract(esperado);
        TurnoCaja guardado = registrarCierre(turno, efectivoDeclarado, esperado, diferencia,
                "CIERRE FORZADO por el administrador tras " + horas + " h abierto: " + razon, razon, null);
        crearNota(guardado, CIERRE_FORZADO, "ALTA", null, "El administrador cerro este turno a la fuerza tras " + horas
                + " h abierto (abrio " + nombreCompleto(turno.getEmpleado()) + "). Motivo: " + razon);
        return guardado;
    }

    // ---------- Arqueo parcial ----------

    /**
     * Cuenta el efectivo a mitad de turno SIN cerrar. Quien cuenta solo ve si cuadra, falta o sobra (nunca el monto);
     * el administrador ve ademas lo esperado y la diferencia. Cada arqueo queda guardado y, si no cuadra, deja una nota.
     */
    @Transactional
    public Map<String, Object> arqueoParcial(BigDecimal contado) {
        TurnoCaja turno = exigirCajaAbierta();
        if (contado == null || contado.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Declara el efectivo que contaste en la caja.");
        }
        if (arqueoRepository.countByTurnoCajaIdTurnoCaja(turno.getIdTurnoCaja()) >= MAXIMO_ARQUEOS_PARCIALES) {
            throw new IllegalStateException("Ya hiciste el maximo de " + MAXIMO_ARQUEOS_PARCIALES
                    + " arqueos parciales de este turno. El conteo final se hace al cerrar.");
        }
        BigDecimal esperado = efectivoEsperadoDe(turno);
        BigDecimal diferencia = contado.subtract(esperado);
        Empleado quien = usuarioActualService.obtenerEmpleado();

        ArqueoParcial arqueo = new ArqueoParcial();
        arqueo.setTurnoCaja(turno);
        arqueo.setEmpleado(quien);
        arqueo.setFechaHora(LocalDateTime.now());
        arqueo.setEfectivoContado(contado);
        arqueo.setEfectivoEsperado(esperado);
        arqueo.setDiferencia(diferencia);
        arqueoRepository.save(arqueo);

        boolean cuadra = diferencia.signum() == 0;
        String resultado = cuadra ? "CUADRA" : diferencia.signum() < 0 ? "FALTA" : "SOBRA";
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("cuadra", cuadra);
        r.put("resultado", resultado);
        r.put("mensaje", cuadra
                ? "El efectivo cuadra con lo que espera el sistema."
                : "No cuadra: parece que " + (diferencia.signum() < 0 ? "FALTA" : "SOBRA")
                + " efectivo. Vuelve a contar y revisa los retiros y gastos registrados. Quedo anotado en la bitacora del turno.");
        if (usuarioActualService.tieneRol(Roles.ADMINISTRADOR)) {
            r.put("efectivoEsperado", esperado);
            r.put("diferencia", diferencia);
        }
        if (!cuadra) {
            crearNota(turno, ARQUEO, "MEDIA", null, "Arqueo parcial de " + arqueo.getFechaHora().format(FORMATO_HORA)
                    + " por " + nombreCompleto(quien) + ": " + (diferencia.signum() < 0 ? "FALTA" : "SOBRA")
                    + " efectivo (conto S/ " + contado.toPlainString() + ").");
        }
        return r;
    }

    private void exigirAbiertoYMonto(TurnoCaja turno, BigDecimal declarado) {
        if (turno.getEstado() != EstadoTurno.ABIERTO) {
            throw new IllegalStateException("El turno ya fue cerrado.");
        }
        if (declarado == null || declarado.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Debes declarar el efectivo contado en caja.");
        }
    }

    @Transactional
    public TurnoCaja auditar(@NonNull Integer idTurnoCaja) {
        TurnoCaja turno = obtenerPorId(idTurnoCaja);
        if (turno.getEstado() != EstadoTurno.CERRADO) {
            throw new IllegalStateException("Solo se pueden auditar turnos cerrados.");
        }
        long sinResolver = bitacoraRepository
                .countByTurnoCajaIdTurnoCajaAndResueltoFalseAndCategoriaIn(idTurnoCaja, NOTAS_DE_DINERO);
        if (sinResolver > 0) {
            throw new IllegalStateException("No se puede auditar: el turno tiene " + sinResolver
                    + " diferencia(s) de dinero sin resolver.");
        }
        turno.setEstado(EstadoTurno.AUDITADO);
        return turnoCajaRepository.save(turno);
    }

    // ---------- Retiros y gastos ----------

    /** Efectivo que sale de la caja durante el turno (retiro a custodia o gasto menor): baja el esperado. */
    @Transactional
    public MovimientoCaja registrarMovimiento(String tipo, BigDecimal monto, String motivo) {
        TurnoCaja turno = exigirCajaAbierta();
        String t = tipo != null ? tipo.trim().toUpperCase() : "";
        if (!MovimientoCaja.RETIRO.equals(t) && !MovimientoCaja.GASTO.equals(t)) {
            throw new IllegalStateException("El tipo de movimiento debe ser RETIRO o GASTO.");
        }
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("El monto del movimiento debe ser mayor a cero.");
        }
        String razon = motivo != null ? motivo.trim() : "";
        if (razon.isEmpty()) {
            throw new IllegalStateException("Indica el motivo del " + (MovimientoCaja.RETIRO.equals(t) ? "retiro" : "gasto") + ".");
        }
        if (razon.length() > LARGO_MAXIMO_MOTIVO) {
            throw new IllegalStateException("El motivo no puede pasar de " + LARGO_MAXIMO_MOTIVO + " caracteres.");
        }
        if (monto.compareTo(efectivoEsperadoDe(turno)) > 0) {
            throw new IllegalStateException("No puedes sacar mas efectivo del que hay en la caja.");
        }
        MovimientoCaja mov = new MovimientoCaja();
        mov.setTurnoCaja(turno);
        mov.setTipo(t);
        mov.setMonto(monto);
        mov.setMotivo(razon);
        mov.setEmpleado(usuarioActualService.obtenerEmpleado());
        mov.setFechaHora(LocalDateTime.now());
        return movimientoRepository.save(mov);
    }

    /**
     * Devuelve en efectivo al huesped un saldo a su favor al salir (sobrepago, consumos anulados, noches que no uso). Sale de
     * la caja abierta, queda ligada a la estadia y baja el efectivo que espera el arqueo. Nunca mas de lo que hay en caja.
     */
    @Transactional
    public MovimientoCaja registrarDevolucion(@NonNull Integer idEstadia, BigDecimal monto, String motivo) {
        TurnoCaja turno = exigirCajaAbierta();
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("El monto a devolver debe ser mayor a cero.");
        }
        if (monto.compareTo(efectivoEsperadoDe(turno)) > 0) {
            throw new IllegalStateException("No hay suficiente efectivo en la caja para devolver S/ " + monto.setScale(2)
                    + ". Registra un ingreso o deja la devolucion para cuando haya efectivo.");
        }
        String razon = motivo != null ? motivo.trim() : "";
        if (razon.length() > LARGO_MAXIMO_MOTIVO) {
            razon = razon.substring(0, LARGO_MAXIMO_MOTIVO);
        }
        MovimientoCaja mov = new MovimientoCaja();
        mov.setTurnoCaja(turno);
        mov.setTipo(MovimientoCaja.DEVOLUCION);
        mov.setMonto(monto);
        mov.setMotivo(razon.isEmpty() ? "Devolucion de saldo a favor del huesped" : razon);
        mov.setIdEstadia(idEstadia);
        mov.setEmpleado(usuarioActualService.obtenerEmpleado());
        mov.setFechaHora(LocalDateTime.now());
        return movimientoRepository.save(mov);
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
        if (categoria != null && NOTAS_DEL_SISTEMA.contains(categoria.trim().toUpperCase())) {
            throw new IllegalStateException("Esa categoria la genera el sistema (diferencias de dinero, arqueos y cierres forzados).");
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

    private void crearNotaDeDinero(TurnoCaja turno, String categoria, BigDecimal monto, String mensaje) {
        crearNota(turno, categoria, "ALTA", monto, mensaje);
    }

    private void crearNota(TurnoCaja turno, String categoria, String prioridad, BigDecimal monto, String mensaje) {
        BitacoraTurno nota = new BitacoraTurno();
        nota.setTurnoCaja(turno);
        nota.setCategoria(categoria);
        nota.setPrioridad(prioridad);
        nota.setMonto(monto);
        nota.setMensaje(mensaje);
        nota.setResuelto(false);
        nota.setFechaHora(LocalDateTime.now());
        bitacoraRepository.save(nota);
    }

    /**
     * Resolver una nota normal la puede hacer cualquiera de caja. Una diferencia de DINERO solo la resuelve el
     * administrador y con un comentario (repuesto, encontrado, ajuste autorizado...): asi no se deja pasar.
     */
    @Transactional
    public BitacoraTurno marcarResuelto(@NonNull Integer idBitacora, boolean resuelto, String comentario) {
        BitacoraTurno nota = bitacoraRepository.findById(idBitacora)
                .orElseThrow(() -> new EntityNotFoundException("Nota de bitacora no encontrada: " + idBitacora));
        boolean esDeDinero = nota.getCategoria() != null && NOTAS_DE_DINERO.contains(nota.getCategoria());
        String texto = comentario != null ? comentario.trim() : "";

        if (esDeDinero && !usuarioActualService.tieneRol(Roles.ADMINISTRADOR)) {
            throw new AccessDeniedException("Una diferencia de dinero solo la resuelve el administrador.");
        }
        if (resuelto && esDeDinero && texto.isEmpty()) {
            throw new IllegalStateException("Indica como se resolvio la diferencia (repuesto, encontrado, ajuste autorizado...).");
        }

        nota.setResuelto(resuelto);
        if (resuelto) {
            nota.setEmpleadoResolvio(usuarioActualService.empleadoOpcional());
            nota.setFechaResolucion(LocalDateTime.now());
            nota.setComentarioResolucion(texto.isEmpty() ? null : texto);
        } else {
            nota.setEmpleadoResolvio(null);
            nota.setFechaResolucion(null);
            nota.setComentarioResolucion(null);
        }
        return bitacoraRepository.save(nota);
    }

    /**
     * Notas sin resolver de todos los turnos, abiertos o cerrados: lo que hereda el relevo. Una sola consulta
     * (antes se hacia una por turno).
     */
    public List<BitacoraTurno> pendientesDeRelevo() {
        return bitacoraRepository.findByResueltoFalseOrderByFechaHoraDesc();
    }
}
