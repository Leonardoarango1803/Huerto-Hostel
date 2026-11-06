package pe.edu.utp.huertohostel.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pe.edu.utp.huertohostel.entity.AreaInsumo;
import pe.edu.utp.huertohostel.entity.Insumo;
import pe.edu.utp.huertohostel.security.Roles;
import pe.edu.utp.huertohostel.service.ReportesService.Dato;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Panel de inicio de cada rol. El servidor decide que se muestra segun quien entra (el administrador ve el
 * negocio, la cocina sus comandas, limpieza sus tareas...) y la pantalla solo dibuja: asi un rol nunca recibe
 * datos que no le tocan y agregar un indicador no obliga a tocar seis pantallas. El resultado de cada rol vive
 * unos segundos en memoria: con la pantalla refrescandose sola, varios usuarios comparten la misma consulta.
 */
@Service
public class DashboardService {

    private static final DateTimeFormatter DIA_MES = DateTimeFormatter.ofPattern("dd/MM");
    private static final int MINUTOS_DEMORA = 15;

    private final JdbcTemplate jdbc;
    private final CacheEnMemoria cache;
    private final Clock reloj;
    private final ReportesService reportes;
    private final InventarioService inventarioService;
    private final BigDecimal topeEfectivo;
    private final int horasMaximasCaja;
    private final TurnoService turnoService;

    public DashboardService(JdbcTemplate jdbc, CacheEnMemoria cache, Clock reloj, ReportesService reportes,
                            InventarioService inventarioService, TurnoService turnoService,
                            @org.springframework.beans.factory.annotation.Value("${app.caja.tope-efectivo:1000}") BigDecimal topeEfectivo,
                            @org.springframework.beans.factory.annotation.Value("${app.caja.horas-maximas-abierta:16}") int horasMaximasCaja) {
        this.topeEfectivo = topeEfectivo;
        this.horasMaximasCaja = horasMaximasCaja;
        this.turnoService = turnoService;
        this.jdbc = jdbc;
        this.cache = cache;
        this.reloj = reloj;
        this.reportes = reportes;
        this.inventarioService = inventarioService;
    }

    // ---------- Formas de respuesta ----------

    /** formato: numero, soles, porcentaje, minutos o texto. tono: verde, ambar, rojo, azul o gris. */
    public record Kpi(String id, String titulo, BigDecimal valor, String formato, String texto, String detalle,
                      String tono, String ruta, BigDecimal variacionPct) {
    }

    /** tipo: alerta, aviso u ok. */
    public record Aviso(String tipo, String titulo, String detalle, String ruta) {
    }

    public record Punto(String nombre, BigDecimal valor) {
    }

    /** tipo: barras, lineas o torta. */
    public record Grafico(String id, String titulo, String tipo, String formato, List<Punto> puntos) {
    }

    public record Lista(String id, String titulo, String vacio, String ruta, List<String> columnas,
                        List<List<String>> filas) {
    }

    public record Panel(LocalDateTime generadoEn, String rol, String titulo, String subtitulo, List<Kpi> kpis,
                        List<Aviso> avisos, List<Dato> habitaciones, List<Grafico> graficos, List<Lista> listas) {
    }

    // ---------- Entrada ----------

    public Panel panel(String rol, boolean refrescar) {
        if (refrescar) {
            cache.limpiar();
        }
        return cache.panel("panel:" + rol, false, () -> construir(rol));
    }

    private Panel construir(String rol) {
        return switch (rol) {
            case Roles.ADMINISTRADOR -> administrador();
            case Roles.RECEPCIONISTA -> recepcion();
            case Roles.CAJERO -> cajero();
            case Roles.COCINA -> cocinaBar(rol, "COCINA", "Cocina", Set.of(AreaInsumo.COCINA, AreaInsumo.GENERAL));
            case Roles.BAR -> cocinaBar(rol, "BAR", "Bar", Set.of(AreaInsumo.BAR, AreaInsumo.GENERAL));
            case Roles.HOUSEKEEPING -> limpieza();
            default -> throw new IllegalArgumentException("Este rol no tiene panel.");
        };
    }

    // ---------- Paneles por rol ----------

    private Panel administrador() {
        LocalDate hoy = hoy();
        Habitaciones hab = habitaciones();
        Cobros cobros = cobros(hoy);
        Movimiento mov = movimientoHoy(hoy);
        Caja caja = caja();
        BigDecimal porCobrar = porCobrar();

        List<Kpi> kpis = List.of(
                kpiOcupacion(hab),
                new Kpi("cobrado", "Cobrado hoy", cobros.hoy(), "soles", null, cobros.cantidad() + " cobro(s)",
                        "verde", "/pagos", ReportesService.variacion(cobros.hoy(), cobros.ayer())),
                new Kpi("porCobrar", "Por cobrar", porCobrar, "soles", null, "en las estadias en curso", "ambar", "/checkout", null),
                kpiLlegadas(mov),
                kpiSalidas(mov),
                kpiCaja(caja, true));

        List<Aviso> avisos = new ArrayList<>();
        avisosCaja(avisos, caja, mov, true);
        avisosReservas(avisos);
        avisosComandas(avisos, null);
        avisosOperacion(avisos, true, true, true);
        avisosInventario(avisos);
        avisosBitacora(avisos);
        avisosCobertura(avisos);
        completarAvisos(avisos);

        Periodo catorce = new Periodo(hoy.minusDays(13), hoy);
        Periodo mes = new Periodo(hoy.withDayOfMonth(1), hoy);
        List<Grafico> graficos = List.of(
                new Grafico("ocupacion14", "Ocupacion de los ultimos 14 dias (%)", "lineas", "porcentaje",
                        reportes.ocupacion(catorce, false).serie().stream()
                                .map(d -> new Punto(d.fecha().format(DIA_MES), d.ocupacionPct())).toList()),
                new Grafico("cobrado14", "Cobrado en los ultimos 14 dias (S/)", "barras", "soles",
                        reportes.ingresos(catorce, false).serie().stream()
                                .map(d -> new Punto(d.fecha().format(DIA_MES), d.cobrado())).toList()),
                new Grafico("areaMes", "Facturado por area este mes (S/)", "barras", "soles",
                        reportes.ingresos(mes, false).porArea().stream()
                                .map(d -> new Punto(d.clave(), d.monto())).toList()),
                new Grafico("metodoHoy", "Cobrado hoy por metodo (S/)", "torta", "soles",
                        cobros.porMetodo().stream().map(d -> new Punto(d.clave(), d.monto())).toList()));

        List<Lista> listas = List.of(
                listaLlegadas(hoy), listaSalidas(hoy), listaPendientesAdelanto(), listaUltimosCierres(),
                listaTopProductos(hoy, null, "Mas vendidos hoy"), listaDeTurnoAhora());

        return new Panel(ahora(), Roles.ADMINISTRADOR, "Panel gerencial",
                "Resumen en vivo de la operacion del hostel.", kpis, avisos, hab.porEstado(), graficos, listas);
    }

