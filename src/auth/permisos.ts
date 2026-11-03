/**
 * Fuente unica de la matriz de accesos en el frontend: que modulos ve cada rol y que acciones
 * puede ejecutar. La usan el menu, las rutas y los botones de las vistas.
 *
 * El backend es quien manda (cada endpoint tiene su @PreAuthorize en security/Roles.java y un test
 * compara esa matriz con la acordada). Esto solo evita ofrecer botones que terminarian en 403,
 * y que alguien entre a una pantalla ajena escribiendo la URL.
 */

export type Rol =
  | "ADMINISTRADOR"
  | "RECEPCIONISTA"
  | "CAJERO"
  | "COCINA"
  | "BAR"
  | "HOUSEKEEPING"
  | "CLIENTE";

export type Modulo =
  | "dashboard"
  | "reservas"
  | "huespedes"
  | "habitaciones"
  | "checkin"
  | "consumos"
  | "pagos"
  | "checkout"
  | "comandas"
  | "limpieza"
  | "incidencias"
  | "solicitudes"
  | "caja"
  | "servicios"
  | "inventario"
  | "usuarios"
  | "turnos"
  | "reportes"
  | "configuracion"
  | "portal";

export const RUTA: Record<Modulo, string> = {
  dashboard: "/dashboard",
  reservas: "/reservas",
  huespedes: "/huespedes",
  habitaciones: "/habitaciones",
  checkin: "/checkin",
  consumos: "/consumos",
  pagos: "/pagos",
  checkout: "/checkout",
  comandas: "/comandas",
  limpieza: "/limpieza",
  incidencias: "/incidencias",
  solicitudes: "/solicitudes",
  caja: "/caja",
  servicios: "/servicios",
  inventario: "/inventario",
  usuarios: "/usuarios",
  turnos: "/turnos",
  reportes: "/reportes",
  configuracion: "/configuracion",
  portal: "/portal",
};

const TODOS_LOS_MODULOS = Object.keys(RUTA) as Modulo[];

/** Modulos a los que cada rol puede entrar. El orden es el del menu lateral. */
export const MODULOS_POR_ROL: Record<Rol, Modulo[]> = {
  ADMINISTRADOR: TODOS_LOS_MODULOS.filter((m) => m !== "portal"),
  RECEPCIONISTA: [
    "dashboard", "reservas", "huespedes", "habitaciones", "checkin", "consumos", "pagos", "checkout",
    "comandas", "limpieza", "incidencias", "caja", "solicitudes", "turnos",
  ],
  // Dinero y consulta: cobra y arquea, consulta lo necesario para cobrar. No crea reservas ni hace check-in.
  CAJERO: ["caja", "pagos", "checkout", "reservas", "huespedes", "habitaciones", "consumos"],
  COCINA: ["comandas", "inventario"],
  BAR: ["comandas", "inventario"],
  // Housekeeping ve solo los insumos de limpieza (el backend le recorta la lista).
  HOUSEKEEPING: ["limpieza", "incidencias", "solicitudes", "inventario"],
  CLIENTE: ["portal"],
};

export type Accion =
  | "crearReserva"
  | "cancelarReserva"
  | "registrarAdelanto"
  | "hacerCheckin"
  | "ingresoDirecto"
  | "editarHuesped"
  | "gestionarHabitaciones"
  | "registrarConsumo"
  | "registrarPago"
  | "hacerCheckout"
  | "operarCaja"
  | "cargarSolicitudAlFolio"
  | "gestionarInventario";

const RECEPCION: Rol[] = ["ADMINISTRADOR", "RECEPCIONISTA"];
const COBRO: Rol[] = ["ADMINISTRADOR", "RECEPCIONISTA", "CAJERO"];

/** Quien puede ejecutar cada accion (no solo ver la pantalla). */
export const ACCIONES: Record<Accion, Rol[]> = {
  crearReserva: RECEPCION,
  cancelarReserva: RECEPCION,
  registrarAdelanto: COBRO,
  hacerCheckin: RECEPCION,
  ingresoDirecto: RECEPCION,
  editarHuesped: RECEPCION,
  gestionarHabitaciones: RECEPCION,
  registrarConsumo: RECEPCION,
  registrarPago: COBRO,
  hacerCheckout: COBRO,
  operarCaja: COBRO,
  cargarSolicitudAlFolio: RECEPCION,
  // Alta y edicion de insumos, recetas y proveedores. Cocina, bar y housekeeping solo mueven stock.
  gestionarInventario: ["ADMINISTRADOR"],
};

/** Pantalla de aterrizaje de cada rol: el dashboard es solo de gestion. */
export const INICIO_POR_ROL: Record<Rol, Modulo> = {
  ADMINISTRADOR: "dashboard",
  RECEPCIONISTA: "dashboard",
  CAJERO: "caja",
  COCINA: "comandas",
  BAR: "comandas",
  HOUSEKEEPING: "limpieza",
  CLIENTE: "portal",
};

function esRol(valor: string | undefined): valor is Rol {
  return valor !== undefined && valor in MODULOS_POR_ROL;
}

export function puedeEntrar(rol: string | undefined, modulo: Modulo): boolean {
  return esRol(rol) && MODULOS_POR_ROL[rol].includes(modulo);
}

export function puede(rol: string | undefined, accion: Accion): boolean {
  return esRol(rol) && ACCIONES[accion].includes(rol);
}

/** Ruta de inicio del rol; un rol desconocido cae en el login, no en una pantalla ajena. */
export function rutaDeInicio(rol: string | undefined): string {
  return esRol(rol) ? RUTA[INICIO_POR_ROL[rol]] : "/login";
}

/** Roles que ven y operan la caja (los mismos que consultan su estado). */
export function usaCaja(rol: string | undefined): boolean {
  return puede(rol, "operarCaja");
}

/** Roles autorizados a entrar a un modulo, en el formato que espera ProtectedRoute. */
export function rolesDelModulo(modulo: Modulo): Rol[] {
  return (Object.keys(MODULOS_POR_ROL) as Rol[]).filter((r) => MODULOS_POR_ROL[r].includes(modulo));
}
