package pe.edu.utp.huertohostel.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reportes gerenciales. Cada reporte son pocas consultas agregadas en la base (nada de traer tablas completas
 * a memoria) y su resultado vive unos segundos en {@link CacheEnMemoria}: abrir cinco pestanas, o que dos
 * administradores miren lo mismo, no repite el trabajo. Las fechas se reciben como dias y se interpretan
 * en hora de Lima, que es como se guardan los registros de la aplicacion.
 */
@Service
public class ReportesService {

    private final JdbcTemplate jdbc;
    private final CacheEnMemoria cache;
    private final Clock reloj;
    private final InventarioService inventarioService;

    public ReportesService(JdbcTemplate jdbc, CacheEnMemoria cache, Clock reloj, InventarioService inventarioService) {
        this.jdbc = jdbc;
        this.cache = cache;
        this.reloj = reloj;
        this.inventarioService = inventarioService;
    }

    // ---------- Formas de respuesta ----------

    /** Un valor frente al del periodo anterior. {@code variacionPct} es nulo si antes era cero. */
    public record Comparado(BigDecimal actual, BigDecimal anterior, BigDecimal variacionPct) {
    }

    /** Fila de un desglose: una clave, un monto y una cantidad (segun el reporte, uno de los dos puede ser 0). */
    public record Dato(String clave, BigDecimal monto, long cantidad) {
    }

    public record PuntoSimple(LocalDate fecha, BigDecimal valor) {
    }

    public record PuntoIngreso(LocalDate fecha, BigDecimal cobrado, BigDecimal alojamiento, BigDecimal consumos) {
    }

    public record ReporteIngresos(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta, int dias,
                                  Comparado cobrado, long cantidadCobros, BigDecimal facturado,
                                  BigDecimal porCobrarAhora, List<PuntoIngreso> serie, List<Dato> porMetodo,
                                  List<Dato> porConcepto, List<Dato> porCanal, List<Dato> porArea) {
    }

    public record PuntoOcupacion(LocalDate fecha, long ocupadas, BigDecimal ocupacionPct, BigDecimal ingreso) {
    }

    public record TipoOcupacion(String tipo, long habitaciones, long noches, BigDecimal ocupacionPct,
                                BigDecimal ingreso) {
    }

    public record ReporteOcupacion(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta, int dias,
                                   long habitaciones, Comparado ocupacionPct, Comparado adr, Comparado revpar,
                                   long nochesOcupadas, long nochesDisponibles, BigDecimal ingresoAlojamiento,
                                   BigDecimal estadiaPromedioNoches, long llegadas, long salidas,
                                   List<PuntoOcupacion> serie, List<TipoOcupacion> porTipo,
                                   List<Dato> estadoActual) {
    }

    public record Huespedes(long nuevos, long repetidos, long conEstadia) {
    }

    public record ReporteReservas(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta,
                                  Comparado registradas, long canceladas, BigDecimal tasaCancelacionPct,
                                  long liberadasAutomaticamente, long pendientesAdelanto,
                                  BigDecimal antelacionPromedioDias, List<Dato> porEstado, List<Dato> porCanal,
                                  List<PuntoSimple> serie, Huespedes huespedes, List<Dato> porNacionalidad) {
    }

    public record ProductoVendido(Integer idProducto, String nombre, String categoria, long unidades,
                                  BigDecimal venta, BigDecimal costoUnitario, BigDecimal margen,
                                  BigDecimal margenPct, boolean conReceta) {
    }

    public record ResumenComandas(long total, long entregadas, long canceladas, long activas,
                                  BigDecimal minutosPreparacion, BigDecimal minutosEntrega, List<Dato> porArea) {
    }

    public record ReporteConsumos(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta, Comparado venta,
                                  long unidades, BigDecimal mermaPorCancelaciones, List<Dato> porCategoria,
                                  List<PuntoSimple> serie, List<ProductoVendido> topProductos,
                                  ResumenComandas comandas) {
    }

    public record ReporteCaja(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta, long turnos,
                              long turnosCerrados, BigDecimal diferenciaNeta, long sobrantes, long faltantes,
                              BigDecimal cobradoTotal, List<Dato> porMetodo, List<Dato> porEmpleado,
                              List<Map<String, Object>> detalle, long bitacorasPendientes,
                              List<Map<String, Object>> bitacoras, long diferenciasPendientes,
                              BigDecimal faltantePendiente, BigDecimal sobrantePendiente, BigDecimal retiros,
                              BigDecimal gastos, List<Map<String, Object>> descuadresPorCajero) {
    }

    public record Limpieza(long tareas, long completadas, long pendientes, long enProceso,
                           BigDecimal minutosPromedio, List<Dato> porOrigen, List<Dato> porEmpleado) {
    }

    public record Incidencias(long reportadas, long abiertas, long resueltas, BigDecimal horasResolucionPromedio,
                              BigDecimal horasRespuestaPromedio, long reabiertas, long descartadas,
                              List<Dato> porTipo, List<Dato> porEstado, List<Dato> habitacionesRecurrentes) {
    }

    public record Solicitudes(long total, long pendientes, long atendidas, long canceladas,
                              BigDecimal minutosAtencionPromedio, long cobrables, BigDecimal montoCobrable,
                              List<Dato> porEstado) {
    }

    public record ReporteOperacion(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta, Limpieza limpieza,
                                   Incidencias incidencias, Solicitudes solicitudes) {
    }

    public record PuntoResumen(LocalDate fecha, BigDecimal cobrado, BigDecimal ocupacionPct) {
    }

    public record ReporteResumen(LocalDateTime generadoEn, LocalDate desde, LocalDate hasta, Comparado cobrado,
                                 Comparado ocupacionPct, Comparado adr, Comparado revpar, Comparado reservas,
                                 BigDecimal tasaCancelacionPct, Comparado ventaConsumos, BigDecimal diferenciaCaja,
                                 BigDecimal porCobrarAhora, long llegadas, long salidas,
                                 List<PuntoResumen> serie, List<Dato> porArea, List<Dato> porMetodo,
                                 List<ProductoVendido> topProductos, Map<String, Object> inventario) {
    }

