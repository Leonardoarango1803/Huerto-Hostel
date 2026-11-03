import type { AreaInsumo, Insumo, TipoMovInventario } from "../../api/types";

export const UNIDADES = ["GR", "ML", "UND"] as const;
export const AREAS: AreaInsumo[] = ["GENERAL", "COCINA", "BAR", "LIMPIEZA"];

export const AREA_LABEL: Record<AreaInsumo, string> = {
  GENERAL: "General",
  COCINA: "Cocina",
  BAR: "Bar",
  LIMPIEZA: "Limpieza",
};

export const TIPO_LABEL: Record<TipoMovInventario, string> = {
  ENTRADA: "Entrada",
  SALIDA_CONSUMO: "Consumo",
  AJUSTE_MERMA: "Merma",
  AJUSTE_INGRESO: "Sobrante",
};

/** true si el movimiento suma al almacen. */
export const SUMA_STOCK: Record<TipoMovInventario, boolean> = {
  ENTRADA: true,
  SALIDA_CONSUMO: false,
  AJUSTE_MERMA: false,
  AJUSTE_INGRESO: true,
};

export type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/** Cantidades sin ceros sobrantes: 12.50 -> 12.5, 3.000 -> 3. */
export function num(valor: number | string | null | undefined, decimales = 3): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = Number(valor);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-PE", { maximumFractionDigits: decimales });
}

export function soles(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type EstadoStock = "inactivo" | "agotado" | "reponer" | "ok";

export function estadoStock(i: Insumo): EstadoStock {
  if (i.estado === false) return "inactivo";
  if (Number(i.stockActual) <= 0) return "agotado";
  if (Number(i.stockActual) <= Number(i.stockMinimo)) return "reponer";
  return "ok";
}

/** Fecha local (no UTC) en formato yyyy-MM-dd, para los filtros de fecha. */
export function hoyISO(restarDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - restarDias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}
