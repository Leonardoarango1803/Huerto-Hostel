import { hoyISO, sumarDias } from "../../utils/fechas";
import fotoDoble from "../../assets/web/doble.jpg";
import fotoMatrimonial from "../../assets/web/matrimonial.jpg";
import fotoFamiliar from "../../assets/web/familiar.jpg";
import fotoIndividual from "../../assets/web/individual.jpg";
import fotoHero from "../../assets/web/hero.jpg";
import fotoPiscina from "../../assets/web/piscina.jpg";
import fotoBodega from "../../assets/web/bodega.jpg";
import fotoFogata from "../../assets/web/fogata.jpg";
import fotoTerraza from "../../assets/huerto-terraza.jpg";

export const FOTOS = { hero: fotoHero, piscina: fotoPiscina, bodega: fotoBodega, fogata: fotoFogata, terraza: fotoTerraza };

/** Foto de un tipo de habitacion segun su nombre (los tipos los crea el administrador). */
export function fotoDeTipo(nombre: string | null | undefined): string {
  const n = (nombre ?? "").toLowerCase();
  if (n.includes("famil") || n.includes("bungal")) return fotoFamiliar;
  if (n.includes("matri") || n.includes("suite")) return fotoMatrimonial;
  if (n.includes("indiv") || n.includes("simple")) return fotoIndividual;
  return fotoDoble;
}

/** Fotos para la galeria del detalle: la del tipo primero y luego los espacios comunes. */
export function galeriaDeTipo(nombre: string | null | undefined): { src: string; alt: string }[] {
  return [
    { src: fotoDeTipo(nombre), alt: `Habitación ${nombre ?? ""}` },
    { src: fotoTerraza, alt: "Terraza con vista a los viñedos" },
    { src: fotoPiscina, alt: "Piscina del hostel" },
    { src: fotoFogata, alt: "Patio con fogata al atardecer" },
  ];
}

export function soles(v: number | null | undefined, decimales = 2): string {
  return `S/ ${Number(v ?? 0).toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}

/** "vie 12 dic" a partir de "2026-12-12" (sin pasar por UTC). */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
}

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
}

export interface Busqueda {
  llegada: string;
  salida: string;
  huespedes: number;
}

/** Fechas por defecto: llegada en una semana, dos noches. */
export function busquedaPorDefecto(): Busqueda {
  const llegada = sumarDias(hoyISO(), 7);
  return { llegada, salida: sumarDias(llegada, 2), huespedes: 2 };
}

/** Lee ?llegada&salida&huespedes; lo que falte o no tenga sentido se completa con los valores por defecto. */
export function leerBusqueda(params: URLSearchParams): Busqueda {
  const def = busquedaPorDefecto();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const llegada = iso.test(params.get("llegada") ?? "") ? (params.get("llegada") as string) : def.llegada;
  let salida = iso.test(params.get("salida") ?? "") ? (params.get("salida") as string) : sumarDias(llegada, 2);
  if (salida <= llegada) salida = sumarDias(llegada, 1);
  const h = Number(params.get("huespedes"));
  return { llegada, salida, huespedes: Number.isFinite(h) && h >= 1 && h <= 8 ? Math.round(h) : def.huespedes };
}

export function aParams(b: Busqueda, extra: Record<string, string | number> = {}): string {
  const p = new URLSearchParams({ llegada: b.llegada, salida: b.salida, huespedes: String(b.huespedes) });
  Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
  return p.toString();
}

export const SERVICIOS_INCLUIDOS = ["Desayuno de campo", "Acceso a la piscina", "Wi-Fi", "Baño privado con agua caliente"];
