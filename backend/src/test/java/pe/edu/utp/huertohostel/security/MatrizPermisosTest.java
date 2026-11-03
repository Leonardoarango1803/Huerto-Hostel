package pe.edu.utp.huertohostel.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Compara los {@code @PreAuthorize} reales de todos los controllers contra la matriz de accesos
 * acordada. La tabla esta escrita a mano, SIN usar las constantes de {@link Roles}: si fuera
 * circular no detectaria nada. Falla si:
 * <ul>
 *   <li>un endpoint cambia de acceso sin que se actualice esta tabla (un rol gana o pierde algo),</li>
 *   <li>aparece un endpoint nuevo que nadie decidio quien puede usar,</li>
 *   <li>una expresion nombra un rol que no existe en la tabla {@code rol} (el bug LIMPIEZA/HOUSEKEEPING).</li>
 * </ul>
 * No necesita base de datos ni contexto de Spring.
 */
class MatrizPermisosTest {

    private static final String PAQUETE = "pe.edu.utp.huertohostel.controller";
    private static final String TODOS = "*";

    /** Nombres tal cual existen en la tabla rol (V3) mas el huesped del portal. */
    private static final Set<String> ROLES_VALIDOS = Set.of(
            "ADMINISTRADOR", "RECEPCIONISTA", "CAJERO", "COCINA", "BAR", "HOUSEKEEPING", "CLIENTE");

    private static final Pattern NOMBRE_DE_ROL = Pattern.compile("'([A-Z_]+)'");

    private static Set<String> r(String... roles) {
        return new TreeSet<>(Arrays.asList(roles));
    }

    private static final Set<String> SOLO_ADMIN = r("ADMINISTRADOR");
    private static final Set<String> RECEPCION = r("ADMINISTRADOR", "RECEPCIONISTA");
    private static final Set<String> COBRO = r("ADMINISTRADOR", "RECEPCIONISTA", "CAJERO");
    private static final Set<String> COCINA_BAR = r("ADMINISTRADOR", "RECEPCIONISTA", "COCINA", "BAR");
    private static final Set<String> INVENTARIO = r("ADMINISTRADOR", "COCINA", "BAR");
    private static final Set<String> INVENTARIO_OPERA = r("ADMINISTRADOR", "COCINA", "BAR", "HOUSEKEEPING");
    private static final Set<String> LIMPIEZA = r("ADMINISTRADOR", "RECEPCIONISTA", "HOUSEKEEPING");
    private static final Set<String> HAB_LISTA = r("ADMINISTRADOR", "RECEPCIONISTA", "CAJERO", "HOUSEKEEPING", "CLIENTE");
    private static final Set<String> HAB_DETALLE = r("ADMINISTRADOR", "RECEPCIONISTA", "CAJERO", "CLIENTE");
    private static final Set<String> PASARELA = r("ADMINISTRADOR", "RECEPCIONISTA", "CAJERO", "CLIENTE");
    private static final Set<String> SOLO_CLIENTE = r("CLIENTE");
    private static final Set<String> PUBLICO = r(TODOS);