    // ---------- Utilidades ----------

    public LocalDate hoy() {
        return LocalDate.now(reloj);
    }

    public Periodo periodo(LocalDate desde, LocalDate hasta) {
        return Periodo.de(desde, hasta, hoy());
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(reloj);
    }

    private String clave(String reporte, Periodo p) {
        return reporte + ":" + p.clave();
    }

    /** "Actualizar" limpia todo (los reportes comparten calculos base) y recalcula una sola vez. */
    private <T> T cacheado(String clave, boolean refrescar, java.util.function.Supplier<T> calculo) {
        if (refrescar) {
            cache.limpiar();
        }
        return cache.reportes(clave, false, calculo);
    }

    static BigDecimal variacion(BigDecimal actual, BigDecimal anterior) {
        if (anterior == null || anterior.signum() == 0) {
            return null;
        }
        return actual.subtract(anterior).multiply(BigDecimal.valueOf(100))
                .divide(anterior.abs(), 1, RoundingMode.HALF_UP);
    }

    static Comparado comparar(BigDecimal actual, BigDecimal anterior) {
        return new Comparado(actual, anterior, variacion(actual, anterior));
    }

    static Comparado comparar(long actual, long anterior) {
        return comparar(BigDecimal.valueOf(actual), BigDecimal.valueOf(anterior));
    }

    /** Porcentaje con un decimal; 0 cuando no hay base (nada disponible no es 100 % ni error). */
    static BigDecimal porcentaje(BigDecimal parte, BigDecimal total) {
        if (total == null || total.signum() == 0) {
            return BigDecimal.ZERO.setScale(1);
        }
        return parte.multiply(BigDecimal.valueOf(100)).divide(total, 1, RoundingMode.HALF_UP);
    }

    static BigDecimal porcentaje(long parte, long total) {
        return porcentaje(BigDecimal.valueOf(parte), BigDecimal.valueOf(total));
    }

    static BigDecimal dinero(BigDecimal valor) {
        return (valor == null ? BigDecimal.ZERO : valor).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal decimal(Object valor) {
        if (valor == null) {
            return BigDecimal.ZERO;
        }
        return valor instanceof BigDecimal b ? b : new BigDecimal(valor.toString());
    }

    private static long entero(Object valor) {
        return valor == null ? 0 : ((Number) valor).longValue();
    }

    private static LocalDate fecha(Object valor) {
        return valor instanceof java.sql.Date d ? d.toLocalDate() : LocalDate.parse(valor.toString());
    }

    /** Consulta con columnas clave, monto y cantidad. */
    private List<Dato> datos(String sql, Object... args) {
        List<Dato> filas = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList(sql, args)) {
            filas.add(new Dato(String.valueOf(f.get("clave")), dinero(decimal(f.get("monto"))), entero(f.get("cantidad"))));
        }
        return filas;
    }

    private BigDecimal valor(String sql, Object... args) {
        return decimal(jdbc.queryForObject(sql, Object.class, args));
    }

    private long contar(String sql, Object... args) {
        return entero(jdbc.queryForObject(sql, Object.class, args));
    }

    /** Rellena con ceros los dias sin datos para que los graficos no salten fechas. */
    private static Map<LocalDate, BigDecimal> porDia(List<Map<String, Object>> filas, String columna) {
        Map<LocalDate, BigDecimal> m = new HashMap<>();
        for (Map<String, Object> f : filas) {
            m.put(fecha(f.get("fecha")), decimal(f.get(columna)));
        }
        return m;
    }

    // ---------- Ocupacion ----------

    private record DiaOcupado(LocalDate fecha, long ocupadas, BigDecimal ingreso) {
    }

    private record Ocupacion(long habitaciones, int dias, List<DiaOcupado> serie) {
        long noches() {
            return serie.stream().mapToLong(DiaOcupado::ocupadas).sum();
        }

        BigDecimal ingreso() {
            return serie.stream().map(DiaOcupado::ingreso).reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        long disponibles() {
            return habitaciones * dias;
        }

        BigDecimal ocupacionPct() {
            return porcentaje(noches(), disponibles());
        }

        BigDecimal adr() {
            return noches() == 0 ? BigDecimal.ZERO.setScale(2)
                    : ingreso().divide(BigDecimal.valueOf(noches()), 2, RoundingMode.HALF_UP);
        }

        BigDecimal revpar() {
            return disponibles() == 0 ? BigDecimal.ZERO.setScale(2)
                    : ingreso().divide(BigDecimal.valueOf(disponibles()), 2, RoundingMode.HALF_UP);
        }
    }

    /**
     * Una noche cuenta como ocupada si la estadia ya hizo check-in ese dia y todavia no salio (la noche de la
     * salida no se cuenta). Una estadia en curso ocupa hasta hoy. La tarifa de la noche es el total del
     * alojamiento de su reserva entre sus noches.
     */
    private static final String DIAS_OCUPADOS = """
            WITH dias AS (SELECT (CAST(? AS date) + g.n) AS dia FROM generate_series(0, ?) AS g(n))
            """;
    private static final String UNION_ESTADIA = """
            LEFT JOIN estadia e ON e.fecha_checkin_real::date <= d.dia
              AND ((e.fecha_checkout_real IS NOT NULL AND e.fecha_checkout_real::date > d.dia)
                OR (e.fecha_checkout_real IS NULL AND d.dia <= CAST(? AS date)))
            """;

