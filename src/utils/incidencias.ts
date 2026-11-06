import type { EstadoIncidencia, TipoIncidencia } from "../api/types";

/** Tipos de averia, en un solo lugar para que Incidencias y Limpieza ofrezcan lo mismo. */
export const TIPOS_INCIDENCIA: { value: TipoIncidencia; label: string }[] = [
  { value: "GRIFERIA_DUCHA", label: "Grifería / ducha" },
  { value: "PLOMERIA", label: "Plomería (fuga, desagüe, inodoro)" },
  { value: "AIRE_ACONDICIONADO", label: "Aire acondicionado" },
  { value: "ELECTRICO_FOCO", label: "Eléctrico / foco" },
  { value: "CERRADURA_VENTANA", label: "Cerradura / ventana" },
  { value: "MOBILIARIO", label: "Mobiliario" },
  { value: "CAMA_COLCHON", label: "Cama / colchón" },
  { value: "TV_ELECTRONICA", label: "TV / electrónica" },
  { value: "WIFI_INTERNET", label: "Wifi / internet" },
  { value: "PINTURA_PAREDES", label: "Pintura / paredes" },
  { value: "PLAGAS", label: "Plagas" },
  { value: "OTRO", label: "Otro" },
];

export const NOMBRE_TIPO = (t: string): string => TIPOS_INCIDENCIA.find((x) => x.value === t)?.label ?? t;

export const NOMBRE_ESTADO_INCIDENCIA: Record<EstadoIncidencia, string> = {
  PENDIENTE: "Pendiente",
  EN_REPARACION: "En reparación",
  RESUELTO: "Resuelta",
  DUPLICADA: "Duplicada",
  NO_PROCEDE: "No procede",
};

export const esAbierta = (e: EstadoIncidencia): boolean => e === "PENDIENTE" || e === "EN_REPARACION";

/** "35 min", "2 h 15 min" o "3 d 4 h" entre dos fechas (hasta = ahora si no se da). */
export function duracion(desde?: string | null, hasta?: string | null): string {
  if (!desde) return "—";
  const ini = new Date(desde).getTime();
  const fin = hasta ? new Date(hasta).getTime() : Date.now();
  if (Number.isNaN(ini) || Number.isNaN(fin)) return "—";
  const min = Math.max(0, Math.round((fin - ini) / 60000));
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `${horas} h ${min % 60} min`;
  return `${Math.floor(horas / 24)} d ${horas % 24} h`;
}
