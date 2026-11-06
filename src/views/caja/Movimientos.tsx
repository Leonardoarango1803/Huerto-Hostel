import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { mensajeDeError } from "../../api/errores";
import type { MovimientoCaja } from "../../api/types";
import { dinero, fechaCorta, nombre } from "./comun";

interface Props {
  movimientos: MovimientoCaja[];
  total: number;
  onCambio: () => void;
  onError: (mensaje: string) => void;
}

/** Retiros a custodia y gastos menores en efectivo: salen de la caja y bajan el efectivo que espera el sistema. */
export function Movimientos({ movimientos, total, onCambio, onError }: Props) {
  const [tipo, setTipo] = useState<"RETIRO" | "GASTO">("RETIRO");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const registrar = async () => {
    if (!(Number(monto) > 0) || !motivo.trim()) {
      onError("Indica el monto y el motivo del movimiento.");
      return;
    }
    setGuardando(true);
    try {
      await cajaApi.registrarMovimiento({ tipo, monto: Number(monto), motivo: motivo.trim() });
      setMonto("");
      setMotivo("");
      onCambio();
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo registrar el movimiento."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <ArrowUpFromLine size={13} className="text-slate-500" /> Retiros y gastos en efectivo
        {total > 0 && <span className="ml-auto text-[10px] font-semibold text-slate-500">Total del turno: {dinero(total)}</span>}
      </h3>
      <p className="text-[11px] text-slate-500">
        Si sacas efectivo de la caja (a custodia o para un gasto menor), registralo aqui: asi el cuadre no marca un faltante.
      </p>
      <div className="grid grid-cols-6 gap-2">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "RETIRO" | "GASTO")} aria-label="Tipo de movimiento"
          className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400">
          <option value="RETIRO">Retiro a custodia</option>
          <option value="GASTO">Gasto menor</option>
        </select>
        <input type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto"
          aria-label="Monto del movimiento"
          className="col-span-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
        <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (obligatorio)" maxLength={200}
          aria-label="Motivo del movimiento"
          className="col-span-3 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
      </div>
      <button onClick={registrar} disabled={guardando}
        className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
        Registrar salida de efectivo
      </button>
      {movimientos.length > 0 && (
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="py-1.5">Hora</th><th>Tipo</th><th>Motivo</th><th>Quien</th><th className="text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimientos.map((m) => (
              <tr key={m.idMovimientoCaja}>
                <td className="py-1.5 text-slate-400">{fechaCorta(m.fechaHora)}</td>
                <td className="font-semibold text-slate-700">{m.tipo === "RETIRO" ? "Retiro" : m.tipo === "DEVOLUCION" ? "Devolución al huésped" : "Gasto"}</td>
                <td className="text-slate-600">{m.motivo}</td>
                <td className="text-slate-500">{nombre(m.empleado)}</td>
                <td className="text-right font-bold text-red-700">− {dinero(m.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
