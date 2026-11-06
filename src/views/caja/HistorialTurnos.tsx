import { useState } from "react";
import { History } from "lucide-react";
import type { TurnoCaja } from "../../api/types";
import { DetalleTurno } from "./DetalleTurno";
import { dinero, fechaLarga, nombre } from "./comun";

interface Props {
  historial: TurnoCaja[];
  esAdmin: boolean;
  onCambio: () => void;
}

const ESTILO_ESTADO: Record<string, string> = {
  ABIERTO: "bg-blue-100 text-blue-800",
  CERRADO: "bg-slate-200 text-slate-700",
  AUDITADO: "bg-emerald-100 text-emerald-800",
};

/** Historial de turnos: filtro de los que cerraron con diferencia y detalle de cada uno (con acta y auditoria). */
export function HistorialTurnos({ historial, esAdmin, onCambio }: Props) {
  const [soloDiferencias, setSoloDiferencias] = useState(false);
  const [detalle, setDetalle] = useState<number | null>(null);

  const visibles = soloDiferencias ? historial.filter((t) => Number(t.diferenciaCuadre ?? 0) !== 0) : historial;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex items-center gap-1.5">
        <History size={13} className="text-slate-500" />
        <span className="font-bold text-slate-700 text-xs">Historial de cierres</span>
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600">
          <input type="checkbox" checked={soloDiferencias} onChange={(e) => setSoloDiferencias(e.target.checked)} />
          Solo con diferencia
        </label>
      </div>
      {visibles.length === 0 ? (
        <p className="p-4 text-center text-slate-400 text-xs">
          {soloDiferencias ? "Ningun turno cerro con diferencia." : "Sin turnos registrados."}
        </p>
      ) : (
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="p-3">Turno</th>
              <th className="p-3">Abrio</th>
              <th className="p-3">Cerro</th>
              <th className="p-3">Apertura</th>
              <th className="p-3">Cierre</th>
              <th className="p-3 text-right">Esperado</th>
              <th className="p-3 text-right">Declarado</th>
              <th className="p-3 text-right">Diferencia</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibles.map((t) => {
              const dif = Number(t.diferenciaCuadre ?? 0);
              return (
                <tr key={t.idTurnoCaja} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">#{t.idTurnoCaja}</td>
                  <td className="p-3 text-slate-600">{nombre(t.empleado)}</td>
                  <td className="p-3 text-slate-600">{nombre(t.empleadoCierre)}</td>
                  <td className="p-3 text-slate-400">{fechaLarga(t.fechaApertura)}</td>
                  <td className="p-3 text-slate-400">{fechaLarga(t.fechaCierre)}</td>
                  <td className="p-3 text-right text-slate-600">{t.efectivoSistemaEsperado != null ? dinero(t.efectivoSistemaEsperado) : "—"}</td>
                  <td className="p-3 text-right text-slate-600">{t.efectivoRealDeclarado != null ? dinero(t.efectivoRealDeclarado) : "—"}</td>
                  <td className={`p-3 text-right font-bold ${t.diferenciaCuadre == null ? "text-slate-400" : dif === 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {t.diferenciaCuadre != null ? dinero(dif) : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${ESTILO_ESTADO[t.estado] ?? ""}`}>{t.estado}</span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setDetalle(t.idTurnoCaja)} aria-label={`Ver detalle del turno ${t.idTurnoCaja}`}
                      className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {detalle !== null && (
        <DetalleTurno idTurno={detalle} esAdmin={esAdmin} onCerrar={() => setDetalle(null)} onAuditado={onCambio} />
      )}
    </div>
  );
}
