package pe.edu.utp.huertohostel.security;

/**
 * Matriz de accesos del hotel en un solo lugar. Cada constante es una expresion de
 * {@code @PreAuthorize} y nombra QUIEN hace ese trabajo, no una lista de roles: asi un
 * controller dice {@code @PreAuthorize(Roles.COBRO)} y quien lea sabe que ahi se mueve dinero.
 *
 * <p>Antes cada controller repetia la lista a mano; una errata ("LIMPIEZA" en vez de
 * "HOUSEKEEPING", que es como se llama el rol en la base) dejo sin acceso a un rol entero.
 * Los nombres de rol deben coincidir con la tabla {@code rol}. Un test compara estas
 * constantes con la matriz acordada, de modo que ningun rol gane o pierda un acceso sin aviso.
 *
 * <p>Los huespedes (CLIENTE) no son personal: la regla de caja no les aplica.
 */
public final class Roles {

    private Roles() {
    }

    public static final String ADMINISTRADOR = "ADMINISTRADOR";
    public static final String RECEPCIONISTA = "RECEPCIONISTA";
    public static final String CAJERO = "CAJERO";
    public static final String COCINA = "COCINA";
    public static final String BAR = "BAR";
    public static final String HOUSEKEEPING = "HOUSEKEEPING";
    public static final String CLIENTE = "CLIENTE";

    /** Gestion: usuarios, reportes, configuracion, dashboard, auditoria de caja. */
    public static final String SOLO_ADMIN = "hasRole('ADMINISTRADOR')";

    /** El frente del hotel: reservas, check-in, huespedes, consumos, estado de habitaciones. */
    public static final String RECEPCION = "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA')";

    /** Quienes mueven dinero: caja unica, pagos, adelantos y cobro final del check-out. */
    public static final String COBRO = "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO')";

    /**
     * Lo que el cajero solo consulta para poder cobrar (reservas, huespedes, estadias, tipos de
     * habitacion). Mismo conjunto que COBRO pero con otro nombre: si manana el cajero deja de
     * consultar y solo cobra, se cambia aqui sin tocar las rutas de dinero.
     */
    public static final String CONSULTA_COBRO = COBRO;

    /** Comandas y catalogo de productos (lectura): recepcion registra, cocina y bar atienden. */
    public static final String COCINA_BAR = "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'COCINA', 'BAR')";

    /** Insumos, recetas y movimientos de almacen. Recepcion no entra. */
    public static final String INVENTARIO = "hasAnyRole('ADMINISTRADOR', 'COCINA', 'BAR')";

    /**
     * Insumos y movimientos de almacen, incluida housekeeping: ve y mueve SOLO los insumos de area
     * LIMPIEZA (lo aplica InventarioService con el area restringida; aqui solo se abre la puerta).
     */
    public static final String INVENTARIO_OPERA = "hasAnyRole('ADMINISTRADOR', 'COCINA', 'BAR', 'HOUSEKEEPING')";

    /** Tareas de limpieza, incidencias y solicitudes del huesped: housekeeping opera, recepcion supervisa. */
    public static final String LIMPIEZA = "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'HOUSEKEEPING')";

    /** Lista de habitaciones: el cajero la consulta, housekeeping la necesita para reportar incidencias. */
    public static final String HABITACIONES_LISTA =
            "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO', 'HOUSEKEEPING', 'CLIENTE')";

    /** Detalle de una habitacion. */
    public static final String HABITACION_DETALLE = "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO', 'CLIENTE')";

    /** Panel de inicio: cada rol de personal ve el suyo (el servidor decide que datos le tocan). */
    public static final String PANEL =
            "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO', 'COCINA', 'BAR', 'HOUSEKEEPING')";

    /** Todo el personal del hotel (no huespedes): cada uno consulta su propio turno. */
    public static final String PERSONAL = PANEL;

    /** Pasarela de pago simulada: el personal cobra y el huesped paga lo suyo desde el portal. */
    public static final String PASARELA = "hasAnyRole('ADMINISTRADOR', 'RECEPCIONISTA', 'CAJERO', 'CLIENTE')";

    /** Autoservicio del huesped: solo ve y paga su propia estadia. */
    public static final String SOLO_CLIENTE = "hasRole('CLIENTE')";
}