    private Ocupacion ocupacion(Periodo p) {
        return cache.base("ocupacion-base:" + p.clave(), () -> {
            long habitaciones = contar("SELECT COUNT(*) FROM habitacion WHERE estado = true");
            List<Map<String, Object>> filas = jdbc.queryForList(DIAS_OCUPADOS + """
                    SELECT d.dia AS fecha, COUNT(e.id_estadia) AS ocupadas,
                           COALESCE(SUM(r.monto_alojamiento_total / NULLIF(r.num_noches, 0)), 0) AS ingreso
                    FROM dias d
                    """ + UNION_ESTADIA + """
                    LEFT JOIN reserva r ON r.id_reserva = e.id_reserva
                    GROUP BY d.dia ORDER BY d.dia
                    """, p.desde(), p.dias() - 1, hoy());
            List<DiaOcupado> serie = new ArrayList<>();
            for (Map<String, Object> f : filas) {
                serie.add(new DiaOcupado(fecha(f.get("fecha")), entero(f.get("ocupadas")), dinero(decimal(f.get("ingreso")))));
            }
            return new Ocupacion(habitaciones, p.dias(), serie);
        });
    }

    public ReporteOcupacion ocupacion(Periodo p, boolean refrescar) {
        return cacheado(clave("ocupacion", p), refrescar, () -> {
            Ocupacion actual = ocupacion(p);
            Ocupacion previo = ocupacion(p.anterior());

            List<PuntoOcupacion> serie = new ArrayList<>();
            for (DiaOcupado d : actual.serie()) {
                serie.add(new PuntoOcupacion(d.fecha(), d.ocupadas(), porcentaje(d.ocupadas(), actual.habitaciones()), d.ingreso()));
            }

            Map<String, Long> habitacionesPorTipo = new LinkedHashMap<>();
            for (Dato d : datos("""
                    SELECT t.nombre AS clave, 0 AS monto, COUNT(h.id_habitacion) AS cantidad
                    FROM tipo_habitacion t
                    LEFT JOIN habitacion h ON h.id_tipo_habitacion = t.id_tipo_habitacion AND h.estado = true
                    GROUP BY t.nombre ORDER BY t.nombre
                    """)) {
                habitacionesPorTipo.put(d.clave(), d.cantidad());
            }
            Map<String, Dato> nochesPorTipo = new HashMap<>();
            for (Dato d : datos(DIAS_OCUPADOS + """
                    SELECT t.nombre AS clave, COALESCE(SUM(r.monto_alojamiento_total / NULLIF(r.num_noches, 0)), 0) AS monto,
                           COUNT(e.id_estadia) AS cantidad
                    FROM dias d
                    """ + UNION_ESTADIA.replace("LEFT JOIN", "JOIN") + """
                    JOIN habitacion h ON h.id_habitacion = e.id_habitacion
                    JOIN tipo_habitacion t ON t.id_tipo_habitacion = h.id_tipo_habitacion
                    JOIN reserva r ON r.id_reserva = e.id_reserva
                    GROUP BY t.nombre
                    """, p.desde(), p.dias() - 1, hoy())) {
                nochesPorTipo.put(d.clave(), d);
            }
            List<TipoOcupacion> porTipo = new ArrayList<>();
            habitacionesPorTipo.forEach((tipo, habs) -> {
                Dato d = nochesPorTipo.get(tipo);
                long noches = d != null ? d.cantidad() : 0;
                porTipo.add(new TipoOcupacion(tipo, habs, noches, porcentaje(noches, habs * p.dias()),
                        d != null ? d.monto() : BigDecimal.ZERO.setScale(2)));
            });

            BigDecimal estadiaPromedio = valor("""
                    SELECT COALESCE(AVG(e.fecha_checkout_real::date - e.fecha_checkin_real::date), 0)
                    FROM estadia e WHERE e.fecha_checkout_real >= ? AND e.fecha_checkout_real < ?
                    """, p.inicio(), p.fin()).setScale(1, RoundingMode.HALF_UP);
            long llegadas = contar("SELECT COUNT(*) FROM estadia WHERE fecha_checkin_real >= ? AND fecha_checkin_real < ?", p.inicio(), p.fin());
            long salidas = contar("SELECT COUNT(*) FROM estadia WHERE fecha_checkout_real >= ? AND fecha_checkout_real < ?", p.inicio(), p.fin());
            List<Dato> estadoActual = datos("""
                    SELECT estado_operativo::text AS clave, 0 AS monto, COUNT(*) AS cantidad
                    FROM habitacion WHERE estado = true GROUP BY 1 ORDER BY 3 DESC
                    """);

            return new ReporteOcupacion(ahora(), p.desde(), p.hasta(), p.dias(), actual.habitaciones(),
                    comparar(actual.ocupacionPct(), previo.ocupacionPct()),
                    comparar(actual.adr(), previo.adr()),
                    comparar(actual.revpar(), previo.revpar()),
                    actual.noches(), actual.disponibles(), actual.ingreso(), estadiaPromedio, llegadas, salidas,
                    serie, porTipo, estadoActual);
        });
    }

    // ---------- Ingresos ----------

    private BigDecimal cobrado(Periodo p) {
        return dinero(valor("SELECT COALESCE(SUM(monto), 0) FROM pago WHERE fecha_pago >= ? AND fecha_pago < ?", p.inicio(), p.fin()));
    }