    /** La matriz acordada, endpoint por endpoint. */
    private static Map<String, Set<String>> esperada() {
        Map<String, Set<String>> m = new LinkedHashMap<>();

        // Publicos (permitAll en SecurityConfig)
        m.put("POST /api/v1/auth/login", PUBLICO);
        m.put("GET /api/v1/ping", PUBLICO);

        // Catalogos de apoyo
        m.put("GET /api/v1/areas", RECEPCION);
        m.put("GET /api/v1/roles", RECEPCION);
        m.put("GET /api/v1/turnos", RECEPCION);
        m.put("GET /api/v1/turnos/con-empleados", RECEPCION);

        // Caja unica: recepcion, cajero y admin operan sobre el mismo turno; auditar es solo del admin
        for (String ruta : List.of("GET /api/v1/caja/estado", "GET /api/v1/caja/turno-actual",
                "POST /api/v1/caja/abrir", "GET /api/v1/caja/turnos/{id}", "GET /api/v1/caja/turnos",
                "POST /api/v1/caja/turnos/{id}/cerrar", "GET /api/v1/caja/turnos/{id}/bitacora",
                "POST /api/v1/caja/turnos/{id}/bitacora", "PATCH /api/v1/caja/bitacora/{idBitacora}",
                "GET /api/v1/caja/bitacora/pendientes")) {
            m.put(ruta, COBRO);
        }
        m.put("POST /api/v1/caja/turnos/{id}/auditar", SOLO_ADMIN);

        // Huespedes: el cajero consulta, no crea ni edita ni da acceso al portal
        m.put("GET /api/v1/clientes", COBRO);
        m.put("GET /api/v1/clientes/{id}", COBRO);
        m.put("GET /api/v1/clientes/buscar", COBRO);
        m.put("GET /api/v1/clientes/estadisticas", COBRO);
        m.put("POST /api/v1/clientes", RECEPCION);
        m.put("PUT /api/v1/clientes/{id}", RECEPCION);
        m.put("GET /api/v1/clientes/consultar-dni", RECEPCION);
        m.put("GET /api/v1/clientes/consultar-ruc", RECEPCION);
        m.put("GET /api/v1/clientes/{id}/acceso", RECEPCION);
        m.put("POST /api/v1/clientes/{id}/acceso", RECEPCION);
        m.put("PATCH /api/v1/clientes/{id}/acceso", RECEPCION);
        m.put("POST /api/v1/clientes/{id}/acceso/password", RECEPCION);

        // Reservas: el cajero consulta y registra adelantos (es un cobro); no crea ni hace check-in
        m.put("GET /api/v1/reservas", COBRO);
        m.put("GET /api/v1/reservas/{id}", COBRO);
        m.put("POST /api/v1/reservas", RECEPCION);
        m.put("POST /api/v1/reservas/{id}/checkin", RECEPCION);
        m.put("POST /api/v1/reservas/{id}/adelanto", COBRO);
        m.put("PATCH /api/v1/reservas/{id}/estado", RECEPCION);
        m.put("GET /api/v1/reservas/{id}/pagos", COBRO);
        m.put("POST /api/v1/reservas/por-habitacion/{idHabitacion}/cancelar", RECEPCION);

        // Estadias: el cajero ve la cuenta y cobra el check-out; NO registra consumos
        m.put("GET /api/v1/estadias", COBRO);
        m.put("GET /api/v1/estadias/{id}", COBRO);
        m.put("GET /api/v1/estadias/{id}/consumos", COBRO);
        m.put("POST /api/v1/estadias/{id}/consumos", RECEPCION);
        m.put("GET /api/v1/estadias/resumen-checkout", COBRO);
        m.put("GET /api/v1/estadias/{id}/saldo", COBRO);
        m.put("POST /api/v1/estadias/{id}/checkout", COBRO);

        // Habitaciones y sus tipos
        m.put("GET /api/v1/habitaciones", HAB_LISTA);
        m.put("POST /api/v1/habitaciones", RECEPCION);
        m.put("GET /api/v1/habitaciones/{id}", HAB_DETALLE);
        m.put("PATCH /api/v1/habitaciones/{id}/estado", RECEPCION);
        m.put("GET /api/v1/habitaciones/resumen", RECEPCION);
        m.put("GET /api/v1/tipos-habitacion", COBRO);
        m.put("POST /api/v1/tipos-habitacion", SOLO_ADMIN);
        m.put("PUT /api/v1/tipos-habitacion/{id}", SOLO_ADMIN);

        // Pagos
        m.put("POST /api/v1/pagos", COBRO);
        m.put("POST /api/v1/pagos/pasarela/simular", PASARELA);

        // Cocina y bar
        for (String ruta : List.of("GET /api/v1/comandas", "GET /api/v1/comandas/{id}",
                "GET /api/v1/comandas/estadias-activas", "GET /api/v1/comandas/estadia/{idEstadia}",
                "POST /api/v1/comandas", "PATCH /api/v1/comandas/{id}/estado")) {
            m.put(ruta, COCINA_BAR);
        }
        m.put("GET /api/v1/productos", COCINA_BAR);
        m.put("GET /api/v1/productos/{id}", COCINA_BAR);
        m.put("POST /api/v1/productos", SOLO_ADMIN);
        m.put("PUT /api/v1/productos/{id}", SOLO_ADMIN);
        m.put("PATCH /api/v1/productos/{id}/estado", SOLO_ADMIN);
        m.put("DELETE /api/v1/productos/{id}", SOLO_ADMIN);

        // Inventario
        // Housekeeping entra al almacen, pero el servicio le limita la vista a los insumos de LIMPIEZA
        for (String ruta : List.of("GET /api/v1/inventario/insumos", "GET /api/v1/inventario/insumos/stock-bajo",
                "GET /api/v1/inventario/movimientos", "POST /api/v1/inventario/movimientos",
                "POST /api/v1/inventario/conteos", "GET /api/v1/inventario/reportes/consumo")) {
            m.put(ruta, INVENTARIO_OPERA);
        }
        for (String ruta : List.of("GET /api/v1/inventario/recetas", "GET /api/v1/inventario/recetas/{idProducto}",
                "GET /api/v1/inventario/proveedores")) {
            m.put(ruta, INVENTARIO);
        }
        for (String ruta : List.of("POST /api/v1/inventario/insumos", "PUT /api/v1/inventario/insumos/{id}",
                "PUT /api/v1/inventario/recetas/{idProducto}", "POST /api/v1/inventario/proveedores",
                "PUT /api/v1/inventario/proveedores/{id}")) {
            m.put(ruta, SOLO_ADMIN);
        }

        // Housekeeping, incidencias y solicitudes del huesped
        for (String ruta : List.of("GET /api/v1/tareas-limpieza", "POST /api/v1/tareas-limpieza",
                "PATCH /api/v1/tareas-limpieza/{id}/estado", "GET /api/v1/incidencias",
                "GET /api/v1/incidencias/{id}", "POST /api/v1/incidencias",
                "PATCH /api/v1/incidencias/{id}/estado", "GET /api/v1/solicitudes",
                "PATCH /api/v1/solicitudes/{id}/estado")) {
            m.put(ruta, LIMPIEZA);
        }
        m.put("POST /api/v1/solicitudes/{id}/cargar-folio", RECEPCION); // housekeeping atiende pero no carga al folio

        // Portal del huesped
        for (String ruta : List.of("GET /api/v1/portal/folio", "GET /api/v1/portal/consumos",
                "GET /api/v1/portal/solicitudes", "POST /api/v1/portal/solicitudes")) {
            m.put(ruta, SOLO_CLIENTE);
        }

        // Gestion
        m.put("GET /api/v1/dashboard/resumen", SOLO_ADMIN);
        m.put("GET /api/v1/reportes/resumen", SOLO_ADMIN);
        for (String ruta : List.of("GET /api/v1/empleados", "GET /api/v1/empleados/{id}", "POST /api/v1/empleados",
                "PUT /api/v1/empleados/{id}", "PATCH /api/v1/empleados/{id}/estado")) {
            m.put(ruta, SOLO_ADMIN);
        }
        return m;
    }