    private Panel recepcion() {
        LocalDate hoy = hoy();
        Habitaciones hab = habitaciones();
        Movimiento mov = movimientoHoy(hoy);
        Caja caja = caja();

        List<Kpi> kpis = List.of(
                kpiOcupacion(hab),
                new Kpi("disponibles", "Habitaciones libres", BigDecimal.valueOf(hab.cantidad("DISPONIBLE")), "numero", null,
                        "listas para vender", "verde", "/habitaciones", null),
                kpiLlegadas(mov), kpiSalidas(mov), kpiCaja(caja, false));

        List<Aviso> avisos = new ArrayList<>();
        avisosCaja(avisos, caja, mov, true);
        avisosReservas(avisos);
        avisosComandas(avisos, null);
        avisosOperacion(avisos, true, true, true);
        avisosBitacora(avisos);
        completarAvisos(avisos);

        Periodo siete = new Periodo(hoy.minusDays(6), hoy);
        List<Grafico> graficos = List.of(new Grafico("ocupacion7", "Ocupacion de los ultimos 7 dias (%)", "lineas", "porcentaje",
                reportes.ocupacion(siete, false).serie().stream()
                        .map(d -> new Punto(d.fecha().format(DIA_MES), d.ocupacionPct())).toList()));

        return new Panel(ahora(), Roles.RECEPCIONISTA, "Panel de recepcion",
                "Llegadas, salidas y lo que necesita atencion ahora.", kpis, avisos, hab.porEstado(), graficos,
                List.of(listaLlegadas(hoy), listaSalidas(hoy), listaPendientesAdelanto(), listaDeTurnoAhora()));
    }

    private Panel cajero() {
        LocalDate hoy = hoy();
        Habitaciones hab = habitaciones();
        Cobros cobros = cobros(hoy);
        Caja caja = caja();

        List<Kpi> kpis = List.of(
                kpiCaja(caja, false),
                // El efectivo que ESPERA el sistema no se muestra a quien cuenta la caja: el conteo tiene que ser honesto.
                new Kpi("efectivoTurno", "Efectivo cobrado en el turno", caja.abierta() ? caja.efectivoCobrado() : BigDecimal.ZERO, "soles", null,
                        caja.abierta() ? "cobros en efectivo de este turno" : "sin turno abierto", "azul", "/caja", null),
                new Kpi("cobrado", "Cobrado hoy", cobros.hoy(), "soles", null, cobros.cantidad() + " cobro(s)", "verde", "/pagos",
                        ReportesService.variacion(cobros.hoy(), cobros.ayer())),
                new Kpi("porCobrar", "Por cobrar", porCobrar(), "soles", null, "en las estadias en curso", "ambar", "/checkout", null));

        List<Aviso> avisos = new ArrayList<>();
        avisosCaja(avisos, caja, movimientoHoy(hoy), true);
        avisosBitacora(avisos);
        completarAvisos(avisos);

        return new Panel(ahora(), Roles.CAJERO, "Panel de caja", "Cobros del dia y estado del turno.", kpis, avisos,
                hab.porEstado(),
                List.of(new Grafico("metodoHoy", "Cobrado hoy por metodo (S/)", "torta", "soles",
                        cobros.porMetodo().stream().map(d -> new Punto(d.clave(), d.monto())).toList())),
                List.of(listaSalidas(hoy), listaUltimosCierres()));
    }

