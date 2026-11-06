import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { BitacoraTurno } from "../../api/types";
import { dinero, esNotaDeDinero, fechaCorta, nombre } from "./comun";

interface Props {
  pendientes: BitacoraTurno[];
  turnoActualId?: number;
  esAdmin: boolean;
  onResolver: (nota: BitacoraTurno, comentario?: string) => Promise<void>;
}

/**
 * Notas sin resolver de todos los turnos, con la caja abierta o cerrada. Las diferencias de dinero (faltante o sobrante)
 * se destacan: solo el administrador las resuelve y debe explicar como. El resto lo marca resuelto cualquiera de caja.
 */
export function PanelNotas({ pendientes, turnoActualId, esAdmin, onResolver }: Props) {
  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (pendientes.length === 0) return null;
  const deDinero = pendientes.filter(esNotaDeDinero);

  const confirmar = async (n: BitacoraTurno) => {
    setGuardando(true);
    try {
      await onResolver(n, comentario.trim() || undefined);
      setResolviendo(null);
      setComentario("");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2" aria-label="Notas pendientes de turno">
      <h3 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
        <AlertTriangle size={14} /> Notas pendientes de resolver ({pendientes.length})
        {deDinero.length > 0 && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">{deDinero.length} de dinero</span>}
      </h3>
      <p className="text-[11px] text-amber-800">
        Novedades que dejaron los turnos de caja y nadie ha marcado como resueltas.
        {deDinero.length > 0 && " Las diferencias de dinero son efectivo que falta o sobra en la caja: no se deben dejar pasar."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {pendientes.map((n) => {
          const esDinero = esNotaDeDinero(n);
          const esDeEsteTurno = n.turnoCaja?.idTurnoCaja === turnoActualId;
          const abierta = resolviendo === n.idBitacora;
          return (
            <div key={n.idBitacora}
              className={`rounded-lg p-2.5 border ${esDinero ? "bg-red-50 border-red-300" : "bg-white border-amber-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[9px] font-bold uppercase ${esDinero ? "text-red-700" : "text-slate-500"}`}>
                  {esDinero ? (n.categoria === "APERTURA" ? "Diferencia al recibir la caja" : "Diferencia al cerrar la caja") : n.categoria}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                  n.prioridad === "ALTA" ? "bg-red-100 text-red-700" : n.prioridad === "BAJA" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"
                }`}>{n.prioridad}</span>
              </div>
              {esDinero && n.monto != null && (
                <p className="text-sm font-bold text-red-700 mt-1">{n.monto < 0 ? "Faltante" : "Sobrante"} {dinero(Math.abs(n.monto))}</p>
              )}
              <p className="text-[11px] text-slate-800 mt-1">{n.mensaje}</p>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {esDeEsteTurno ? "Turno actual" : `Turno #${n.turnoCaja?.idTurnoCaja ?? "?"}`}
                {n.turnoCaja?.empleado ? ` · ${nombre(n.turnoCaja.empleado)}` : ""} · {fechaCorta(n.fechaHora)}
              </p>

              {abierta ? (
                <div className="mt-2 space-y-1.5">
                  <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} autoFocus
                    placeholder={esDinero ? "Como se resolvio (repuesto, encontrado, ajuste autorizado...)" : "Comentario (opcional)"}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                  <div className="flex gap-2">
                    <button onClick={() => confirmar(n)} disabled={guardando || (esDinero && !comentario.trim())}
                      className="text-[11px] font-semibold bg-[#1b4332] text-white px-2.5 py-1 rounded-lg disabled:opacity-50">
                      Confirmar resuelto
                    </button>
                    <button onClick={() => { setResolviendo(null); setComentario(""); }} className="text-[11px] text-slate-500">Cancelar</button>
                  </div>
                </div>
              ) : esDinero && !esAdmin ? (
                <p className="text-[10px] text-red-700 mt-2 font-semibold">La resuelve el administrador.</p>
              ) : (
                <button onClick={() => (esDinero ? setResolviendo(n.idBitacora) : confirmar(n))} disabled={guardando}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 mt-2 disabled:opacity-40">
                  {esDinero ? "Resolver diferencia" : "Marcar resuelto"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
