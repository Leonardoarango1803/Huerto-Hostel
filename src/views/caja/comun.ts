import type { BitacoraTurno } from "../../api/types";

/** Billetes y monedas que se cuentan al cerrar, de mayor a menor (soles). */
export const DENOMINACIONES = ["200", "100", "50", "20", "10", "5", "2", "1", "0.5", "0.2", "0.1"] as const;

export function etiquetaDenominacion(d: string): string {
  const n = Number(d);
  return n >= 10 ? `Billete S/ ${n}` : n >= 1 ? `Moneda S/ ${n}` : `Moneda ${Math.round(n * 100)} cent.`;
}

/** Suma billetes y monedas redondeando a centimos (0.1 + 0.2 no debe dar 0.30000000000000004). */
export function totalDeDesglose(desglose: Record<string, number>): number {
  const centimos = Object.entries(desglose).reduce((s, [d, c]) => s + Math.round(Number(d) * 100) * Math.max(0, Math.floor(c || 0)), 0);
  return centimos / 100;
}

/** Texto JSON guardado en el turno -> mapa; tolera datos viejos o danados. */
export function leerDesglose(texto: string | null | undefined): Record<string, number> {
  if (!texto) return {};
  try {
    const crudo = JSON.parse(texto) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(crudo).map(([d, c]) => [d, Number(c)]).filter(([, c]) => Number(c) > 0));
  } catch {
    return {};
  }
}

/** Notas que genera el sistema cuando hay una diferencia de dinero: solo el administrador las resuelve. */
export const CATEGORIAS_DE_DINERO = ["DESCUADRE", "APERTURA"];

export function esNotaDeDinero(n: Pick<BitacoraTurno, "categoria">): boolean {
  return CATEGORIAS_DE_DINERO.includes(n.categoria);
}

export function dinero(v: number | string | null | undefined): string {
  return `S/ ${Number(v ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function nombre(e: { nombres: string; apellidos: string } | null | undefined): string {
  return e ? `${e.nombres} ${e.apellidos}`.trim() : "—";
}

export function fechaCorta(iso: string | null | undefined): string {
  return iso ? iso.slice(5, 16).replace("T", " ") : "—";
}

export function fechaLarga(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "—";
}
