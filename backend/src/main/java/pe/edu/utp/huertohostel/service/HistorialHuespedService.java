package pe.edu.utp.huertohostel.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.huertohostel.repository.ClienteRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Historial de un huesped (RF11): todas sus reservas con su estadia (si llego), lo consumido y lo pagado, y el detalle
 * de sus consumos. Dos consultas agregadas en la base, sin importar cuantas visitas tenga (contra Supabase cada ida y
 * vuelta cuesta). Solo lectura: no cambia nada.
 */
@Service
@Transactional(readOnly = true)
public class HistorialHuespedService {

    /** Consumos detallados que se devuelven (los mas recientes); los totales si cuentan todo. */
    static final int MAXIMO_CONSUMOS = 200;

    private static final String SQL_RESERVAS = """
            SELECT r.id_reserva, r.estado_reserva::text AS estado, r.canal_reserva::text AS canal,
                   r.fecha_checkin_previsto, r.fecha_checkout_previsto, r.num_noches, r.monto_alojamiento_total,
                   r.fecha_registro, h.numero AS habitacion, t.nombre AS tipo,
                   e.id_estadia, e.fecha_checkin_real, e.fecha_checkout_real, e.estado_estadia::text AS estado_estadia,
                   e.salida_forzada, e.saldo_al_salir,
                   COALESCE((SELECT SUM(c.total_consumo) FROM consumo_estadia c WHERE c.id_estadia = e.id_estadia), 0) AS consumos,
                   COALESCE((SELECT SUM(p.monto) FROM pago p
                             WHERE p.id_reserva = r.id_reserva
                                OR (e.id_estadia IS NOT NULL AND p.id_estadia = e.id_estadia)), 0) AS pagado
            FROM reserva r
            JOIN habitacion h ON h.id_habitacion = r.id_habitacion
            LEFT JOIN tipo_habitacion t ON t.id_tipo_habitacion = h.id_tipo_habitacion
            LEFT JOIN estadia e ON e.id_reserva = r.id_reserva
            WHERE r.id_cliente = ?
            ORDER BY r.fecha_checkin_previsto DESC, r.id_reserva DESC
            """;

    private static final String SQL_CONSUMOS = """
            SELECT c.id_consumo, c.id_estadia, c.fecha_registro, p.nombre AS producto, p.categoria::text AS categoria,
                   c.cantidad, c.total_consumo, h.numero AS habitacion
            FROM consumo_estadia c
            JOIN estadia e ON e.id_estadia = c.id_estadia
            JOIN reserva r ON r.id_reserva = e.id_reserva
            JOIN producto p ON p.id_producto = c.id_producto
            JOIN habitacion h ON h.id_habitacion = e.id_habitacion
            WHERE r.id_cliente = ?
            ORDER BY c.fecha_registro DESC, c.id_consumo DESC
            """;

    private final JdbcTemplate jdbc;
    private final ClienteRepository clienteRepository;

    public HistorialHuespedService(JdbcTemplate jdbc, ClienteRepository clienteRepository) {
        this.jdbc = jdbc;
        this.clienteRepository = clienteRepository;
    }

    public Map<String, Object> historial(Integer idCliente) {
        if (idCliente == null || !clienteRepository.existsById(idCliente)) {
            throw new EntityNotFoundException("Huésped no encontrado: " + idCliente);
        }
        List<Map<String, Object>> reservas = jdbc.queryForList(SQL_RESERVAS, idCliente);
        List<Map<String, Object>> consumos = jdbc.queryForList(SQL_CONSUMOS, idCliente);

        Map<String, Object> resumen = resumen(reservas, consumos);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("idCliente", idCliente);
        r.put("resumen", resumen);
        r.put("reservas", reservas);
        r.put("consumos", consumos.size() > MAXIMO_CONSUMOS ? consumos.subList(0, MAXIMO_CONSUMOS) : consumos);
        r.put("consumosOmitidos", Math.max(0, consumos.size() - MAXIMO_CONSUMOS));
        return r;
    }

    /** Totales del historial. Una "visita" es una reserva que llego a hacer check-in. */
    static Map<String, Object> resumen(List<Map<String, Object>> reservas, List<Map<String, Object>> consumos) {
        int visitas = 0;
        int noches = 0;
        int canceladas = 0;
        BigDecimal alojamiento = BigDecimal.ZERO;
        BigDecimal consumido = BigDecimal.ZERO;
        BigDecimal pagado = BigDecimal.ZERO;
        BigDecimal deuda = BigDecimal.ZERO;
        Object ultimaVisita = null;
        for (Map<String, Object> r : reservas) {
            String estado = String.valueOf(r.get("estado"));
            pagado = pagado.add(num(r.get("pagado")));
            if ("CANCELADA".equals(estado)) {
                canceladas++;
                continue;
            }
            if (r.get("id_estadia") != null) {
                visitas++;
                noches += r.get("num_noches") instanceof Number n ? n.intValue() : 0;
                alojamiento = alojamiento.add(num(r.get("monto_alojamiento_total")));
                consumido = consumido.add(num(r.get("consumos")));
                if (Boolean.TRUE.equals(r.get("salida_forzada"))) {
                    deuda = deuda.add(num(r.get("saldo_al_salir")).max(BigDecimal.ZERO));
                }
                if (ultimaVisita == null) {
                    ultimaVisita = r.get("fecha_checkin_real"); // vienen de la mas reciente a la mas antigua
                }
            }
        }

        Map<String, int[]> veces = new LinkedHashMap<>();
        for (Map<String, Object> c : consumos) {
            String producto = String.valueOf(c.get("producto"));
            int cantidad = c.get("cantidad") instanceof Number n ? n.intValue() : 1;
            veces.computeIfAbsent(producto, k -> new int[1])[0] += cantidad;
        }
        List<Map<String, Object>> favoritos = new ArrayList<>();
        veces.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, int[]> e) -> e.getValue()[0]).reversed())
                .limit(3)
                .forEach(e -> {
                    Map<String, Object> f = new LinkedHashMap<>();
                    f.put("producto", e.getKey());
                    f.put("cantidad", e.getValue()[0]);
                    favoritos.add(f);
                });

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reservas", reservas.size());
        m.put("visitas", visitas);
        m.put("noches", noches);
        m.put("canceladas", canceladas);
        m.put("totalAlojamiento", alojamiento);
        m.put("totalConsumos", consumido);
        m.put("totalPagado", pagado);
        m.put("deudaPendiente", deuda);
        m.put("ultimaVisita", ultimaVisita);
        m.put("favoritos", favoritos);
        return m;
    }

    private static BigDecimal num(Object v) {
        if (v instanceof BigDecimal b) return b;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }
}