    public ReporteIngresos ingresos(Periodo p, boolean refrescar) {
        return cacheado(clave("ingresos", p), refrescar, () -> {
            // El alojamiento se factura con el total de la reserva al hacer el check-out (igual que el saldo del
            // check-out), no por noche: asi lo facturado y lo cobrado hablan del mismo dinero.
            Map<LocalDate, BigDecimal> alojamientoDia = porDia(jdbc.queryForList("""
                    SELECT e.fecha_checkout_real::date AS fecha, SUM(r.monto_alojamiento_total) AS valor
                    FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva
                    WHERE e.fecha_checkout_real >= ? AND e.fecha_checkout_real < ? GROUP BY 1
                    """, p.inicio(), p.fin()), "valor");
            long estadiasFacturadas = contar("SELECT COUNT(*) FROM estadia WHERE fecha_checkout_real >= ? AND fecha_checkout_real < ?", p.inicio(), p.fin());

            Map<LocalDate, BigDecimal> cobrosDia = porDia(jdbc.queryForList("""
                    SELECT fecha_pago::date AS fecha, SUM(monto) AS valor FROM pago
                    WHERE fecha_pago >= ? AND fecha_pago < ? GROUP BY 1
                    """, p.inicio(), p.fin()), "valor");
            Map<LocalDate, BigDecimal> consumosDia = porDia(jdbc.queryForList("""
                    SELECT fecha_registro::date AS fecha, SUM(total_consumo) AS valor FROM consumo_estadia
                    WHERE fecha_registro >= ? AND fecha_registro < ? GROUP BY 1
                    """, p.inicio(), p.fin()), "valor");

            List<PuntoIngreso> serie = new ArrayList<>();
            BigDecimal totalConsumos = BigDecimal.ZERO;
            BigDecimal totalAlojamiento = BigDecimal.ZERO;
            for (LocalDate dia = p.desde(); !dia.isAfter(p.hasta()); dia = dia.plusDays(1)) {
                BigDecimal consumos = dinero(consumosDia.get(dia));
                BigDecimal alojamiento = dinero(alojamientoDia.get(dia));
                totalConsumos = totalConsumos.add(consumos);
                totalAlojamiento = totalAlojamiento.add(alojamiento);
                serie.add(new PuntoIngreso(dia, dinero(cobrosDia.get(dia)), alojamiento, consumos));
            }

            BigDecimal total = cobrado(p);
            long cantidad = contar("SELECT COUNT(*) FROM pago WHERE fecha_pago >= ? AND fecha_pago < ?", p.inicio(), p.fin());

            List<Dato> porArea = new ArrayList<>();
            porArea.add(new Dato("ALOJAMIENTO", dinero(totalAlojamiento), estadiasFacturadas));
            porArea.addAll(datos("""
                    SELECT COALESCE(pr.categoria::text, 'OTROS') AS clave, COALESCE(SUM(c.total_consumo), 0) AS monto,
                           COALESCE(SUM(c.cantidad), 0) AS cantidad
                    FROM consumo_estadia c LEFT JOIN producto pr ON pr.id_producto = c.id_producto
                    WHERE c.fecha_registro >= ? AND c.fecha_registro < ? GROUP BY 1 ORDER BY 2 DESC
                    """, p.inicio(), p.fin()));

            // Saldo de las estadias en curso con la misma formula del check-out: alojamiento + consumos - pagos.
            BigDecimal porCobrar = dinero(valor("""
                    SELECT COALESCE(SUM(r.monto_alojamiento_total
                        + COALESCE((SELECT SUM(c.total_consumo) FROM consumo_estadia c WHERE c.id_estadia = e.id_estadia), 0)
                        - COALESCE((SELECT SUM(pg.monto) FROM pago pg WHERE pg.id_estadia = e.id_estadia OR pg.id_reserva = r.id_reserva), 0)), 0)
                    FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva
                    WHERE e.estado_estadia = 'EN_CURSO'
                    """));

            return new ReporteIngresos(ahora(), p.desde(), p.hasta(), p.dias(),
                    comparar(total, cobrado(p.anterior())), cantidad, dinero(totalAlojamiento.add(totalConsumos)),
                    porCobrar, serie,
                    datos("SELECT metodo_pago::text AS clave, SUM(monto) AS monto, COUNT(*) AS cantidad FROM pago WHERE fecha_pago >= ? AND fecha_pago < ? GROUP BY 1 ORDER BY 2 DESC", p.inicio(), p.fin()),
                    datos("SELECT concepto::text AS clave, SUM(monto) AS monto, COUNT(*) AS cantidad FROM pago WHERE fecha_pago >= ? AND fecha_pago < ? GROUP BY 1 ORDER BY 2 DESC", p.inicio(), p.fin()),
                    datos("""
                            SELECT COALESCE(r.canal_reserva::text, 'SIN_RESERVA') AS clave, SUM(pg.monto) AS monto, COUNT(*) AS cantidad
                            FROM pago pg
                            LEFT JOIN estadia e ON e.id_estadia = pg.id_estadia
                            LEFT JOIN reserva r ON r.id_reserva = COALESCE(pg.id_reserva, e.id_reserva)
                            WHERE pg.fecha_pago >= ? AND pg.fecha_pago < ? GROUP BY 1 ORDER BY 2 DESC
                            """, p.inicio(), p.fin()),
                    porArea);
        });
    }

    // ---------- Reservas y huespedes ----------