    private Panel cocinaBar(String rol, String area, String nombre, Set<AreaInsumo> areasInsumo) {
        LocalDate hoy = hoy();
        Map<String, Long> estados = comandasActivasPorEstado(area);
        long pendientes = estados.getOrDefault("PENDIENTE", 0L);
        long enPreparacion = estados.getOrDefault("EN_PREPARACION", 0L);
        long listas = estados.getOrDefault("PREPARADA", 0L);
        long demoradas = comandasDemoradas(area);
        long entregadas = contar("SELECT COUNT(*) FROM comanda WHERE area_destino = CAST(? AS area_destino_enum) AND fecha_entregada >= ? AND fecha_entregada < ?",
                area, hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay());
        BigDecimal minutos = decimal(jdbc.queryForObject("""
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_preparada - fecha_registro)) / 60), 0) FROM comanda
                WHERE area_destino = CAST(? AS area_destino_enum) AND fecha_preparada >= ? AND fecha_preparada < ?
                """, Object.class, area, hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay())).setScale(1, RoundingMode.HALF_UP);

        List<Kpi> kpis = List.of(
                new Kpi("activas", "Comandas activas", BigDecimal.valueOf(pendientes + enPreparacion + listas), "numero", null,
                        "de " + nombre.toLowerCase(), "azul", "/comandas", null),
                new Kpi("pendientes", "Pendientes", BigDecimal.valueOf(pendientes), "numero", null, "sin empezar",
                        pendientes > 0 ? "ambar" : "gris", "/comandas", null),
                new Kpi("preparacion", "En preparacion", BigDecimal.valueOf(enPreparacion), "numero", null,
                        listas + " lista(s) para entregar", "azul", "/comandas", null),
                new Kpi("demoradas", "Demoradas", BigDecimal.valueOf(demoradas), "numero", null,
                        "mas de " + MINUTOS_DEMORA + " minutos esperando", demoradas > 0 ? "rojo" : "verde", "/comandas", null),
                new Kpi("entregadas", "Entregadas hoy", BigDecimal.valueOf(entregadas), "numero", null, "comandas atendidas", "verde", "/comandas", null),
                new Kpi("tiempo", "Tiempo de preparacion", minutos, "minutos", null, "promedio de hoy", "gris", null, null));

        List<Aviso> avisos = new ArrayList<>();
        avisosComandas(avisos, area);
        avisosInventarioArea(avisos, areasInsumo);
        completarAvisos(avisos);

        List<Grafico> graficos = List.of(new Grafico("estados", "Comandas activas por estado", "barras", "numero",
                List.of(new Punto("Pendientes", BigDecimal.valueOf(pendientes)),
                        new Punto("En preparacion", BigDecimal.valueOf(enPreparacion)),
                        new Punto("Listas", BigDecimal.valueOf(listas)))));

        return new Panel(ahora(), rol, "Panel de " + nombre.toLowerCase(), "Comandas por atender y stock de tu area.",
                kpis, avisos, List.of(), graficos,
                List.of(listaComandasActivas(area), listaStockBajo(areasInsumo, "Insumos por reponer"),
                        listaTopProductos(hoy, area, "Mas vendidos hoy")));
    }

    private Panel limpieza() {
        LocalDate hoy = hoy();
        Habitaciones hab = habitaciones();
        long porLimpiar = hab.cantidad("PENDIENTE_LIMPIEZA") + hab.cantidad("EN_LIMPIEZA");
        Map<String, Long> tareas = new java.util.HashMap<>();
        for (Dato d : datos("SELECT estado::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM tarea_limpieza WHERE estado <> 'COMPLETADA' GROUP BY 1")) {
            tareas.put(d.clave(), d.cantidad());
        }
        long completadasHoy = contar("SELECT COUNT(*) FROM tarea_limpieza WHERE fecha_fin >= ? AND fecha_fin < ?", hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay());
        long incidencias = contar("SELECT COUNT(*) FROM incidencia_mantenimiento WHERE estado IN ('PENDIENTE', 'EN_REPARACION')");
        long solicitudes = contar("SELECT COUNT(*) FROM solicitud_servicio WHERE estado IN ('PENDIENTE','ASIGNADA','EN_ATENCION')");

        List<Kpi> kpis = List.of(
                new Kpi("porLimpiar", "Por limpiar", BigDecimal.valueOf(porLimpiar), "numero", null, "habitaciones pendientes o en limpieza",
                        porLimpiar > 0 ? "ambar" : "verde", "/limpieza", null),
                new Kpi("pendientes", "Tareas pendientes", BigDecimal.valueOf(tareas.getOrDefault("PENDIENTE", 0L)), "numero", null, "sin empezar", "ambar", "/limpieza", null),
                new Kpi("enProceso", "En proceso", BigDecimal.valueOf(tareas.getOrDefault("EN_PROCESO", 0L)), "numero", null, "limpiandose ahora", "azul", "/limpieza", null),
                new Kpi("completadas", "Completadas hoy", BigDecimal.valueOf(completadasHoy), "numero", null, "tareas terminadas", "verde", "/limpieza", null),
                new Kpi("incidencias", "Incidencias abiertas", BigDecimal.valueOf(incidencias), "numero", null, "pendientes o en reparacion",
                        incidencias > 0 ? "rojo" : "verde", "/incidencias", null),
                new Kpi("solicitudes", "Solicitudes pendientes", BigDecimal.valueOf(solicitudes), "numero", null, "del huesped",
                        solicitudes > 0 ? "ambar" : "verde", "/solicitudes", null));

        List<Aviso> avisos = new ArrayList<>();
        avisosOperacion(avisos, true, true, true);
        avisosInventarioArea(avisos, Set.of(AreaInsumo.LIMPIEZA));
        completarAvisos(avisos);

        return new Panel(ahora(), Roles.HOUSEKEEPING, "Panel de limpieza", "Habitaciones por preparar y pedidos pendientes.",
                kpis, avisos, hab.porEstado(),
                List.of(new Grafico("tareas", "Tareas abiertas por estado", "barras", "numero",
                        List.of(new Punto("Pendientes", BigDecimal.valueOf(tareas.getOrDefault("PENDIENTE", 0L))),
                                new Punto("En proceso", BigDecimal.valueOf(tareas.getOrDefault("EN_PROCESO", 0L)))))),
                List.of(listaTareasLimpieza(), listaIncidencias(), listaSolicitudes(),
                        listaStockBajo(Set.of(AreaInsumo.LIMPIEZA), "Insumos de limpieza por reponer")));
    }

    // ---------- Datos compartidos ----------

    private record Habitaciones(List<Dato> porEstado) {
        long cantidad(String estado) {
            return porEstado.stream().filter(d -> d.clave().equals(estado)).mapToLong(Dato::cantidad).sum();
        }

        long total() {
            return porEstado.stream().mapToLong(Dato::cantidad).sum();
        }
    }

    private Habitaciones habitaciones() {
        return new Habitaciones(datos("SELECT estado_operativo::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM habitacion WHERE estado = true GROUP BY 1 ORDER BY 3 DESC"));
    }

