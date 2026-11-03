import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  LockKeyhole,
  ClipboardList,
  Plus,
  History,
} from "lucide-react";
import { cajaApi } from "../api/caja";
import { useCaja } from "../context/CajaContext";
import { mensajeDeError } from "../api/errores";
import type { BitacoraTurno, ResumenTurno, TurnoCaja } from "../api/types";

const PRIORIDADES = ["ALTA", "MEDIA", "BAJA"];

export function CajaView() {
  const { refrescar: refrescarCaja } = useCaja();
  const [resumen, setResumen] = useState<ResumenTurno | null>(null);
  const [bitacora, setBitacora] = useState<BitacoraTurno[]>([]);
  const [historial, setHistorial] = useState<TurnoCaja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const [fondoInicial, setFondoInicial] = useState("0");
  const [arqueo, setArqueo] = useState({ efectivo: "", observaciones: "" });
  const [nota, setNota] = useState({ categoria: "GENERAL", mensaje: "", prioridad: "MEDIA" });

  const cargar = useCallback(async () => {
    try {
      const data = await cajaApi.turnoActual();
      setResumen(data);
      if (data) {
        const notas = await cajaApi.listarBitacora(data.turno.idTurnoCaja);
        setBitacora(notas);
      } else {
        setBitacora([]);
      }
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo cargar el estado de la caja." });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    cajaApi
      .historial()
      .then(setHistorial)
      .catch(() => undefined);
  }, [cargar]);

  const abrirCaja = async () => {
    setMensaje(null);
    try {
      await cajaApi.abrir(Number(fondoInicial || "0"));
      setMensaje({ tipo: "ok", texto: "Caja abierta. Recepcion, cajero y administrador operan sobre este mismo turno." });
      cargar();
      refrescarCaja();
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo abrir la caja.") });
      cargar(); // si otra persona la abrio primero, mostrar su turno
      refrescarCaja();
    }
  };

  const cerrarCaja = async () => {
    if (!resumen) return;
    if (arqueo.efectivo === "") {
      setMensaje({ tipo: "error", texto: "Declara el efectivo contado antes de cerrar." });
      return;
    }
    try {
      const turno = await cajaApi.cerrar(
        resumen.turno.idTurnoCaja,
        Number(arqueo.efectivo),
        arqueo.observaciones || undefined
      );
      const dif = Number(turno.diferenciaCuadre ?? 0);
      setMensaje({
        tipo: "ok",
        texto:
          dif === 0
            ? "Caja cerrada y cuadrada correctamente."
            : `Caja cerrada con una diferencia de S/ ${dif.toFixed(2)} (esperado S/ ${Number(
                turno.efectivoSistemaEsperado ?? 0
              ).toFixed(2)}).`,
      });
      setArqueo({ efectivo: "", observaciones: "" });
      cargar();
      refrescarCaja();
      cajaApi.historial().then(setHistorial).catch(() => undefined);
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo cerrar la caja.") });
    }
  };

  const agregarNota = async () => {
    if (!resumen || !nota.mensaje.trim()) {
      setMensaje({ tipo: "error", texto: "Escribe el mensaje de la bitacora." });
      return;
    }
    try {
      await cajaApi.registrarNota(resumen.turno.idTurnoCaja, nota);
      setNota({ categoria: "GENERAL", mensaje: "", prioridad: "MEDIA" });
      const notas = await cajaApi.listarBitacora(resumen.turno.idTurnoCaja);
      setBitacora(notas);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo registrar la nota." });
    }
  };

  const alternarResuelto = async (n: BitacoraTurno) => {
    try {
      await cajaApi.marcarResuelto(n.idBitacora, !n.resuelto);
      if (resumen) {
        setBitacora(await cajaApi.listarBitacora(resumen.turno.idTurnoCaja));
      }
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo actualizar la nota." });
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Recepcion › Caja</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Turno de Caja y Arqueo</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Caja unica del hotel: apertura con fondo inicial, cobros por metodo de pago y cierre con
          arqueo ciego.
        </p>
      </div>

      {mensaje && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
            mensaje.tipo === "ok"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {mensaje.tipo === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {cargando ? (
        <p className="p-6 text-center text-slate-400 text-xs">Cargando caja...</p>
      ) : !resumen ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-md space-y-3">
          <div className="text-center">
            <Wallet size={32} className="mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-sm">La caja esta cerrada</h3>
            <p className="text-slate-500 text-[11px] mt-1">
              Es una sola caja para todo el hotel: al abrirla, recepcion, cajero y administrador operan
              sobre el mismo turno. Registra el fondo inicial en efectivo.
            </p>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
              Fondo inicial (S/)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={fondoInicial}
              onChange={(e) => setFondoInicial(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <button
            onClick={abrirCaja}
            className="w-full bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold py-2.5 rounded-lg"
          >
            Abrir caja
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Fondo inicial</p>
                <p className="text-lg font-bold text-slate-900">
                  S/ {Number(resumen.turno.fondoInicialEfectivo ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Total cobrado</p>
                <p className="text-lg font-bold text-emerald-800">
                  S/ {Number(resumen.totalCobrado ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Transacciones</p>
                <p className="text-lg font-bold text-slate-900">
                  {resumen.cantidadTransacciones}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <span className="font-bold text-slate-700 text-xs">Cobros por metodo de pago</span>
              </div>
              {Object.keys(resumen.totalPorMetodo ?? {}).length === 0 ? (
                <p className="p-4 text-center text-slate-400 text-xs">
                  Aun no se han registrado cobros en este turno.
                </p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                      <th className="p-3">Metodo</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(resumen.totalPorMetodo).map(([metodo, total]) => (
                      <tr key={metodo} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{metodo}</td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          S/ {Number(total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <LockKeyhole size={13} className="text-slate-500" /> Arqueo y cierre de caja
              </h3>
              {resumen.cierreCiego && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                  Arqueo ciego: cuenta el efectivo fisico y decláralo. El monto esperado por el
                  sistema se revela recien al cerrar el turno.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                    Efectivo contado (S/)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={arqueo.efectivo}
                    onChange={(e) => setArqueo((a) => ({ ...a, efectivo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                    Observaciones
                  </label>
                  <input
                    type="text"
                    value={arqueo.observaciones}
                    onChange={(e) => setArqueo((a) => ({ ...a, observaciones: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>
              <button
                onClick={cerrarCaja}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Cerrar turno
              </button>
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <ClipboardList size={13} className="text-slate-500" /> Bitacora de relevo
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={nota.categoria}
                  onChange={(e) => setNota((n) => ({ ...n, categoria: e.target.value }))}
                  placeholder="Categoria"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <select
                  value={nota.prioridad}
                  onChange={(e) => setNota((n) => ({ ...n, prioridad: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={2}
                value={nota.mensaje}
                onChange={(e) => setNota((n) => ({ ...n, mensaje: e.target.value }))}
                placeholder="Novedad para el siguiente turno..."
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                onClick={agregarNota}
                className="w-full bg-[#1b4332] hover:bg-[#143427] text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> Agregar nota
              </button>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {bitacora.length === 0 ? (
                  <p className="text-center text-slate-400 text-[11px] py-2">
                    Sin novedades registradas.
                  </p>
                ) : (
                  bitacora.map((n) => (
                    <div
                      key={n.idBitacora}
                      className={`rounded-lg border p-2 ${
                        n.resuelto
                          ? "border-slate-200 bg-slate-50 opacity-60"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">
                          {n.categoria}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            n.prioridad === "ALTA"
                              ? "bg-red-100 text-red-700"
                              : n.prioridad === "BAJA"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {n.prioridad}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1">{n.mensaje}</p>
                      <button
                        onClick={() => alternarResuelto(n)}
                        className="text-[10px] text-emerald-700 font-semibold mt-1 hover:text-emerald-900"
                      >
                        {n.resuelto ? "Reabrir" : "Marcar resuelto"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center gap-1.5">
          <History size={13} className="text-slate-500" />
          <span className="font-bold text-slate-700 text-xs">Historial de cierres</span>
        </div>
        {historial.length === 0 ? (
          <p className="p-4 text-center text-slate-400 text-xs">Sin turnos registrados.</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historial.map((t) => {
                const dif = Number(t.diferenciaCuadre ?? 0);
                return (
                  <tr key={t.idTurnoCaja} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">#{t.idTurnoCaja}</td>
                    <td className="p-3 text-slate-600">
                      {t.empleado ? `${t.empleado.nombres} ${t.empleado.apellidos}` : "—"}
                    </td>
                    <td className="p-3 text-slate-600">
                      {t.empleadoCierre ? `${t.empleadoCierre.nombres} ${t.empleadoCierre.apellidos}` : "—"}
                    </td>
                    <td className="p-3 text-slate-400">
                      {t.fechaApertura ? t.fechaApertura.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td className="p-3 text-slate-400">
                      {t.fechaCierre ? t.fechaCierre.slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {t.efectivoSistemaEsperado != null
                        ? `S/ ${Number(t.efectivoSistemaEsperado).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {t.efectivoRealDeclarado != null
                        ? `S/ ${Number(t.efectivoRealDeclarado).toFixed(2)}`
                        : "—"}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        t.diferenciaCuadre == null
                          ? "text-slate-400"
                          : dif === 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {t.diferenciaCuadre != null ? `S/ ${dif.toFixed(2)}` : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          t.estado === "ABIERTO"
                            ? "bg-blue-100 text-blue-800"
                            : t.estado === "CERRADO"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {t.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