    public ReporteReservas reservas(Periodo p, boolean refrescar) {
        return cacheado(clave("reservas", p), refrescar, () -> {
            String enPeriodo = " WHERE fecha_registro >= ? AND fecha_registro < ? ";
            long registradas = contar("SELECT COUNT(*) FROM reserva" + enPeriodo, p.inicio(), p.fin());
            Periodo previo = p.anterior();
            long anterior = contar("SELECT COUNT(*) FROM reserva" + enPeriodo, previo.inicio(), previo.fin());

            List<Dato> porEstado = datos("SELECT estado_reserva::text AS clave, COALESCE(SUM(monto_alojamiento_total), 0) AS monto, COUNT(*) AS cantidad FROM reserva"
                    + enPeriodo + "GROUP BY 1 ORDER BY 3 DESC", p.inicio(), p.fin());
            List<Dato> porCanal = datos("SELECT canal_reserva::text AS clave, COALESCE(SUM(monto_alojamiento_total), 0) AS monto, COUNT(*) AS cantidad FROM reserva"
                    + enPeriodo + "GROUP BY 1 ORDER BY 3 DESC", p.inicio(), p.fin());
            long canceladas = porEstado.stream().filter(d -> d.clave().equals("CANCELADA")).mapToLong(Dato::cantidad).sum();

            Map<LocalDate, BigDecimal> diarias = porDia(jdbc.queryForList(
                    "SELECT fecha_registro::date AS fecha, COUNT(*) AS valor FROM reserva" + enPeriodo + "GROUP BY 1",
                    p.inicio(), p.fin()), "valor");
            List<PuntoSimple> serie = new ArrayList<>();
            for (LocalDate d = p.desde(); !d.isAfter(p.hasta()); d = d.plusDays(1)) {
                serie.add(new PuntoSimple(d, diarias.getOrDefault(d, BigDecimal.ZERO)));
            }

            long liberadas = contar("SELECT COUNT(*) FROM reserva" + enPeriodo
                    + "AND estado_reserva = 'CANCELADA' AND observaciones ILIKE '%liberada automaticamente%'", p.inicio(), p.fin());
            long pendientes = contar("SELECT COUNT(*) FROM reserva WHERE estado_reserva = 'PENDIENTE_ADELANTO'");
            BigDecimal antelacion = valor("SELECT COALESCE(AVG(fecha_checkin_previsto - fecha_registro::date), 0) FROM reserva"
                    + enPeriodo + "AND estado_reserva <> 'CANCELADA'", p.inicio(), p.fin()).setScale(1, RoundingMode.HALF_UP);

            long nuevos = contar("SELECT COUNT(*) FROM cliente WHERE fecha_registro >= ? AND fecha_registro < ?", p.inicio(), p.fin());
            long repetidos = contar("""
                    SELECT COUNT(*) FROM (
                        SELECT r.id_cliente FROM reserva r WHERE r.estado_reserva <> 'CANCELADA'
                        GROUP BY r.id_cliente
                        HAVING COUNT(*) > 1 AND bool_or(r.fecha_registro >= ? AND r.fecha_registro < ?)
                    ) x
                    """, p.inicio(), p.fin());
            long conEstadia = contar("""
                    SELECT COUNT(DISTINCT r.id_cliente) FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva
                    WHERE e.fecha_checkin_real >= ? AND e.fecha_checkin_real < ?
                    """, p.inicio(), p.fin());
            List<Dato> nacionalidades = datos("""
                    SELECT COALESCE(NULLIF(c.nacionalidad, ''), 'Sin dato') AS clave, 0 AS monto, COUNT(DISTINCT c.id_cliente) AS cantidad
                    FROM estadia e JOIN reserva r ON r.id_reserva = e.id_reserva JOIN cliente c ON c.id_cliente = r.id_cliente
                    WHERE e.fecha_checkin_real >= ? AND e.fecha_checkin_real < ?
                    GROUP BY 1 ORDER BY 3 DESC LIMIT 8
                    """, p.inicio(), p.fin());

            return new ReporteReservas(ahora(), p.desde(), p.hasta(), comparar(registradas, anterior), canceladas,
                    porcentaje(canceladas, registradas), liberadas, pendientes, antelacion, porEstado, porCanal,
                    serie, new Huespedes(nuevos, repetidos, conEstadia), nacionalidades);
        });
    }

    // ---------- Consumos, rentabilidad y comandas ----------

    private BigDecimal ventaConsumos(Periodo p) {
        return dinero(valor("SELECT COALESCE(SUM(total_consumo), 0) FROM consumo_estadia WHERE fecha_registro >= ? AND fecha_registro < ?", p.inicio(), p.fin()));
    }

    private List<ProductoVendido> topProductos(Periodo p, int limite) {
        List<ProductoVendido> top = new ArrayList<>();
        for (Map<String, Object> f : jdbc.queryForList("""
                SELECT pr.id_producto, pr.nombre, pr.categoria::text AS categoria,
                       SUM(c.cantidad) AS unidades, SUM(c.total_consumo) AS venta,
                       COALESCE((SELECT SUM(rd.cantidad * i.costo_unitario) FROM receta_detalle rd
                                 JOIN insumo i ON i.id_insumo = rd.id_insumo WHERE rd.id_producto = pr.id_producto), 0) AS costo_unitario,
                       EXISTS (SELECT 1 FROM receta_detalle rd WHERE rd.id_producto = pr.id_producto) AS con_receta
                FROM consumo_estadia c JOIN producto pr ON pr.id_producto = c.id_producto
                WHERE c.fecha_registro >= ? AND c.fecha_registro < ?
                GROUP BY pr.id_producto, pr.nombre, pr.categoria
                ORDER BY venta DESC, pr.nombre LIMIT ?
                """, p.inicio(), p.fin(), limite)) {
            long unidades = entero(f.get("unidades"));
            BigDecimal venta = dinero(decimal(f.get("venta")));
            BigDecimal costoUnit = decimal(f.get("costo_unitario"));
            boolean conReceta = Boolean.TRUE.equals(f.get("con_receta"));
            BigDecimal margen = conReceta ? venta.subtract(costoUnit.multiply(BigDecimal.valueOf(unidades))).setScale(2, RoundingMode.HALF_UP) : null;
            BigDecimal margenPct = conReceta && venta.signum() > 0 ? porcentaje(margen, venta) : null;
            top.add(new ProductoVendido((Integer) f.get("id_producto"), (String) f.get("nombre"), (String) f.get("categoria"),
                    unidades, venta, costoUnit.setScale(2, RoundingMode.HALF_UP), margen, margenPct, conReceta));
        }
        return top;
    }