    private Kpi kpiOcupacion(Habitaciones hab) {
        long ocupadas = hab.cantidad("OCUPADA");
        return new Kpi("ocupacion", "Ocupacion hoy", ReportesService.porcentaje(ocupadas, hab.total()), "porcentaje", null,
                ocupadas + " de " + hab.total() + " habitaciones", "azul", "/habitaciones", null);
    }

    private record Cobros(BigDecimal hoy, BigDecimal ayer, long cantidad, List<Dato> porMetodo) {
    }

    private Cobros cobros(LocalDate hoy) {
        LocalDateTime desde = hoy.atStartOfDay();
        LocalDateTime hasta = hoy.plusDays(1).atStartOfDay();
        BigDecimal deHoy = ReportesService.dinero(decimal(jdbc.queryForObject("SELECT COALESCE(SUM(monto), 0) FROM pago WHERE fecha_pago >= ? AND fecha_pago < ?", Object.class, desde, hasta)));
        BigDecimal deAyer = ReportesService.dinero(decimal(jdbc.queryForObject("SELECT COALESCE(SUM(monto), 0) FROM pago WHERE fecha_pago >= ? AND fecha_pago < ?", Object.class, desde.minusDays(1), desde)));
        long cantidad = contar("SELECT COUNT(*) FROM pago WHERE fecha_pago >= ? AND fecha_pago < ?", desde, hasta);
        return new Cobros(deHoy, deAyer, cantidad,
                datos("SELECT metodo_pago::text AS clave, SUM(monto) AS monto, COUNT(*) AS cantidad FROM pago WHERE fecha_pago >= ? AND fecha_pago < ? GROUP BY 1 ORDER BY 2 DESC", desde, hasta));
    }

    private BigDecimal porCobrar() {
        return ReportesService.dinero(decimal(jdbc.queryForObject("""
                SELECT COALESCE(SUM(r.monto_alojamiento_total
                    + COALESCE((SELECT SUM(c.total_consumo) FROM consumo_estadia c WHERE c.id_estadia = e.id_estadia), 0)
                    - COALESCE((SELECT SUM(pg.monto) FROM pago pg WHERE pg.id_estadia = e.id_estadia OR pg.id_reserva = r.id_reserva), 0)), 0)
                FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva WHERE e.estado_estadia = 'EN_CURSO'
                """, Object.class)));
    }

    private record Movimiento(long llegadasEsperadas, long llegadasPendientes, long salidasPendientes, long salidasHechas) {
    }

    private Movimiento movimientoHoy(LocalDate hoy) {
        long esperadas = contar("SELECT COUNT(*) FROM reserva WHERE fecha_checkin_previsto = ? AND estado_reserva <> 'CANCELADA'", hoy);
        long pendientes = contar("SELECT COUNT(*) FROM reserva WHERE fecha_checkin_previsto = ? AND estado_reserva IN ('CONFIRMADA', 'PENDIENTE_ADELANTO')", hoy);
        long salidas = contar("SELECT COUNT(*) FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva WHERE e.estado_estadia = 'EN_CURSO' AND r.fecha_checkout_previsto <= ?", hoy);
        long hechas = contar("SELECT COUNT(*) FROM estadia WHERE fecha_checkout_real >= ? AND fecha_checkout_real < ?", hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay());
        return new Movimiento(esperadas, pendientes, salidas, hechas);
    }

    private Kpi kpiLlegadas(Movimiento m) {
        return new Kpi("llegadas", "Llegadas pendientes", BigDecimal.valueOf(m.llegadasPendientes()), "numero", null,
                "de " + m.llegadasEsperadas() + " esperadas hoy", "azul", "/checkin", null);
    }

    private Kpi kpiSalidas(Movimiento m) {
        return new Kpi("salidas", "Salidas por procesar", BigDecimal.valueOf(m.salidasPendientes()), "numero", null,
                m.salidasHechas() + " ya salieron hoy", "ambar", "/checkout", null);
    }

    private record Caja(boolean abierta, Integer idTurno, String abrio, LocalDateTime desde, BigDecimal esperado,
                        BigDecimal efectivoCobrado) {
    }