    /** Lo que de verdad declaran los controllers: "VERBO ruta" -> roles que pasan. */
    private static Map<String, Set<String>> real(List<String> problemas) throws Exception {
        Map<String, Set<String>> real = new LinkedHashMap<>();
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        for (BeanDefinition bd : scanner.findCandidateComponents(PAQUETE)) {
            Class<?> controller = Class.forName(bd.getBeanClassName());
            RequestMapping base = AnnotatedElementUtils.findMergedAnnotation(controller, RequestMapping.class);
            String prefijo = base != null && base.path().length > 0 ? base.path()[0] : "";

            for (Method metodo : controller.getDeclaredMethods()) {
                RequestMapping mapeo = AnnotatedElementUtils.findMergedAnnotation(metodo, RequestMapping.class);
                if (mapeo == null) {
                    continue;
                }
                String ruta = prefijo + (mapeo.path().length > 0 ? mapeo.path()[0] : "");
                for (RequestMethod verbo : mapeo.method()) {
                    // El metodo manda sobre la clase: un @PreAuthorize propio sobrescribe el de la clase.
                    PreAuthorize pa = metodo.getAnnotation(PreAuthorize.class);
                    if (pa == null) {
                        pa = controller.getAnnotation(PreAuthorize.class);
                    }
                    real.put(verbo + " " + ruta, pa == null ? PUBLICO : rolesDe(pa.value(), controller, metodo, problemas));
                }
            }
        }
        return real;
    }

    private static Set<String> rolesDe(String expresion, Class<?> c, Method m, List<String> problemas) {
        Set<String> roles = new TreeSet<>();
        Matcher mt = NOMBRE_DE_ROL.matcher(expresion);
        while (mt.find()) {
            String rol = mt.group(1);
            if (!ROLES_VALIDOS.contains(rol)) {
                problemas.add("Rol inexistente '" + rol + "' en " + c.getSimpleName() + "." + m.getName()
                        + " (en la base los roles son " + ROLES_VALIDOS + ")");
            }
            roles.add(rol);
        }
        return roles;
    }

    @Test
    void cadaEndpointTieneExactamenteElAccesoAcordado() throws Exception {
        List<String> problemas = new ArrayList<>();
        Map<String, Set<String>> real = real(problemas);
        Map<String, Set<String>> esperada = esperada();

        for (Map.Entry<String, Set<String>> e : real.entrySet()) {
            Set<String> acordado = esperada.get(e.getKey());
            if (acordado == null) {
                problemas.add("Endpoint sin decidir quien entra: " + e.getKey() + " -> " + e.getValue()
                        + " (agregalo a la matriz de este test)");
            } else if (!acordado.equals(e.getValue())) {
                Set<String> gana = new TreeSet<>(e.getValue());
                gana.removeAll(acordado);
                Set<String> pierde = new TreeSet<>(acordado);
                pierde.removeAll(e.getValue());
                problemas.add(e.getKey() + " | acordado " + acordado + " | real " + e.getValue()
                        + (gana.isEmpty() ? "" : " | GANAN acceso: " + gana)
                        + (pierde.isEmpty() ? "" : " | PIERDEN acceso: " + pierde));
            }
        }
        for (String ruta : esperada.keySet()) {
            if (!real.containsKey(ruta)) {
                problemas.add("La matriz lista un endpoint que ya no existe: " + ruta);
            }
        }

        assertTrue(problemas.isEmpty(), "\n" + problemas.size() + " diferencia(s) con la matriz:\n  - "
                + String.join("\n  - ", problemas));
    }
}
