import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { hoyISO, sumarDias } from "../../utils/fechas";
import type { Busqueda } from "./utils";

interface Props {
  inicial: Busqueda;
  onBuscar: (b: Busqueda) => void;
  textoBoton?: string;
  /** "flotante" = la tarjeta grande de la portada. */
  variante?: "flotante" | "barra";
}

const etiqueta = "flex flex-col gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-600";
const campo =
  "min-h-[50px] rounded-xl border border-slate-200 bg-arena px-3.5 text-[15px] font-semibold normal-case tracking-normal text-tinta focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto";

/** Llegada, salida y huespedes. Corrige la salida si queda antes de la llegada. */
export function BuscadorFechas({ inicial, onBuscar, textoBoton = "Ver disponibilidad", variante = "barra" }: Props) {
  const [b, setB] = useState<Busqueda>(inicial);
  const hoy = hoyISO();

  const cambiarLlegada = (llegada: string) => {
    setB((prev) => ({ ...prev, llegada, salida: prev.salida <= llegada ? sumarDias(llegada, 1) : prev.salida }));
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onBuscar(b);
  };

  return (
    <form
      onSubmit={enviar}
      aria-label="Buscar disponibilidad"
      className={`grid gap-3.5 items-end [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] bg-white ${
        variante === "flotante" ? "rounded-3xl p-6 shadow-[0_24px_60px_rgba(31,27,18,.16)]" : "rounded-2xl p-4 border border-[#EFE6D6]"
      }`}
    >
      <label className={etiqueta}>
        Llegada
        <input type="date" required min={hoy} value={b.llegada} onChange={(e) => cambiarLlegada(e.target.value)} className={campo} />
      </label>
      <label className={etiqueta}>
        Salida
        <input type="date" required min={sumarDias(b.llegada, 1)} value={b.salida} onChange={(e) => setB({ ...b, salida: e.target.value })} className={campo} />
      </label>
      <label className={etiqueta}>
        Huéspedes
        <select value={b.huespedes} onChange={(e) => setB({ ...b, huespedes: Number(e.target.value) })} className={campo}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "persona" : "personas"}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="min-h-[50px] rounded-xl bg-huerto hover:bg-huerto-oscuro text-white font-bold text-base flex items-center justify-center gap-2.5"
      >
        <Search size={18} strokeWidth={2.2} /> {textoBoton}
      </button>
    </form>
  );
}
