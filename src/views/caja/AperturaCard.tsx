import { useState } from "react";
import { AlertTriangle, Wallet } from "lucide-react";
import type { InfoApertura } from "../../api/types";
import { AvisoFueraDeTurno } from "./AvisoFueraDeTurno";
import { dinero, fechaLarga } from "./comun";

interface Props {
  info: InfoApertura | null;
  abriendo: boolean;
  onAbrir: (fondo: number, motivoDiferencia?: string) => void;
}

/**
 * Recibir la caja. Quien abre cuenta el efectivo y lo declara; el sistema lo compara con lo que dejo el turno anterior.
 * Si no coincide, primero se le pide recontar sin decirle el monto; despues se le muestra y puede abrir explicando la
 * diferencia (queda una nota pendiente). Asi la caja no cambia de manos con dinero faltante sin que nadie lo note.
 */
export function AperturaCard({ info, abriendo, onAbrir }: Props) {
  const [fondo, setFondo] = useState("");
  const [fase, setFase] = useState<"inicial" | "recontar" | "revelado">("inicial");
  const [motivo, setMotivo] = useState("");
  const [enterado, setEnterado] = useState(false);

  const anterior = info?.ultimoCierre;
  const monto = Number(fondo);
  const hayFondo = fondo !== "" && monto >= 0;
  const diferencia = anterior && hayFondo ? Math.round((monto - anterior.efectivoDeclarado) * 100) / 100 : 0;
  const noCoincide = Boolean(anterior) && hayFondo && diferencia !== 0;
  const pendientesDeDinero = info?.diferenciasPendientes ?? [];
  const faltaEnterarse = pendientesDeDinero.length > 0 && !enterado;

  const intentar = () => {
    if (!hayFondo) return;
    if (!noCoincide) {
      onAbrir(monto);
    } else if (fase === "inicial") {
      setFase("recontar");
    } else if (fase === "recontar") {
      setFase("revelado");
    } else if (motivo.trim()) {
      onAbrir(monto, motivo.trim());
    }
  };

  const textoBoton = !noCoincide
    ? "Abrir caja"
    : fase === "inicial" ? "Verificar y abrir"
    : fase === "recontar" ? "Verificar de nuevo"
    : "Abrir con diferencia";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-xl space-y-3">
      <div className="text-center">
        <Wallet size={30} className="mx-auto mb-2 text-slate-300" />
        <h3 className="font-bold text-slate-800 text-sm">La caja esta cerrada</h3>
        <p className="text-slate-500 text-[11px] mt-1">
          Es una sola caja para todo el hotel. Al abrirla recibes el efectivo del turno anterior: cuentalo y declaralo.
        </p>
      </div>

      {anterior && (
        <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
          El turno #{anterior.idTurnoCaja} lo cerro {anterior.cerroPor} el {fechaLarga(anterior.fechaCierre)}.
          {fase === "revelado" && <> Dejo <strong>{dinero(anterior.efectivoDeclarado)}</strong> en la caja.</>}
        </p>
      )}

      {pendientesDeDinero.length > 0 && (
        <div className="border border-red-300 bg-red-50 rounded-lg p-2.5 space-y-1.5" role="alert">
          <p className="text-[11px] font-bold text-red-800 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Hay {pendientesDeDinero.length} diferencia(s) de dinero sin resolver
          </p>
          <ul className="text-[11px] text-red-900 space-y-0.5 list-disc pl-4">
            {pendientesDeDinero.slice(0, 4).map((n) => (
              <li key={n.idBitacora}>
                {n.monto != null && <strong>{n.monto < 0 ? "Faltante " : "Sobrante "}{dinero(Math.abs(n.monto))}</strong>} — turno #{n.turnoCaja?.idTurnoCaja ?? "?"}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-[11px] text-red-900 pt-1">
            <input type="checkbox" checked={enterado} onChange={(e) => setEnterado(e.target.checked)} />
            Estoy enterado: las resuelve el administrador desde esta pantalla.
          </label>
        </div>
      )}

      <div>
        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1" htmlFor="fondo-inicial">
          Efectivo que recibes y cuentas (S/)
        </label>
        <input
          id="fondo-inicial"
          type="number"
          min={0}
          step="0.01"
          value={fondo}
          onChange={(e) => {
            setFondo(e.target.value);
            if (fase === "recontar") setFase("inicial");
          }}
          placeholder="0.00"
          className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
      </div>

      {noCoincide && fase === "recontar" && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2" role="status">
          <strong>No coincide con lo que dejo el turno anterior.</strong> Vuelve a contar billetes y monedas con calma. Si el
          conteo es correcto, verifica de nuevo para ver lo que se esperaba.
        </p>
      )}

      {noCoincide && fase === "revelado" && anterior && (
        <div className="space-y-2">
          <p className="text-[11px] text-red-900 bg-red-50 border border-red-300 rounded-lg px-2.5 py-2" role="status">
            <strong>
              {diferencia < 0 ? "Faltan" : "Sobran"} {dinero(Math.abs(diferencia))}
            </strong>{" "}
            respecto a lo que dejo el turno anterior. Si el conteo es definitivo explica por que: la caja se abrira, pero
            quedara una nota pendiente de prioridad alta para el administrador.
          </p>
          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la diferencia (obligatorio)"
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
      )}

      <AvisoFueraDeTurno turno={info?.miTurno} accion="abrir" />

      <button
        onClick={intentar}
        disabled={!hayFondo || abriendo || faltaEnterarse || (noCoincide && fase === "revelado" && !motivo.trim())}
        className="w-full bg-[#1b4332] hover:bg-[#143427] disabled:opacity-50 text-white text-xs font-semibold py-2.5 rounded-lg"
      >
        {abriendo ? "Abriendo..." : textoBoton}
      </button>
      {!anterior && (
        <p className="text-[10px] text-slate-400 text-center">Es la primera apertura: no hay un turno anterior con quien comparar.</p>
      )}
    </div>
  );
}
