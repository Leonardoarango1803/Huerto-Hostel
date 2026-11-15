import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Info } from "lucide-react";
import { DetalleReservaModal } from "./DetalleReservaModal";
import { misReservasApi, type MiReserva } from "../../api/publico";
import { fechaCorta, fotoDeTipo, soles } from "./utils";

const ESTADO: Record<MiReserva["estado"], { texto: string; clase: string }> = {
  PENDIENTE_ADELANTO: { texto: "Sin adelanto", clase: "bg-amber-100 text-amber-800" },
  CONFIRMADA: { texto: "Confirmada", clase: "bg-emerald-100 text-emerald-800" },
  EN_CURSO: { texto: "Estadía en curso", clase: "bg-blue-100 text-blue-700" },
  COMPLETADA: { texto: "Finalizada", clase: "bg-slate-200 text-slate-700" },
  CANCELADA: { texto: "Cancelada", clase: "bg-red-100 text-red-800" },
};

type Filtro = "proximas" | "pasadas" | "canceladas";

/** Reservas del huesped en su portal: proximas, pasadas y canceladas. */
export function MisReservasPortal() {
  const [lista, setLista] = useState<MiReserva[] | null>(null);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("proximas");
  const [detalle, setDetalle] = useState<MiReserva | null>(null);

  useEffect(() => {
    misReservasApi.listar().then(setLista).catch(() => setError(true));
  }, []);

  const grupo = (r: MiReserva): Filtro =>
    r.estado === "CANCELADA" ? "canceladas" : r.estado === "COMPLETADA" ? "pasadas" : "proximas";
  const visibles = (lista ?? []).filter((r) => grupo(r) === filtro);
  const cuenta = (f: Filtro) => (lista ?? []).filter((r) => grupo(r) === f).length;

  return (
    <section aria-labelledby="h-mis-reservas" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="h-mis-reservas" className="m-0 font-display text-2xl font-semibold">Mis reservas</h2>
        <Link to="/hospedaje" className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-terracota hover:bg-terracota-oscuro text-white text-sm font-bold">
          <CalendarPlus size={17} /> Nueva reserva
        </Link>
      </div>
      <div role="tablist" aria-label="Filtrar reservas" className="flex gap-1 border-b border-slate-200">
        {([["proximas", "Próximas"], ["pasadas", "Pasadas"], ["canceladas", "Canceladas"]] as const).map(([f, t]) => (
          <button
            key={f}
            role="tab"
            aria-selected={filtro === f}
            onClick={() => setFiltro(f)}
            className={`min-h-[44px] px-4 -mb-px border-b-[3px] text-sm font-bold ${filtro === f ? "border-huerto text-huerto" : "border-transparent text-slate-600"}`}
          >
            {t} ({cuenta(f)})
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-800">No pudimos cargar tus reservas.</p>}
      {lista === null && !error && <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />}
      {lista !== null && visibles.length === 0 && (
        <p className="m-0 text-sm text-slate-600 bg-white border border-[#EFE6D6] rounded-2xl px-5 py-6">
          {filtro === "proximas" ? "No tienes reservas próximas." : "Nada por aquí."}
        </p>
      )}
      {visibles.map((r) => (
        <article key={r.idReserva} className="bg-white border border-[#EFE6D6] rounded-[22px] overflow-hidden flex flex-wrap">
          <img src={fotoDeTipo(r.tipo)} alt="" className="flex-[1_1_200px] min-w-0 h-[170px] object-cover" />
          <div className="flex-[999_1_340px] min-w-0 p-5 flex flex-col gap-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-600">{r.codigo}{r.canal === "ONLINE" ? " · web" : ""}</span>
              <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${ESTADO[r.estado].clase}`}>{ESTADO[r.estado].texto}</span>
            </div>
            <h3 className="m-0 font-display text-xl font-semibold">
              {r.tipo ?? "Habitación"}{r.habitacion ? ` · Hab. ${r.habitacion}` : ""}
            </h3>
            <span className="text-[15px]">
              {fechaCorta(r.llegada)} → {fechaCorta(r.salida)}
              {r.noches ? ` · ${r.noches} ${r.noches === 1 ? "noche" : "noches"}` : ""}
            </span>
            <div className="mt-auto pt-2.5 border-t border-[#F1EADD] flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <span>Total <strong className="text-tinta">{soles(r.total)}</strong></span>
              <span>Pagado <strong className="text-emerald-800">{soles(r.pagado)}</strong></span>
              {r.estado !== "CANCELADA" && <span>Saldo <strong className="text-tinta">{soles(r.saldo)}</strong></span>}
              <button type="button" onClick={() => setDetalle(r)}
                className="ml-auto inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-slate-300 bg-white text-[13px] font-bold text-tinta hover:border-huerto">
                <Info size={15} /> Ver detalles
              </button>
            </div>
          </div>
        </article>
      ))}
      {detalle && <DetalleReservaModal reserva={detalle} onCerrar={() => setDetalle(null)} />}
    </section>
  );
}
