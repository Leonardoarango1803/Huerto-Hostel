import type { EmpleadoAdmin } from "../../api/usuarios";

/** Area que corresponde a cada rol (la misma regla del servidor): evita combinaciones sin sentido. */
export const AREA_DEL_ROL: Record<string, string> = {
  ADMINISTRADOR: "RECEPCION",
  RECEPCIONISTA: "RECEPCION",
  CAJERO: "RECEPCION",
  HOUSEKEEPING: "HOUSEKEEPING",
  COCINA: "COCINA",
  BAR: "BAR",
};

export const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  RECEPCIONISTA: "Recepcionista",
  CAJERO: "Cajero",
  COCINA: "Cocina",
  BAR: "Bar",
  HOUSEKEEPING: "Limpieza",
};

export const ETIQUETA_ACCION: Record<string, string> = {
  EMPLEADO_CREADO: "Empleado creado",
  EMPLEADO_EDITADO: "Empleado editado",
  EMPLEADO_ACTIVADO: "Empleado activado",
  EMPLEADO_DESACTIVADO: "Empleado desactivado",
  TURNO_ASIGNADO: "Turno asignado",
  TURNO_EDITADO: "Horario editado",
  ACCESO_CREADO: "Acceso creado",
  PASSWORD_RESTABLECIDA: "Contraseña restablecida",
  CHECKOUT_NOCHES_AJUSTADAS: "Check-out: noches ajustadas",
  CHECKOUT_CON_DEUDA: "Check-out con saldo pendiente",
};

export type EstadoAcceso = "SIN_CUENTA" | "ACTIVA" | "TEMPORAL" | "BLOQUEADA";

export function estadoDeAcceso(e: EmpleadoAdmin): EstadoAcceso {
  if (!e.acceso.tieneCuenta) return "SIN_CUENTA";
  if (!e.acceso.activa) return "BLOQUEADA";
  return e.acceso.debeCambiarPassword ? "TEMPORAL" : "ACTIVA";
}

export const TEXTO_ACCESO: Record<EstadoAcceso, { texto: string; variante: "slate" | "emerald" | "amber" | "red" }> = {
  SIN_CUENTA: { texto: "Sin cuenta", variante: "slate" },
  ACTIVA: { texto: "Activa", variante: "emerald" },
  TEMPORAL: { texto: "Clave temporal pendiente", variante: "amber" },
  BLOQUEADA: { texto: "Bloqueada", variante: "red" },
};

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function nombreCompleto(e: { nombres: string; apellidos: string }): string {
  return `${e.nombres} ${e.apellidos}`.trim();
}