    private Caja caja() {
        List<Map<String, Object>> filas = jdbc.queryForList("""
                SELECT t.id_turno_caja AS id, e.nombres || ' ' || e.apellidos AS abrio, t.fecha_apertura AS desde,
                       t.fondo_inicial_efectivo + COALESCE((SELECT SUM(p.monto) FROM pago p
                            WHERE p.id_turno_caja = t.id_turno_caja AND p.metodo_pago = 'EFECTIVO'), 0)
                            - COALESCE((SELECT SUM(m.monto) FROM movimiento_caja m WHERE m.id_turno_caja = t.id_turno_caja), 0) AS esperado,
                       COALESCE((SELECT SUM(p.monto) FROM pago p
                            WHERE p.id_turno_caja = t.id_turno_caja AND p.metodo_pago = 'EFECTIVO'), 0) AS efectivo_cobrado
                FROM turno_caja t JOIN empleado e ON e.id_empleado = t.id_empleado
                WHERE t.estado = 'ABIERTO' ORDER BY t.fecha_apertura DESC LIMIT 1
                """);
        if (filas.isEmpty()) {
            return new Caja(false, null, null, null, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        Map<String, Object> f = filas.get(0);
        return new Caja(true, ((Number) f.get("id")).intValue(), (String) f.get("abrio"),
                ((java.sql.Timestamp) f.get("desde")).toLocalDateTime(), ReportesService.dinero(decimal(f.get("esperado"))),
                ReportesService.dinero(decimal(f.get("efectivo_cobrado"))));
    }

    /** Solo el administrador ve el efectivo que espera el sistema; quien cuenta la caja no (arqueo ciego). */
    private Kpi kpiCaja(Caja c, boolean verEsperado) {
        return new Kpi("caja", "Caja", null, "texto", c.abierta() ? "Abierta" : "Cerrada",
                c.abierta() ? "por " + c.abrio() + (verEsperado ? " · efectivo esperado S/ " + c.esperado().toPlainString() : "")
                        : "no se pueden registrar cobros",
                c.abierta() ? "verde" : "rojo", "/caja", null);
    }

    private Map<String, Long> comandasActivasPorEstado(String area) {
        Map<String, Long> m = new java.util.HashMap<>();
        String filtro = area != null ? " AND area_destino = CAST(? AS area_destino_enum)" : "";
        Object[] args = area != null ? new Object[]{area} : new Object[0];
        for (Dato d : datos("SELECT estado_comanda::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM comanda WHERE estado_comanda IN ('PENDIENTE','EN_PREPARACION','PREPARADA')"
                + filtro + " GROUP BY 1", args)) {
            m.put(d.clave(), d.cantidad());
        }
        return m;
    }

    private long comandasDemoradas(String area) {
        String filtro = area != null ? " AND area_destino = CAST(? AS area_destino_enum)" : "";
        LocalDateTime limite = ahora().minusMinutes(MINUTOS_DEMORA);
        return area != null
                ? contar("SELECT COUNT(*) FROM comanda WHERE estado_comanda IN ('PENDIENTE','EN_PREPARACION','PREPARADA') AND fecha_registro < ?" + filtro, limite, area)
                : contar("SELECT COUNT(*) FROM comanda WHERE estado_comanda IN ('PENDIENTE','EN_PREPARACION','PREPARADA') AND fecha_registro < ?", limite);
    }

    // ---------- Avisos ----------

    private void avisosCaja(List<Aviso> avisos, Caja caja, Movimiento mov, boolean conDiferencias) {
        if (!caja.abierta()) {
            avisos.add(mov.llegadasPendientes() > 0
                    ? new Aviso("alerta", "La caja esta cerrada y hay " + mov.llegadasPendientes() + " llegada(s) hoy",
                    "Sin caja abierta no se pueden registrar adelantos, check-in ni cobros.", "/caja")
                    : new Aviso("aviso", "La caja esta cerrada", "Abre un turno para registrar cobros.", "/caja"));
        }
        long horasAbierta = caja.abierta() ? java.time.Duration.between(caja.desde(), ahora()).toHours() : 0;
        if (caja.abierta() && horasAbierta >= horasMaximasCaja) {
            avisos.add(new Aviso("alerta", "La caja lleva " + horasAbierta + " h abierta: parece que se olvido cerrar",
                    "Abrio " + caja.abrio() + ". Cierrala con su arqueo o, si no esta quien la abrio, el administrador puede forzar el cierre.", "/caja"));
        }
        if (caja.abierta() && caja.esperado().compareTo(topeEfectivo) >= 0) {
            avisos.add(new Aviso("aviso", "Hay mucho efectivo en la caja: considera un retiro a custodia",
                    "Superaste el tope de S/ " + topeEfectivo.toPlainString() + ". Registralo en Caja como retiro.", "/caja"));
        }
        if (conDiferencias) {
            Map<String, Object> d = jdbc.queryForMap("""
                    SELECT COUNT(*) AS n,
                           COALESCE(SUM(monto) FILTER (WHERE monto < 0), 0) AS faltante,
                           COALESCE(SUM(monto) FILTER (WHERE monto > 0), 0) AS sobrante
                    FROM bitacora_turno WHERE resuelto = false AND categoria IN ('DESCUADRE', 'APERTURA')
                    """);
            long n = ((Number) d.get("n")).longValue();
            if (n > 0) {
                BigDecimal falta = decimal(d.get("faltante")).abs();
                BigDecimal sobra = decimal(d.get("sobrante"));
                List<String> partes = new ArrayList<>();
                if (falta.signum() > 0) partes.add("faltan S/ " + falta.toPlainString());
                if (sobra.signum() > 0) partes.add("sobran S/ " + sobra.toPlainString());
                avisos.add(new Aviso("alerta", n + " diferencia(s) de dinero en caja sin resolver: " + String.join(" y ", partes),
                        "Solo el administrador las resuelve, con un comentario. Se ven en Caja.", "/caja"));
            }
        }
    }

    private void avisosReservas(List<Aviso> avisos) {
        List<Map<String, Object>> f = jdbc.queryForList("""
                SELECT COUNT(*) AS n, MIN(fecha_checkin_previsto) AS proxima FROM reserva WHERE estado_reserva = 'PENDIENTE_ADELANTO'
                """);
        long n = ((Number) f.get(0).get("n")).longValue();
        if (n > 0) {
            Object proxima = f.get(0).get("proxima");
            avisos.add(new Aviso("aviso", n + " reserva(s) sin adelanto",
                    "Se liberan solas al llegar su dia de check-in" + (proxima != null ? "; la mas cercana, el "
                            + ((java.sql.Date) proxima).toLocalDate().format(DIA_MES) : "") + ".", "/reservas"));
        }
    }

    private void avisosComandas(List<Aviso> avisos, String area) {
        long demoradas = comandasDemoradas(area);
        if (demoradas > 0) {
            avisos.add(new Aviso("alerta", demoradas + " comanda(s) demorada(s)",
                    "Llevan mas de " + MINUTOS_DEMORA + " minutos sin entregarse.", "/comandas"));
        }
    }

    private void avisosOperacion(List<Aviso> avisos, boolean limpieza, boolean incidencias, boolean solicitudes) {
        if (limpieza) {
            long n = contar("SELECT COUNT(*) FROM habitacion WHERE estado = true AND estado_operativo IN ('PENDIENTE_LIMPIEZA', 'EN_LIMPIEZA')");
            if (n > 0) {
                avisos.add(new Aviso("aviso", n + " habitacion(es) por limpiar", "Pendientes o en proceso de limpieza.", "/limpieza"));
            }
        }
        if (incidencias) {
            long n = contar("SELECT COUNT(*) FROM incidencia_mantenimiento WHERE estado IN ('PENDIENTE', 'EN_REPARACION')");
            if (n > 0) {
                avisos.add(new Aviso("alerta", n + " incidencia(s) de mantenimiento abierta(s)", "Pendientes o en reparacion.", "/incidencias"));
            }
        }
        if (solicitudes) {
            long n = contar("SELECT COUNT(*) FROM solicitud_servicio WHERE estado IN ('PENDIENTE','ASIGNADA','EN_ATENCION')");
            if (n > 0) {
                avisos.add(new Aviso("aviso", n + " solicitud(es) del huesped sin atender", "Pedidos desde el portal.", "/solicitudes"));
            }
        }
    }

    private void avisosBitacora(List<Aviso> avisos) {
        long n = contar("SELECT COUNT(*) FROM bitacora_turno WHERE resuelto = false");
        if (n > 0) {
            avisos.add(new Aviso("aviso", n + " nota(s) de turno sin resolver", "Notas de turno pendientes. Se resuelven desde Caja.", "/caja"));
        }
    }

    /** Recepcion siempre debe estar cubierta: si nadie del turno en curso es recepcionista, el administrador lo sabe. */
    private void avisosCobertura(List<Aviso> avisos) {
        if (!turnoService.hayCobertura(Roles.RECEPCIONISTA)) {
            avisos.add(new Aviso("aviso", "Nadie de recepcion esta asignado al turno en curso",
                    "Ningun recepcionista activo tiene este horario. Revisa las asignaciones en Turnos.", "/turnos"));
        }
    }

    private Lista listaDeTurnoAhora() {
        List<List<String>> filas = new ArrayList<>();
        for (Map<String, Object> e : turnoService.enServicio(null)) {
            filas.add(List.of(e.get("nombres") + " " + e.get("apellidos"), String.valueOf(e.get("rol")), String.valueOf(e.get("turno"))));
        }
        return new Lista("deTurno", "De turno ahora", "Nadie tiene asignado el turno en curso.", "/turnos",
                List.of("Empleado", "Rol", "Turno"), filas);
    }

    private void avisosInventario(List<Aviso> avisos) {
        Map<String, Object> inv = inventarioService.alertas();
        long agotados = ((Number) inv.get("insumosAgotados")).longValue();
        long bajos = ((Number) inv.get("insumosStockBajo")).longValue();
        long faltantes = ((Number) inv.get("faltantesUltimos7Dias")).longValue();
        if (agotados > 0 || bajos > 0 || faltantes > 0) {
            List<String> partes = new ArrayList<>();
            if (agotados > 0) partes.add(agotados + " agotado(s)");
            if (bajos > agotados) partes.add((bajos - agotados) + " bajo el minimo");
            if (faltantes > 0) partes.add(faltantes + " venta(s) descontaron mas de lo registrado esta semana");
            avisos.add(new Aviso(agotados > 0 ? "alerta" : "aviso", "Inventario: " + String.join(" · ", partes), "Revisa el almacen.", "/inventario"));
        }
    }

    private void avisosInventarioArea(List<Aviso> avisos, Set<AreaInsumo> areas) {
        long n = stockBajo(areas).size();
        if (n > 0) {
            avisos.add(new Aviso("aviso", n + " insumo(s) por reponer", "En o por debajo del stock minimo.", "/inventario"));
        }
    }

    private static void completarAvisos(List<Aviso> avisos) {
        if (avisos.isEmpty()) {
            avisos.add(new Aviso("ok", "Todo en orden", "No hay pendientes que atender ahora.", null));
        }
    }

    // ---------- Listas ----------

    private Lista listaLlegadas(LocalDate hoy) {
        List<List<String>> filas = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT c.nombres || ' ' || c.apellidos AS huesped, h.numero, r.estado_reserva::text AS estado, r.num_noches AS noches
                FROM reserva r JOIN cliente c ON c.id_cliente = r.id_cliente JOIN habitacion h ON h.id_habitacion = r.id_habitacion
                WHERE r.fecha_checkin_previsto = ? AND r.estado_reserva IN ('CONFIRMADA', 'PENDIENTE_ADELANTO', 'EN_CURSO')
                ORDER BY h.numero LIMIT 10
                """, hoy)) {
            filas.add(List.of((String) f.get("huesped"), "Hab. " + f.get("numero"), etiquetaReserva((String) f.get("estado")), f.get("noches") + " noche(s)"));
        }
        return new Lista("llegadas", "Llegadas de hoy", "No hay llegadas previstas para hoy.", "/checkin",
                List.of("Huesped", "Habitacion", "Estado", "Estadia"), filas);
    }

    private Lista listaSalidas(LocalDate hoy) {
        List<List<String>> filas = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT c.nombres || ' ' || c.apellidos AS huesped, h.numero,
                       r.monto_alojamiento_total
                         + COALESCE((SELECT SUM(co.total_consumo) FROM consumo_estadia co WHERE co.id_estadia = e.id_estadia), 0)
                         - COALESCE((SELECT SUM(pg.monto) FROM pago pg WHERE pg.id_estadia = e.id_estadia OR pg.id_reserva = r.id_reserva), 0) AS saldo
                FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva JOIN cliente c ON c.id_cliente = r.id_cliente
                JOIN habitacion h ON h.id_habitacion = e.id_habitacion
                WHERE e.estado_estadia = 'EN_CURSO' AND r.fecha_checkout_previsto <= ?
                ORDER BY h.numero LIMIT 10
                """, hoy)) {
            filas.add(List.of((String) f.get("huesped"), "Hab. " + f.get("numero"), "S/ " + ReportesService.dinero(decimal(f.get("saldo"))).toPlainString()));
        }
        return new Lista("salidas", "Salidas por procesar", "Nadie debe salir hoy.", "/checkout",
                List.of("Huesped", "Habitacion", "Saldo"), filas);
    }

