import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Coins, LockKeyhole, RefreshCw } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { mensajeDeError } from "../../api/errores";
import type { ResumenTurno, TurnoCaja, VerificacionCierre } from "../../api/types";
import { AvisoFueraDeTurno } from "./AvisoFueraDeTurno";
import { DENOMINACIONES, dinero, etiquetaDenominacion, totalDeDesglose } from "./comun";

interface Props {
  resumen: ResumenTurno;
  /** Notas de este turno aun sin resolver: pasan al siguiente turno al cerrar. */
  notasSinResolver: number;
  onCerrado: (turno: TurnoCaja, quedanPendientes: number, notaGuardada: boolean) => void;
  onError: (mensaje: string) => void;
}

/**
 * Cierre guiado. Se cuenta el efectivo (o billete por billete), se VERIFICA antes de cerrar y el sistema recomienda:
 * la primera vez que no cuadra dice si falta o sobra y pide recontar; la segunda muestra lo que espera. Solo se cierra
 * con diferencia si se explica el motivo, y eso deja una nota pendiente de prioridad alta para el administrador.
 */
export function CierreGuiado({ resumen, notasSinResolver, onCerrado, onError }: Props) {
  const idTurno = resumen.turno.idTurnoCaja;
  const campoEfectivo = useRef<HTMLInputElement>(null);

  const [efectivo, setEfectivo] = useState("");
  const [porDenominacion, setPorDenominacion] = useState(false);
  const [desglose, setDesglose] = useState<Record<string, number>>({});
  const [verificacion, setVerificacion] = useState<{ monto: number; resultado: VerificacionCierre } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [notaRelevo, setNotaRelevo] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const monto = porDenominacion ? totalDeDesglose(desglose) : Number(efectivo);
  const hayMonto = porDenominacion ? true : efectivo !== "" && monto >= 0;
  // Si cambia lo contado despues de verificar, hay que verificar de nuevo.
  const vigente = verificacion !== null && verificacion.monto === monto ? verificacion.resultado : null;
  const cuadra = vigente?.cuadra === true;
  const conDiferencia = vigente !== null && !vigente.cuadra;
  const puedeCerrar = vigente !== null && (cuadra || (motivo.trim() !== "" && (vigente.reconteos ?? 0) >= 1));

  const cambiarEfectivo = (valor: string) => {
    setEfectivo(valor);
  };

  const cambiarDenominacion = (d: string, valor: string) => {
    const n = Math.max(0, Math.floor(Number(valor) || 0));
    setDesglose((prev) => {
      const siguiente = { ...prev };
      if (n > 0) siguiente[d] = n;
      else delete siguiente[d];
      return siguiente;
    });
  };

  const verificar = async () => {
    if (!hayMonto) return;
    setVerificando(true);
    try {
      const resultado = await cajaApi.verificarCierre(idTurno, monto);
      setVerificacion({ monto, resultado });
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo verificar el conteo."));
    } finally {
      setVerificando(false);
    }
  };

  const volverAContar = () => {
    setVerificacion(null);
    if (!porDenominacion) campoEfectivo.current?.focus();
  };

  const cerrar = async () => {
    if (!puedeCerrar) return;
    setCerrando(true);
    try {
      const turno = await cajaApi.cerrar(idTurno, {
        efectivoRealDeclarado: monto,
        observacionesCierre: observaciones.trim() || undefined,
        motivoDiferencia: conDiferencia ? motivo.trim() : undefined,
        desgloseCierre: Object.keys(desglose).length > 0 ? JSON.stringify(desglose) : undefined,
      });
      let notaGuardada = true;
      if (notaRelevo.trim()) {
        try {
          await cajaApi.registrarNota(idTurno, { categoria: "CIERRE", mensaje: notaRelevo.trim(), prioridad: "MEDIA" });
        } catch {
          notaGuardada = false;
        }
      }
      onCerrado(turno, notasSinResolver + (notaRelevo.trim() && notaGuardada ? 1 : 0), notaGuardada);
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo cerrar la caja."));
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <LockKeyhole size={13} className="text-slate-500" /> Arqueo y cierre de caja
      </h3>

      {resumen.cierreCiego ? (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          Arqueo ciego: cuenta el efectivo fisico y declaralo. Antes de cerrar el sistema verifica tu conteo y te orienta si
          no cuadra.
        </p>
      ) : null}

      <AvisoFueraDeTurno turno={resumen.miTurno} accion="cerrar" />

      {resumen.superaTope && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 flex items-start gap-1.5" role="status">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Hay mucho efectivo en la caja (tope de {dinero(resumen.topeEfectivo)}). Considera un retiro a custodia y registralo
          en "Retiros y gastos".
        </p>
      )}

      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-500 font-bold uppercase" htmlFor="efectivo-contado">Efectivo contado (S/)</label>
        <button type="button" onClick={() => { setPorDenominacion((v) => !v); setVerificacion(null); }}
          className="text-[10px] font-semibold text-emerald-700 hover:underline flex items-center gap-1">
          <Coins size={11} /> {porDenominacion ? "Escribir el total" : "Contar por billetes y monedas"}
        </button>
      </div>

      {porDenominacion ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {DENOMINACIONES.map((d) => (
              <label key={d} className="text-[10px] text-slate-500">
                {etiquetaDenominacion(d)}
                <input type="number" min={0} step={1} value={desglose[d] ?? ""} placeholder="0"
                  onChange={(e) => cambiarDenominacion(d, e.target.value)} aria-label={etiquetaDenominacion(d)}
                  className="mt-0.5 w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-700">Total contado: <strong id="efectivo-contado">{dinero(monto)}</strong></p>
        </div>
      ) : (
        <input id="efectivo-contado" ref={campoEfectivo} type="number" min={0} step="0.01" value={efectivo}
          onChange={(e) => cambiarEfectivo(e.target.value)} placeholder="0.00"
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
      )}

      {vigente === null && (
        <button onClick={verificar} disabled={!hayMonto || verificando}
          className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
          <RefreshCw size={12} className={verificando ? "animate-spin" : ""} /> Verificar conteo
        </button>
      )}

      {cuadra && vigente && (
        <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-2 flex items-start gap-1.5" role="status">
          <CheckCircle size={14} className="mt-0.5 shrink-0" /> {vigente.mensaje}
        </div>
      )}

      {conDiferencia && vigente && (
        <div className={`rounded-lg border px-2.5 py-2 space-y-2 ${vigente.revelado ? "bg-red-50 border-red-300 text-red-900" : "bg-amber-50 border-amber-300 text-amber-900"}`} role="status">
          <p className="text-[11px] font-bold flex items-start gap-1.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {vigente.mensaje}
          </p>
          {vigente.recomendacion && <p className="text-[11px]">{vigente.recomendacion}</p>}
          {vigente.revelado && vigente.efectivoEsperado != null && (
            <p className="text-[11px]">
              Esperado: <strong>{dinero(vigente.efectivoEsperado)}</strong> · Declarado: <strong>{dinero(monto)}</strong> · Diferencia:{" "}
              <strong>{dinero(vigente.diferencia)}</strong>
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={volverAContar} className="text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg">
              Volver a contar
            </button>
            {!vigente.revelado && (
              <button onClick={verificar} disabled={verificando} className="text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg">
                Verificar de nuevo
              </button>
            )}
          </div>
          {vigente.revelado && (
            <div className="space-y-1.5 pt-1 border-t border-red-200">
              <p className="text-[11px] font-semibold">
                Si el conteo es definitivo puedes cerrar con diferencia: explica el motivo. Quedara una nota pendiente de
                prioridad alta para el administrador, y el siguiente turno la vera al recibir la caja.
              </p>
              <textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de la diferencia (obligatorio)"
                className="w-full border border-red-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-400" />
            </div>
          )}
        </div>
      )}

      {vigente !== null && (
        <>
          {notasSinResolver > 0 && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              Este turno tiene {notasSinResolver} nota(s) sin resolver: al cerrar pasan al siguiente turno como pendientes.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Observaciones del cierre</label>
              <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Dejar una nota para el siguiente turno (opcional)</label>
              <input type="text" value={notaRelevo} onChange={(e) => setNotaRelevo(e.target.value)}
                placeholder="Ej.: falta cambio de billetes pequeños"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
          </div>
          <button onClick={cerrar} disabled={!puedeCerrar || cerrando}
            className={`text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 ${conDiferencia ? "bg-red-700 hover:bg-red-800" : "bg-slate-800 hover:bg-slate-900"}`}>
            {cerrando ? "Cerrando..." : conDiferencia ? "Cerrar turno con diferencia" : "Cerrar turno"}
          </button>
        </>
      )}
    </div>
  );
}