    public ReporteConsumos consumos(Periodo p, boolean refrescar) {
        return cacheado(clave("consumos", p), refrescar, () -> {
            BigDecimal venta = ventaConsumos(p);
            long unidades = contar("SELECT COALESCE(SUM(cantidad), 0) FROM consumo_estadia WHERE fecha_registro >= ? AND fecha_registro < ?", p.inicio(), p.fin());
            BigDecimal mermaCancelaciones = dinero(valor("""
                    SELECT COALESCE(SUM(m.cantidad * i.costo_unitario), 0) FROM movimiento_inventario m
                    JOIN insumo i ON i.id_insumo = m.id_insumo
                    WHERE m.referencia_origen LIKE 'MERMA-COMANDA-%' AND m.fecha_hora >= ? AND m.fecha_hora < ?
                    """, p.inicio(), p.fin()));

            List<Dato> porCategoria = datos("""
                    SELECT COALESCE(pr.categoria::text, 'OTROS') AS clave, COALESCE(SUM(c.total_consumo), 0) AS monto,
                           COALESCE(SUM(c.cantidad), 0) AS cantidad
                    FROM consumo_estadia c LEFT JOIN producto pr ON pr.id_producto = c.id_producto
                    WHERE c.fecha_registro >= ? AND c.fecha_registro < ? GROUP BY 1 ORDER BY 2 DESC
                    """, p.inicio(), p.fin());
            Map<LocalDate, BigDecimal> diarias = porDia(jdbc.queryForList("""
                    SELECT fecha_registro::date AS fecha, SUM(total_consumo) AS valor FROM consumo_estadia
                    WHERE fecha_registro >= ? AND fecha_registro < ? GROUP BY 1
                    """, p.inicio(), p.fin()), "valor");
            List<PuntoSimple> serie = new ArrayList<>();
            for (LocalDate d = p.desde(); !d.isAfter(p.hasta()); d = d.plusDays(1)) {
                serie.add(new PuntoSimple(d, dinero(diarias.get(d))));
            }

            List<Dato> estados = datos("SELECT estado_comanda::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM comanda WHERE fecha_registro >= ? AND fecha_registro < ? GROUP BY 1", p.inicio(), p.fin());
            long total = estados.stream().mapToLong(Dato::cantidad).sum();
            java.util.function.Function<String, Long> de = e -> estados.stream().filter(d -> d.clave().equals(e)).mapToLong(Dato::cantidad).sum();
            Map<String, Object> tiempos = jdbc.queryForMap("""
                    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_preparada - fecha_registro)) / 60) FILTER (WHERE fecha_preparada IS NOT NULL), 0) AS preparacion,
                           COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_entregada - fecha_registro)) / 60) FILTER (WHERE fecha_entregada IS NOT NULL), 0) AS entrega
                    FROM comanda WHERE fecha_registro >= ? AND fecha_registro < ?
                    """, p.inicio(), p.fin());
            ResumenComandas comandas = new ResumenComandas(total, de.apply("ENTREGADA"), de.apply("CANCELADA"),
                    de.apply("PENDIENTE") + de.apply("EN_PREPARACION") + de.apply("PREPARADA"),
                    decimal(tiempos.get("preparacion")).setScale(1, RoundingMode.HALF_UP),
                    decimal(tiempos.get("entrega")).setScale(1, RoundingMode.HALF_UP),
                    datos("SELECT area_destino::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM comanda WHERE fecha_registro >= ? AND fecha_registro < ? GROUP BY 1 ORDER BY 3 DESC", p.inicio(), p.fin()));

            return new ReporteConsumos(ahora(), p.desde(), p.hasta(), comparar(venta, ventaConsumos(p.anterior())),
                    unidades, mermaCancelaciones, porCategoria, serie, topProductos(p, 10), comandas);
        });
    }

    // ---------- Caja ----------

