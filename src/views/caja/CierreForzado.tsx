import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { mensajeDeError } from "../../api/errores";
import type { TurnoCaja } from "../../api/types";

interface Props {
  idTurno: number;
  horasAbierta: number;
  limiteHoras: number;
  abrio: string;
  onCerrado: (turno: TurnoCaja) => void;
  onError: (mensaje: string) => void;
}

/**
 * Solo el administrador, y solo cuando el turno lleva mas horas abierto que el limite: cuenta el efectivo, explica por
 * que se fuerza y el turno se cierra sin la verificacion del cajero. Queda una nota para el siguiente turno.
 */
export function CierreForzado({ idTurno, horasAbierta, limiteHoras, abrio, onCerrado, onError }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [efectivo, setEfectivo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cerrando, setCerrando] = useState(false);

  const monto = Number(efectivo);
  const puede = efectivo !== "" && monto >= 0 && motivo.trim() !== "" && !cerrando;

  const forzar = async () => {
    if (!puede) return;
    setCerrando(true);
    try {
      onCerrado(await cajaApi.cierreForzado(idTurno, { efectivoRealDeclarado: monto, motivo: motivo.trim() }));
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo forzar el cierre."));
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-2" role="alert">
      <h3 className="font-bold text-red-800 text-xs flex items-center gap-1.5">
        <AlertTriangle size={14} /> Esta caja lleva {horasAbierta} h abierta (limite: {limiteHoras} h)
      </h3>
      <p className="text-[11px] text-red-900">
        La abrio {abrio}. Si no esta quien la abrio o se olvido cerrarla, como administrador puedes forzar el cierre: cuentas
        el efectivo y explicas el motivo. Quedara una nota para el siguiente turno.
      </p>
      {!abierto ? (
        <button onClick={() => setAbierto(true)}
          className="text-[11px] font-semibold bg-white border border-red-300 text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-100">
          Forzar el cierre de esta caja
        </button>
      ) : (
        <div className="space-y-2">
          <input type="number" min={0} step="0.01" value={efectivo} onChange={(e) => setEfectivo(e.target.value)}
            placeholder="Efectivo que contaste en la caja (S/)" aria-label="Efectivo contado para el cierre forzado"
            className="w-full border border-red-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-400" />
          <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200}
            placeholder="Motivo del cierre forzado (obligatorio)" aria-label="Motivo del cierre forzado"
            className="w-full border border-red-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-400" />
          <div className="flex gap-2">
            <button onClick={forzar} disabled={!puede}
              className="text-[11px] font-semibold bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg">
              {cerrando ? "Cerrando..." : "Cerrar la caja ahora"}
            </button>
            <button onClick={() => setAbierto(false)} className="text-[11px] text-slate-600">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