    private Lista listaPendientesAdelanto() {
        List<List<String>> filas = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT c.nombres || ' ' || c.apellidos AS huesped, h.numero, r.fecha_checkin_previsto AS checkin
                FROM reserva r JOIN cliente c ON c.id_cliente = r.id_cliente JOIN habitacion h ON h.id_habitacion = r.id_habitacion
                WHERE r.estado_reserva = 'PENDIENTE_ADELANTO' ORDER BY r.fecha_checkin_previsto, h.numero LIMIT 8
                """)) {
            filas.add(List.of((String) f.get("huesped"), "Hab. " + f.get("numero"),
                    "Se libera el " + ((java.sql.Date) f.get("checkin")).toLocalDate().format(DIA_MES)));
        }
        return new Lista("pendientesAdelanto", "Reservas sin adelanto", "No hay reservas esperando adelanto.", "/reservas",
                List.of("Huesped", "Habitacion", "Liberacion"), filas);
    }

    private Lista listaUltimosCierres() {
        List<List<String>> filas = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT t.id_turno_caja AS id, COALESCE(ec.nombres || ' ' || ec.apellidos, ea.nombres || ' ' || ea.apellidos) AS responsable,
                       t.fecha_cierre AS cierre, t.diferencia_cuadre AS diferencia
                FROM turno_caja t JOIN empleado ea ON ea.id_empleado = t.id_empleado LEFT JOIN empleado ec ON ec.id_empleado = t.id_empleado_cierre
                WHERE t.estado <> 'ABIERTO' ORDER BY t.fecha_cierre DESC NULLS LAST LIMIT 5
                """)) {
            BigDecimal dif = f.get("diferencia") == null ? null : decimal(f.get("diferencia"));
            filas.add(List.of("#" + f.get("id"), (String) f.get("responsable"),
                    f.get("cierre") == null ? "—" : ((java.sql.Timestamp) f.get("cierre")).toLocalDateTime().format(DateTimeFormatter.ofPattern("dd/MM HH:mm")),
                    dif == null ? "—" : (dif.signum() == 0 ? "Cuadro" : (dif.signum() < 0 ? "Faltante S/ " : "Sobrante S/ ") + dif.abs().toPlainString())));
        }
        return new Lista("cierres", "Ultimos cierres de caja", "Aun no hay cierres.", "/caja",
                List.of("Turno", "Responsable", "Cierre", "Resultado"), filas);
    }

    private Lista listaTopProductos(LocalDate hoy, String area, String titulo) {
        List<List<String>> filas = new ArrayList<>();
        String filtro = area != null ? " AND pr.categoria = CAST(? AS categoria_producto_enum)" : "";
        Object[] args = area != null ? new Object[]{hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay(), area}
                : new Object[]{hoy.atStartOfDay(), hoy.plusDays(1).atStartOfDay()};
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT pr.nombre, SUM(c.cantidad) AS unidades, SUM(c.total_consumo) AS venta
                FROM consumo_estadia c JOIN producto pr ON pr.id_producto = c.id_producto
                WHERE c.fecha_registro >= ? AND c.fecha_registro < ?""" + filtro + """
                 GROUP BY pr.nombre ORDER BY unidades DESC, pr.nombre LIMIT 5
                """, args)) {
            filas.add(List.of((String) f.get("nombre"), f.get("unidades") + " u.", "S/ " + ReportesService.dinero(decimal(f.get("venta"))).toPlainString()));
        }
        return new Lista("topProductos", titulo, "Aun no se vende nada hoy.", null, List.of("Producto", "Unidades", "Venta"), filas);
    }

    private Lista listaComandasActivas(String area) {
        List<List<String>> filas = new ArrayList<>();
        LocalDateTime ahora = ahora();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT c.id_comanda AS id, h.numero, c.estado_comanda::text AS estado, c.fecha_registro AS registro,
                       (SELECT string_agg(pr.nombre || ' x' || d.cantidad, ', ') FROM detalle_comanda d JOIN producto pr ON pr.id_producto = d.id_producto
                        WHERE d.id_comanda = c.id_comanda) AS items
                FROM comanda c JOIN estadia e ON e.id_estadia = c.id_estadia JOIN habitacion h ON h.id_habitacion = e.id_habitacion
                WHERE c.estado_comanda IN ('PENDIENTE', 'EN_PREPARACION', 'PREPARADA') AND c.area_destino = CAST(? AS area_destino_enum)
                ORDER BY c.fecha_registro LIMIT 8
                """, area)) {
            LocalDateTime registro = ((java.sql.Timestamp) f.get("registro")).toLocalDateTime();
            filas.add(List.of("#" + f.get("id"), "Hab. " + f.get("numero"), String.valueOf(f.get("items")),
                    etiquetaComanda((String) f.get("estado")), espera(registro, ahora)));
        }
        return new Lista("comandas", "Comandas por atender", "No hay comandas activas.", "/comandas",
                List.of("Comanda", "Habitacion", "Pedido", "Estado", "Espera"), filas);
    }

    private Lista listaTareasLimpieza() {
        List<List<String>> filas = new ArrayList<>();
        LocalDateTime ahora = ahora();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT h.numero, t.origen::text AS origen, t.estado::text AS estado, t.fecha_creacion AS creada,
                       COALESCE(e.nombres || ' ' || e.apellidos, 'Sin asignar') AS asignado
                FROM tarea_limpieza t JOIN habitacion h ON h.id_habitacion = t.id_habitacion LEFT JOIN empleado e ON e.id_empleado = t.id_empleado_asignado
                WHERE t.estado <> 'COMPLETADA' ORDER BY t.fecha_creacion LIMIT 8
                """)) {
            filas.add(List.of("Hab. " + f.get("numero"), etiquetaOrigen((String) f.get("origen")),
                    "PENDIENTE".equals(f.get("estado")) ? "Pendiente" : "En proceso", (String) f.get("asignado"),
                    espera(((java.sql.Timestamp) f.get("creada")).toLocalDateTime(), ahora)));
        }
        return new Lista("tareas", "Tareas de limpieza abiertas", "No hay tareas pendientes.", "/limpieza",
                List.of("Habitacion", "Origen", "Estado", "Asignado", "Espera"), filas);
    }

    private Lista listaIncidencias() {
        List<List<String>> filas = new ArrayList<>();
        LocalDateTime ahora = ahora();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT h.numero, i.tipo_incidencia::text AS tipo, i.estado::text AS estado, i.fecha_reporte AS reporte
                FROM incidencia_mantenimiento i JOIN habitacion h ON h.id_habitacion = i.id_habitacion
                WHERE i.estado IN ('PENDIENTE', 'EN_REPARACION') ORDER BY i.fecha_reporte LIMIT 6
                """)) {
            filas.add(List.of("Hab. " + f.get("numero"), ((String) f.get("tipo")).replace('_', ' ').toLowerCase(),
                    "PENDIENTE".equals(f.get("estado")) ? "Pendiente" : "En reparacion",
                    espera(((java.sql.Timestamp) f.get("reporte")).toLocalDateTime(), ahora)));
        }
        return new Lista("incidencias", "Incidencias abiertas", "Sin incidencias abiertas.", "/incidencias",
                List.of("Habitacion", "Tipo", "Estado", "Abierta hace"), filas);
    }

    private Lista listaSolicitudes() {
        List<List<String>> filas = new ArrayList<>();
        LocalDateTime ahora = ahora();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT h.numero, s.descripcion, s.fecha_solicitud AS solicitud
                FROM solicitud_servicio s JOIN estadia e ON e.id_estadia = s.id_estadia JOIN habitacion h ON h.id_habitacion = e.id_habitacion
                WHERE s.estado IN ('PENDIENTE', 'ASIGNADA', 'EN_ATENCION') ORDER BY s.fecha_solicitud LIMIT 6
                """)) {
            String descripcion = String.valueOf(f.get("descripcion"));
            filas.add(List.of("Hab. " + f.get("numero"), descripcion.length() > 50 ? descripcion.substring(0, 47) + "..." : descripcion,
                    espera(((java.sql.Timestamp) f.get("solicitud")).toLocalDateTime(), ahora)));
        }
        return new Lista("solicitudes", "Solicitudes del huesped", "No hay solicitudes pendientes.", "/solicitudes",
                List.of("Habitacion", "Pedido", "Espera"), filas);
    }

    private List<Insumo> stockBajo(Set<AreaInsumo> areas) {
        return inventarioService.listarConStockBajo(null).stream()
                .filter(i -> i.getArea() != null && areas.contains(i.getArea())).toList();
    }

    private Lista listaStockBajo(Set<AreaInsumo> areas, String titulo) {
        List<List<String>> filas = new ArrayList<>();
        for (Insumo i : stockBajo(areas).stream().limit(8).toList()) {
            filas.add(List.of(i.getNombre(), i.getStockActual().stripTrailingZeros().toPlainString() + " " + i.getUnidadMedida(),
                    "minimo " + i.getStockMinimo().stripTrailingZeros().toPlainString()));
        }
        return new Lista("stock", titulo, "Todo el stock esta sobre el minimo.", "/inventario", List.of("Insumo", "Stock", "Minimo"), filas);
    }

    // ---------- Utilidades ----------

    private static String etiquetaReserva(String estado) {
        return switch (estado) {
            case "CONFIRMADA" -> "Confirmada";
            case "PENDIENTE_ADELANTO" -> "Sin adelanto";
            case "EN_CURSO" -> "Ya ingreso";
            default -> estado;
        };
    }

    private static String etiquetaComanda(String estado) {
        return switch (estado) {
            case "PENDIENTE" -> "Pendiente";
            case "EN_PREPARACION" -> "En preparacion";
            case "PREPARADA" -> "Lista";
            default -> estado;
        };
    }

    private static String etiquetaOrigen(String origen) {
        return switch (origen) {
            case "CHECK_OUT" -> "Salida";
            case "SOLICITUD_HUESPED" -> "Pedido del huesped";
            case "PROGRAMADO" -> "Programada";
            default -> origen;
        };
    }

    static String espera(LocalDateTime desde, LocalDateTime ahora) {
        long minutos = Math.max(0, Duration.between(desde, ahora).toMinutes());
        if (minutos < 60) {
            return minutos + " min";
        }
        long horas = minutos / 60;
        return horas < 48 ? horas + " h " + (minutos % 60) + " min" : (horas / 24) + " d";
    }

    private LocalDate hoy() {
        return LocalDate.now(reloj);
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(reloj);
    }

    private static BigDecimal decimal(Object valor) {
        if (valor == null) {
            return BigDecimal.ZERO;
        }
        return valor instanceof BigDecimal b ? b : new BigDecimal(valor.toString());
    }

    private long contar(String sql, Object... args) {
        Object r = jdbc.queryForObject(sql, Object.class, args);
        return r == null ? 0 : ((Number) r).longValue();
    }

    private List<Dato> datos(String sql, Object... args) {
        List<Dato> filas = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList(sql, args)) {
            filas.add(new Dato(String.valueOf(f.get("clave")), ReportesService.dinero(decimal(f.get("monto"))),
                    f.get("cantidad") == null ? 0 : ((Number) f.get("cantidad")).longValue()));
        }
        return filas;
    }
}
