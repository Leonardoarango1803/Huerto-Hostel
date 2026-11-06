/**
 * Fechas del hostel como texto yyyy-MM-dd en la hora LOCAL del navegador. No usar toISOString() para esto:
 * convierte a UTC y, pasadas las 7 p.m. en Lima, devuelve el dia siguiente.
 */

function aTexto(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function deTexto(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function hoyISO(): string {
  return aTexto(new Date());
}

export function sumarDias(iso: string, dias: number): string {
  const d = deTexto(iso);
  d.setDate(d.getDate() + dias);
  return aTexto(d);
}

export function inicioDeMes(iso: string, desfase = 0): string {
  const d = deTexto(iso);
  return aTexto(new Date(d.getFullYear(), d.getMonth() + desfase, 1));
}

export function finDeMes(iso: string, desfase = 0): string {
  const d = deTexto(iso);
  return aTexto(new Date(d.getFullYear(), d.getMonth() + desfase + 1, 0));
}

export function inicioDeAnio(iso: string): string {
  return `${deTexto(iso).getFullYear()}-01-01`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11-05" -> "5 nov". */
export function diaCorto(iso: string): string {
  const d = deTexto(iso.slice(0, 10));
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** "2026-11-05" -> "5 nov 2026". */
export function diaLargo(iso: string): string {
  const d = deTexto(iso.slice(0, 10));
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-11-05T14:30:00" -> "05/11 14:30". */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [fecha, hora = ""] = iso.split("T");
  const [, m, d] = fecha.split("-");
  return `${d}/${m} ${hora.slice(0, 5)}`;
}

/** Hace cuanto se genero un dato, para el aviso "actualizado hace...". */
export function haceCuanto(iso: string | undefined, ahora = Date.now()): string {
  if (!iso) return "";
  // El servidor manda la hora de Lima sin zona (Lima no tiene horario de verano): se lee como Lima aunque el navegador este en otra zona.
  const conZona = /(Z|[+-]\d{2}:\d{2})$/.test(iso);
  const segundos = Math.max(0, Math.round((ahora - new Date(conZona ? iso : iso + "-05:00").getTime()) / 1000));
  if (segundos < 5) return "ahora";
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  return minutos < 60 ? `hace ${minutos} min` : `hace ${Math.floor(minutos / 60)} h`;
}

/**
 * dd/MM/aaaa. Una fecha sola ("2026-11-07", como la salida prevista de una reserva) se toma como dia LOCAL: con
 * `new Date("2026-11-07")` el navegador la lee como medianoche UTC y en Lima muestra el dia anterior.
 */
export function fechaDMA(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = valor.length === 10 ? deTexto(valor) : new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
