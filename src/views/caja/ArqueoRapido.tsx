import { useState } from "react";
import { CheckCircle, AlertTriangle, Calculator } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { mensajeDeError } from "../../api/errores";
import type { ArqueoParcial, ResultadoArqueo } from "../../api/types";
import { dinero, fechaCorta } from "./comun";

interface Props {
  arqueos: ArqueoParcial[];
  maximo: number;
  onCambio: () => void;
  onError: (mensaje: string) => void;
}

const ESTILO: Record<ArqueoParcial["resultado"], string> = {
  CUADRA: "bg-emerald-100 text-emerald-800",
  FALTA: "bg-red-100 text-red-700",
  SOBRA: "bg-amber-100 text-amber-800",
};

/**
 * Arqueo a mitad de turno: se cuenta el efectivo sin cerrar la caja para detectar a tiempo un faltante. Quien cuenta
 * solo se entera de si cuadra, falta o sobra (nunca de cuanto espera el sistema); queda anotado en la bitacora.
 */
export function ArqueoRapido({ arqueos, maximo, onCambio, onError }: Props) {
  const [efectivo, setEfectivo] = useState("");
  const [contando, setContando] = useState(false);
  const [ultimo, setUltimo] = useState<ResultadoArqueo | null>(null);

  const lleno = arqueos.length >= maximo;
  const monto = Number(efectivo);
  const puedeContar = efectivo !== "" && monto >= 0 && !contando && !lleno;

  const contar = async () => {
    if (!puedeContar) return;
    setContando(true);
    try {
      setUltimo(await cajaApi.arqueoParcial(monto));
      setEfectivo("");
      onCambio();
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo registrar el arqueo."));
    } finally {
      setContando(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <Calculator size={13} className="text-slate-500" /> Arqueo a mitad de turno
        <span className="ml-auto text-[10px] font-semibold text-slate-500">{arqueos.length} de {maximo}</span>
      </h3>
      <p className="text-[11px] text-slate-500">
        Cuenta el efectivo sin cerrar la caja y comprueba que va bien. Si no cuadra se anota en la bitacora para que el
        siguiente turno lo sepa.
      </p>
      <div className="flex gap-2">
        <input id="arqueo-parcial" type="number" min={0} step="0.01" value={efectivo} placeholder="Efectivo contado (S/)"
          aria-label="Efectivo contado en el arqueo parcial" onChange={(e) => setEfectivo(e.target.value)}
          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
        <button onClick={contar} disabled={!puedeContar}
          className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">
          Comprobar
        </button>
      </div>
      {lleno && <p className="text-[11px] text-amber-800">Ya usaste los {maximo} arqueos de este turno: el conteo final se hace al cerrar.</p>}

      {ultimo && (
        <div role="status" className={`text-[11px] rounded-lg border px-2.5 py-2 flex items-start gap-1.5 ${
          ultimo.cuadra ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"}`}>
          {ultimo.cuadra ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
          <span>
            {ultimo.mensaje}
            {ultimo.efectivoEsperado != null && (
              <> Esperado: <strong>{dinero(ultimo.efectivoEsperado)}</strong> · Diferencia: <strong>{dinero(ultimo.diferencia)}</strong>.</>
            )}
          </span>
        </div>
      )}

      {arqueos.length > 0 && (
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="py-1.5">Hora</th><th>Quien</th><th className="text-right">Conto</th><th className="text-center">Resultado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {arqueos.map((a) => (
              <tr key={a.idArqueo}>
                <td className="py-1.5 text-slate-400">{fechaCorta(a.fechaHora)}</td>
                <td className="text-slate-600">{a.empleado}</td>
                <td className="text-right text-slate-800 font-semibold">{dinero(a.efectivoContado)}</td>
                <td className="text-center">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${ESTILO[a.resultado]}`}>
                    {a.resultado}{a.diferencia != null && a.diferencia !== 0 ? ` ${dinero(a.diferencia)}` : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
