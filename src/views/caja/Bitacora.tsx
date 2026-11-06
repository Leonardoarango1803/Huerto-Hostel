import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import type { BitacoraTurno } from "../../api/types";
import { esNotaDeDinero, fechaCorta, nombre } from "./comun";

const PRIORIDADES = ["ALTA", "MEDIA", "BAJA"];

interface Props {
  notas: BitacoraTurno[];
  onAgregar: (nota: { categoria: string; mensaje: string; prioridad: string }) => Promise<boolean>;
  onAlternar: (nota: BitacoraTurno) => void;
}

/** Bitacora de relevo del turno abierto: novedades para quien sigue. Las de dinero las genera el sistema. */
export function Bitacora({ notas, onAgregar, onAlternar }: Props) {
  const [nota, setNota] = useState({ categoria: "GENERAL", mensaje: "", prioridad: "MEDIA" });

  const agregar = async () => {
    if (await onAgregar(nota)) setNota({ categoria: "GENERAL", mensaje: "", prioridad: "MEDIA" });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <ClipboardList size={13} className="text-slate-500" /> Bitacora de relevo
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={nota.categoria} onChange={(e) => setNota((n) => ({ ...n, categoria: e.target.value }))}
          placeholder="Categoria"
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
        <select value={nota.prioridad} onChange={(e) => setNota((n) => ({ ...n, prioridad: e.target.value }))}
          className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <textarea rows={2} value={nota.mensaje} onChange={(e) => setNota((n) => ({ ...n, mensaje: e.target.value }))}
        placeholder="Novedad para el siguiente turno..."
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
      <button onClick={agregar}
        className="w-full bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5">
        <Plus size={12} /> Agregar nota
      </button>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        {notas.length === 0 ? (
          <p className="text-center text-slate-400 text-[11px] py-2">Sin novedades registradas.</p>
        ) : (
          notas.map((n) => (
            <div key={n.idBitacora}
              className={`rounded-lg border p-2 ${n.resuelto ? "border-slate-200 bg-slate-50" : esNotaDeDinero(n) ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase">{n.categoria}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  n.prioridad === "ALTA" ? "bg-red-100 text-red-700" : n.prioridad === "BAJA" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"
                }`}>{n.prioridad}</span>
              </div>
              <p className={`text-[11px] mt-1 ${n.resuelto ? "text-slate-500" : "text-slate-700"}`}>{n.mensaje}</p>
              {n.resuelto && (
                <p className="text-[10px] text-emerald-700 mt-1">
                  Resuelta{n.empleadoResolvio ? ` por ${nombre(n.empleadoResolvio)}` : ""} · {fechaCorta(n.fechaResolucion)}
                  {n.comentarioResolucion ? ` — ${n.comentarioResolucion}` : ""}
                </p>
              )}
              {!esNotaDeDinero(n) && (
                <button onClick={() => onAlternar(n)} className="text-[10px] text-emerald-700 font-semibold mt-1 hover:text-emerald-900">
                  {n.resuelto ? "Reabrir" : "Marcar resuelto"}
                </button>
              )}
              {esNotaDeDinero(n) && !n.resuelto && (
                <p className="text-[10px] text-red-700 font-semibold mt-1">Pendiente: se resuelve en "Notas pendientes de resolver".</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
