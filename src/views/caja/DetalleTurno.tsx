import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer, ShieldCheck, X } from "lucide-react";
import { cajaApi } from "../../api/caja";
import { mensajeDeError } from "../../api/errores";
import type { PagoReserva, ResumenTurno } from "../../api/types";
import { dinero, etiquetaDenominacion, fechaLarga, leerDesglose, nombre, DENOMINACIONES } from "./comun";

const METODO: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA_POS: "Tarjeta POS", PASARELA_ONLINE: "Pasarela online", TRANSFERENCIA: "Transferencia" };

function huespedDe(p: PagoReserva): string {
  const c = p.reserva?.cliente ?? p.estadia?.reserva?.cliente;
  return c ? `${c.nombres} ${c.apellidos}` : "—";
}

function habitacionDe(p: PagoReserva): string {
  const h = p.estadia?.habitacion ?? p.reserva?.habitacion;
  return h ? `Hab. ${h.numero}` : "—";
}

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: ReactNode; fuerte?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-slate-100 text-xs">
      <span className="text-slate-500">{etiqueta}</span>
      <span className={fuerte ? "font-bold text-slate-900" : "text-slate-800"}>{valor}</span>
    </div>
  );
}

/** Todo lo que paso en un turno: sirve igual para la pantalla y para el acta impresa. */
function Contenido({ r }: { r: ResumenTurno }) {
  const t = r.turno;
  const cerrado = t.estado !== "ABIERTO";
  const desglose = leerDesglose(t.desgloseCierre);
  const dif = Number(t.diferenciaCuadre ?? 0);
  const efectivoMovs = (r.movimientos ?? []).reduce((s, m) => s + Number(m.monto), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Turno</p>
          <Fila etiqueta="Abrio" valor={nombre(t.empleado)} />
          <Fila etiqueta="Apertura" valor={fechaLarga(t.fechaApertura)} />
          <Fila etiqueta="Fondo inicial" valor={dinero(t.fondoInicialEfectivo)} />
          {t.efectivoAperturaEsperado != null && (
            <Fila etiqueta="Dejo el turno anterior" valor={`${dinero(t.efectivoAperturaEsperado)}${t.diferenciaApertura ? ` (dif. ${dinero(t.diferenciaApertura)})` : ""}`} />
          )}
          {t.motivoDiferenciaApertura && <Fila etiqueta="Motivo de la diferencia al recibir" valor={t.motivoDiferenciaApertura} />}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cierre</p>
          {cerrado ? (
            <>
              <Fila etiqueta="Cerro" valor={nombre(t.empleadoCierre)} />
              <Fila etiqueta="Cierre" valor={fechaLarga(t.fechaCierre)} />
              <Fila etiqueta="Esperado" valor={dinero(t.efectivoSistemaEsperado)} />
              <Fila etiqueta="Declarado" valor={dinero(t.efectivoRealDeclarado)} />
              <Fila etiqueta="Resultado" fuerte valor={
                <span className={dif === 0 ? "text-emerald-700" : "text-red-700"}>
                  {dif === 0 ? "Cuadro" : `${dif < 0 ? "Faltante" : "Sobrante"} ${dinero(Math.abs(dif))}`}
                </span>} />
              <Fila etiqueta="Veces que no cuadro al verificar" valor={t.reconteosCierre ?? 0} />
              {t.esperadoRevelado && <Fila etiqueta="Se le mostro lo esperado" valor="Si" />}
              {t.motivoDiferencia && <Fila etiqueta="Motivo de la diferencia" valor={t.motivoDiferencia} />}
              {t.observacionesCierre && <Fila etiqueta="Observaciones" valor={t.observacionesCierre} />}
            </>
          ) : (
            <p className="text-xs text-slate-500">El turno sigue abierto.</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cobros por metodo</p>
        {Object.keys(r.totalPorMetodo ?? {}).length === 0 ? (
          <p className="text-xs text-slate-400">Sin cobros en este turno.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(r.totalPorMetodo).map(([m, v]) => (
              <div key={m} className="border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-500">{METODO[m] ?? m}</p>
                <p className="text-sm font-bold text-slate-900">{dinero(v)}</p>
              </div>
            ))}
            <div className="border border-emerald-300 bg-emerald-50 rounded-lg p-2">
              <p className="text-[10px] text-emerald-800">Total cobrado</p>
              <p className="text-sm font-bold text-emerald-900">{dinero(r.totalCobrado)}</p>
            </div>
          </div>
        )}
      </div>

      {r.pagos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cobros ({r.pagos.length})</p>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                <th className="py-1.5">Hora</th><th>Huesped</th><th>Habitacion</th><th>Concepto</th><th>Metodo</th><th>Comprobante</th><th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.pagos.map((p) => (
                <tr key={p.idPago}>
                  <td className="py-1.5 text-slate-400">{fechaLarga(p.fechaPago).slice(11)}</td>
                  <td className="text-slate-800 font-semibold">{huespedDe(p)}</td>
                  <td className="text-slate-600">{habitacionDe(p)}</td>
                  <td className="text-slate-600">{p.concepto.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="text-slate-600">{METODO[p.metodoPago] ?? p.metodoPago}</td>
                  <td className="text-slate-400">{p.numTransaccionComprobante ?? "—"}</td>
                  <td className="text-right font-bold">{dinero(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(r.movimientos ?? []).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Retiros y gastos (− {dinero(efectivoMovs)})</p>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-slate-100">
              {(r.movimientos ?? []).map((m) => (
                <tr key={m.idMovimientoCaja}>
                  <td className="py-1.5 text-slate-400">{fechaLarga(m.fechaHora).slice(11)}</td>
                  <td className="font-semibold">{m.tipo === "RETIRO" ? "Retiro" : m.tipo === "DEVOLUCION" ? "Devolución al huésped" : "Gasto"}</td>
                  <td className="text-slate-600">{m.motivo}</td>
                  <td className="text-slate-500">{nombre(m.empleado)}</td>
                  <td className="text-right font-bold text-red-700">− {dinero(m.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(r.arqueos ?? []).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Arqueos a mitad de turno ({(r.arqueos ?? []).length})</p>
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-slate-100">
              {(r.arqueos ?? []).map((a) => (
                <tr key={a.idArqueo}>
                  <td className="py-1.5 text-slate-400">{fechaLarga(a.fechaHora).slice(11)}</td>
                  <td className="text-slate-600">{a.empleado}</td>
                  <td className="text-right text-slate-800">Conto {dinero(a.efectivoContado)}</td>
                  <td className={`text-right font-semibold ${a.resultado === "CUADRA" ? "text-emerald-700" : "text-red-700"}`}>
                    {a.resultado}{a.diferencia != null && a.diferencia !== 0 ? ` (${dinero(a.diferencia)})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Object.keys(desglose).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Billetes y monedas contados al cerrar</p>
          <div className="flex flex-wrap gap-2">
            {DENOMINACIONES.filter((d) => desglose[d]).map((d) => (
              <span key={d} className="text-[11px] border border-slate-200 rounded px-2 py-0.5">{etiquetaDenominacion(d)}: <strong>{desglose[d]}</strong></span>
            ))}
          </div>
        </div>
      )}

      {(r.notas ?? []).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notas del turno</p>
          <ul className="space-y-1">
            {(r.notas ?? []).map((n) => (
              <li key={n.idBitacora} className="text-[11px] text-slate-700 border-l-2 pl-2 border-slate-300">
                <strong>{n.categoria}</strong> — {n.mensaje}{" "}
                <span className={n.resuelto ? "text-emerald-700" : "text-red-700 font-semibold"}>
                  {n.resuelto
                    ? `(resuelta${n.empleadoResolvio ? ` por ${nombre(n.empleadoResolvio)}` : ""}${n.comentarioResolucion ? `: ${n.comentarioResolucion}` : ""})`
                    : "(pendiente)"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface Props {
  idTurno: number;
  esAdmin: boolean;
  onCerrar: () => void;
  onAuditado: () => void;
}

/** Detalle de un turno: que se cobro, que salio de la caja, como se cerro y que quedo pendiente. Con acta imprimible. */
export function DetalleTurno({ idTurno, esAdmin, onCerrar, onAuditado }: Props) {
  const [estado, setEstado] = useState<{ id: number; resumen: ResumenTurno | null; error: string | null } | null>(null);
  const [auditando, setAuditando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    cajaApi.resumen(idTurno)
      .then((resumen) => vigente && setEstado({ id: idTurno, resumen, error: null }))
      .catch((e) => vigente && setEstado({ id: idTurno, resumen: null, error: mensajeDeError(e, "No se pudo cargar el turno.") }));
    return () => { vigente = false; };
  }, [idTurno]);

  const resumen = estado?.id === idTurno ? estado.resumen : null;
  const error = estado?.id === idTurno ? estado.error : null;

  const imprimir = () => {
    document.body.classList.add("imprimiendo-acta");
    const limpiar = () => {
      document.body.classList.remove("imprimiendo-acta");
      window.removeEventListener("afterprint", limpiar);
    };
    window.addEventListener("afterprint", limpiar);
    window.print();
  };

  const auditar = async () => {
    setAuditando(true);
    try {
      await cajaApi.auditar(idTurno);
      onAuditado();
      onCerrar();
    } catch (e) {
      setAviso(mensajeDeError(e, "No se pudo auditar el turno."));
    } finally {
      setAuditando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label={`Detalle del turno ${idTurno}`}>
        <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-start justify-between p-4 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Turno de caja #{idTurno}</h2>
              <p className="text-[11px] text-slate-500">{resumen ? `Estado: ${resumen.turno.estado}` : "Cargando..."}</p>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar detalle" className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="p-4 overflow-y-auto">
            {error && <p className="text-xs text-red-700">{error}</p>}
            {aviso && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mb-3">{aviso}</p>}
            {resumen ? <Contenido r={resumen} /> : !error && <p className="text-xs text-slate-400">Cargando...</p>}
          </div>
          {resumen && (
            <div className="flex justify-end gap-2 p-3 border-t border-slate-200">
              {esAdmin && resumen.turno.estado === "CERRADO" && (
                <button onClick={auditar} disabled={auditando}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                  <ShieldCheck size={13} /> Marcar como auditado
                </button>
              )}
              <button onClick={imprimir} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1b4332] text-white hover:bg-[#143427]">
                <Printer size={13} /> Imprimir acta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Copia solo para imprimir: fuera de la app, para que el acta salga limpia en la hoja. */}
      {resumen && createPortal(
        <div id="acta-cierre" className="hidden print:block p-6 font-sans text-slate-900">
          <h1 className="text-lg font-bold">Acta de turno de caja #{idTurno} — El Huerto Hostel</h1>
          <p className="text-xs text-slate-500 mb-4">Impresa el {new Date().toLocaleString("es-PE")}</p>
          <Contenido r={resumen} />
          <div className="grid grid-cols-2 gap-16 mt-16 text-xs text-center">
            <div className="border-t border-slate-400 pt-1">Firma de quien entrega la caja</div>
            <div className="border-t border-slate-400 pt-1">Firma de quien la recibe</div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