    public ReporteCaja caja(Periodo p, boolean refrescar) {
        return cacheado(clave("caja", p), refrescar, () -> {
            Map<String, Object> r = jdbc.queryForMap("""
                    SELECT COUNT(*) AS turnos,
                           COUNT(*) FILTER (WHERE estado <> 'ABIERTO') AS cerrados,
                           COALESCE(SUM(diferencia_cuadre) FILTER (WHERE estado <> 'ABIERTO'), 0) AS neta,
                           COUNT(*) FILTER (WHERE diferencia_cuadre > 0) AS sobrantes,
                           COUNT(*) FILTER (WHERE diferencia_cuadre < 0) AS faltantes
                    FROM turno_caja WHERE fecha_apertura >= ? AND fecha_apertura < ?
                    """, p.inicio(), p.fin());

            List<Map<String, Object>> detalle = jdbc.queryForList("""
                    SELECT t.id_turno_caja AS id, t.fecha_apertura AS apertura, t.fecha_cierre AS cierre,
                           ea.nombres || ' ' || ea.apellidos AS abrio,
                           CASE WHEN ec.id_empleado IS NULL THEN NULL ELSE ec.nombres || ' ' || ec.apellidos END AS cerro,
                           t.fondo_inicial_efectivo AS fondo, t.efectivo_sistema_esperado AS esperado,
                           t.efectivo_real_declarado AS declarado, t.diferencia_cuadre AS diferencia,
                           t.estado::text AS estado, t.observaciones_cierre AS observaciones,
                           t.reconteos_cierre AS reconteos, t.esperado_revelado AS revelado, t.motivo_diferencia AS motivo,
                           COALESCE((SELECT SUM(pg.monto) FROM pago pg WHERE pg.id_turno_caja = t.id_turno_caja), 0) AS cobrado
                    FROM turno_caja t
                    JOIN empleado ea ON ea.id_empleado = t.id_empleado
                    LEFT JOIN empleado ec ON ec.id_empleado = t.id_empleado_cierre
                    WHERE t.fecha_apertura >= ? AND t.fecha_apertura < ?
                    ORDER BY t.fecha_apertura DESC LIMIT 100
                    """, p.inicio(), p.fin());

            List<Map<String, Object>> bitacoras = jdbc.queryForList("""
                    SELECT b.id_bitacora AS id, b.id_turno_caja AS turno, b.prioridad, b.categoria, b.mensaje, b.fecha_hora AS fecha
                    FROM bitacora_turno b WHERE b.resuelto = false ORDER BY b.fecha_hora DESC LIMIT 15
                    """);

            Map<String, Object> pend = jdbc.queryForMap("""
                    SELECT COUNT(*) AS n,
                           COALESCE(SUM(monto) FILTER (WHERE monto < 0), 0) AS faltante,
                           COALESCE(SUM(monto) FILTER (WHERE monto > 0), 0) AS sobrante
                    FROM bitacora_turno WHERE resuelto = false AND categoria IN ('DESCUADRE', 'APERTURA')
                    """);
            Map<String, BigDecimal> salidas = new HashMap<>();
            for (Map<String, Object> m : jdbc.queryForList("""
                    SELECT tipo, COALESCE(SUM(monto), 0) AS total FROM movimiento_caja
                    WHERE fecha_hora >= ? AND fecha_hora < ? GROUP BY tipo
                    """, p.inicio(), p.fin())) {
                salidas.put((String) m.get("tipo"), dinero(decimal(m.get("total"))));
            }
            // Quien cierra la caja responde por su cuadre: cuantos cierres, cuantos con diferencia y de cuanto.
            List<Map<String, Object>> porCajero = jdbc.queryForList("""
                    SELECT COALESCE(ec.nombres || ' ' || ec.apellidos, ea.nombres || ' ' || ea.apellidos) AS cajero,
                           COUNT(*) AS cierres,
                           COUNT(*) FILTER (WHERE t.diferencia_cuadre <> 0) AS con_diferencia,
                           COALESCE(SUM(t.diferencia_cuadre) FILTER (WHERE t.diferencia_cuadre < 0), 0) AS faltante,
                           COALESCE(SUM(t.diferencia_cuadre) FILTER (WHERE t.diferencia_cuadre > 0), 0) AS sobrante,
                           COALESCE(SUM(t.diferencia_cuadre), 0) AS neto,
                           COALESCE(SUM(t.reconteos_cierre), 0) AS reconteos
                    FROM turno_caja t
                    JOIN empleado ea ON ea.id_empleado = t.id_empleado
                    LEFT JOIN empleado ec ON ec.id_empleado = t.id_empleado_cierre
                    WHERE t.estado <> 'ABIERTO' AND t.fecha_cierre >= ? AND t.fecha_cierre < ?
                    GROUP BY 1 ORDER BY neto, cajero
                    """, p.inicio(), p.fin());

            return new ReporteCaja(ahora(), p.desde(), p.hasta(), entero(r.get("turnos")), entero(r.get("cerrados")),
                    dinero(decimal(r.get("neta"))), entero(r.get("sobrantes")), entero(r.get("faltantes")),
                    cobrado(p),
                    datos("SELECT metodo_pago::text AS clave, SUM(monto) AS monto, COUNT(*) AS cantidad FROM pago WHERE fecha_pago >= ? AND fecha_pago < ? GROUP BY 1 ORDER BY 2 DESC", p.inicio(), p.fin()),
                    datos("""
                            SELECT COALESCE(e.nombres || ' ' || e.apellidos, 'Portal / pasarela') AS clave, SUM(pg.monto) AS monto, COUNT(*) AS cantidad
                            FROM pago pg LEFT JOIN empleado e ON e.id_empleado = pg.id_empleado_registra
                            WHERE pg.fecha_pago >= ? AND pg.fecha_pago < ? GROUP BY 1 ORDER BY 2 DESC
                            """, p.inicio(), p.fin()),
                    detalle, contar("SELECT COUNT(*) FROM bitacora_turno WHERE resuelto = false"), bitacoras,
                    entero(pend.get("n")), dinero(decimal(pend.get("faltante"))), dinero(decimal(pend.get("sobrante"))),
                    salidas.getOrDefault("RETIRO", BigDecimal.ZERO.setScale(2)), salidas.getOrDefault("GASTO", BigDecimal.ZERO.setScale(2)),
                    porCajero);
        });
    }

    // ---------- Operacion: limpieza, incidencias y solicitudes ----------

    public ReporteOperacion operacion(Periodo p, boolean refrescar) {
        return cacheado(clave("operacion", p), refrescar, () -> {
            List<Dato> estadosTarea = datos("SELECT estado::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM tarea_limpieza WHERE fecha_creacion >= ? AND fecha_creacion < ? GROUP BY 1", p.inicio(), p.fin());
            java.util.function.Function<String, Long> tarea = e -> estadosTarea.stream().filter(d -> d.clave().equals(e)).mapToLong(Dato::cantidad).sum();
            BigDecimal minutosLimpieza = valor("""
                    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_fin - fecha_inicio)) / 60), 0) FROM tarea_limpieza
                    WHERE fecha_creacion >= ? AND fecha_creacion < ? AND fecha_fin IS NOT NULL AND fecha_inicio IS NOT NULL
                    """, p.inicio(), p.fin()).setScale(1, RoundingMode.HALF_UP);
            Limpieza limpieza = new Limpieza(
                    estadosTarea.stream().mapToLong(Dato::cantidad).sum(), tarea.apply("COMPLETADA"),
                    tarea.apply("PENDIENTE"), tarea.apply("EN_PROCESO"), minutosLimpieza,
                    datos("SELECT origen::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM tarea_limpieza WHERE fecha_creacion >= ? AND fecha_creacion < ? GROUP BY 1 ORDER BY 3 DESC", p.inicio(), p.fin()),
                    datos("""
                            SELECT COALESCE(e.nombres || ' ' || e.apellidos, 'Sin asignar') AS clave,
                                   COALESCE(AVG(EXTRACT(EPOCH FROM (t.fecha_fin - t.fecha_inicio)) / 60)
                                            FILTER (WHERE t.fecha_fin IS NOT NULL AND t.fecha_inicio IS NOT NULL), 0) AS monto,
                                   COUNT(*) AS cantidad
                            FROM tarea_limpieza t LEFT JOIN empleado e ON e.id_empleado = t.id_empleado_asignado
                            WHERE t.fecha_creacion >= ? AND t.fecha_creacion < ? GROUP BY 1 ORDER BY 3 DESC
                            """, p.inicio(), p.fin()));

            List<Dato> estadosInc = datos("SELECT estado::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM incidencia_mantenimiento WHERE fecha_reporte >= ? AND fecha_reporte < ? GROUP BY 1", p.inicio(), p.fin());
            BigDecimal horasResolucion = valor("""
                    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_resolucion - fecha_reporte)) / 3600), 0) FROM incidencia_mantenimiento
                    WHERE fecha_reporte >= ? AND fecha_reporte < ? AND fecha_resolucion IS NOT NULL
                    """, p.inicio(), p.fin()).setScale(1, RoundingMode.HALF_UP);
            BigDecimal horasRespuesta = valor("""
                    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_inicio_reparacion - fecha_reporte)) / 3600), 0) FROM incidencia_mantenimiento
                    WHERE fecha_reporte >= ? AND fecha_reporte < ? AND fecha_inicio_reparacion IS NOT NULL
                    """, p.inicio(), p.fin()).setScale(1, RoundingMode.HALF_UP);
            long reabiertas = contar("SELECT COUNT(*) FROM incidencia_mantenimiento WHERE fecha_reporte >= ? AND fecha_reporte < ? AND veces_reabierta > 0", p.inicio(), p.fin());
            Incidencias incidencias = new Incidencias(
                    estadosInc.stream().mapToLong(Dato::cantidad).sum(),
                    contar("SELECT COUNT(*) FROM incidencia_mantenimiento WHERE estado IN ('PENDIENTE', 'EN_REPARACION')"),
                    estadosInc.stream().filter(d -> d.clave().equals("RESUELTO")).mapToLong(Dato::cantidad).sum(),
                    horasResolucion, horasRespuesta, reabiertas,
                    estadosInc.stream().filter(d -> d.clave().equals("DUPLICADA") || d.clave().equals("NO_PROCEDE")).mapToLong(Dato::cantidad).sum(),
                    datos("SELECT tipo_incidencia::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM incidencia_mantenimiento WHERE fecha_reporte >= ? AND fecha_reporte < ? GROUP BY 1 ORDER BY 3 DESC", p.inicio(), p.fin()),
                    estadosInc,
                    datos("""
                            SELECT h.numero AS clave, 0 AS monto, COUNT(*) AS cantidad FROM incidencia_mantenimiento i
                            JOIN habitacion h ON h.id_habitacion = i.id_habitacion
                            WHERE i.fecha_reporte >= ? AND i.fecha_reporte < ? GROUP BY h.numero ORDER BY 3 DESC, 1 LIMIT 5
                            """, p.inicio(), p.fin()));

            List<Dato> estadosSol = datos("SELECT estado::text AS clave, 0 AS monto, COUNT(*) AS cantidad FROM solicitud_servicio WHERE fecha_solicitud >= ? AND fecha_solicitud < ? GROUP BY 1", p.inicio(), p.fin());
            java.util.function.Function<String, Long> sol = e -> estadosSol.stream().filter(d -> d.clave().equals(e)).mapToLong(Dato::cantidad).sum();
            Map<String, Object> s = jdbc.queryForMap("""
                    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_atencion - fecha_solicitud)) / 60) FILTER (WHERE fecha_atencion IS NOT NULL), 0) AS minutos,
                           COUNT(*) FILTER (WHERE es_cobrable) AS cobrables,
                           COALESCE(SUM(cantidad * COALESCE(monto_unidad, 0)) FILTER (WHERE es_cobrable), 0) AS monto
                    FROM solicitud_servicio WHERE fecha_solicitud >= ? AND fecha_solicitud < ?
                    """, p.inicio(), p.fin());
            Solicitudes solicitudes = new Solicitudes(
                    estadosSol.stream().mapToLong(Dato::cantidad).sum(), sol.apply("PENDIENTE") + sol.apply("ASIGNADA") + sol.apply("EN_ATENCION"),
                    sol.apply("ATENDIDA"), sol.apply("CANCELADA"), decimal(s.get("minutos")).setScale(1, RoundingMode.HALF_UP),
                    entero(s.get("cobrables")), dinero(decimal(s.get("monto"))), estadosSol);

            return new ReporteOperacion(ahora(), p.desde(), p.hasta(), limpieza, incidencias, solicitudes);
        });
    }

    // ---------- Resumen ejecutivo ----------

    /**
     * Junta lo esencial de los demas reportes. No tiene cache propia: cada parte ya vive en memoria y armarlo
     * es solo juntar resultados (ademas, una carga no puede pedir a la misma cache).
     */
    public ReporteResumen resumen(Periodo p, boolean refrescar) {
        if (refrescar) {
            cache.limpiar();
        }
        {
            ReporteIngresos ing = ingresos(p, false);
            ReporteOcupacion ocu = ocupacion(p, false);
            ReporteReservas res = reservas(p, false);
            ReporteConsumos con = consumos(p, false);
            ReporteCaja caja = caja(p, false);

            Map<LocalDate, BigDecimal> ocupacionDia = new HashMap<>();
            ocu.serie().forEach(d -> ocupacionDia.put(d.fecha(), d.ocupacionPct()));
            List<PuntoResumen> serie = new ArrayList<>();
            ing.serie().forEach(d -> serie.add(new PuntoResumen(d.fecha(), d.cobrado(), ocupacionDia.getOrDefault(d.fecha(), BigDecimal.ZERO))));

            return new ReporteResumen(ahora(), p.desde(), p.hasta(), ing.cobrado(), ocu.ocupacionPct(), ocu.adr(),
                    ocu.revpar(), res.registradas(), res.tasaCancelacionPct(), con.venta(), caja.diferenciaNeta(),
                    ing.porCobrarAhora(), ocu.llegadas(), ocu.salidas(), serie, ing.porArea(), ing.porMetodo(),
                    con.topProductos().stream().limit(5).toList(), inventarioService.alertas());
        }
    }
}
