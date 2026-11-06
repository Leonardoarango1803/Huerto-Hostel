import { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { cajaApi } from "../api/caja";
import { useCaja } from "../context/CajaContext";
import { useAuth } from "../context/AuthContext";
import { mensajeDeError } from "../api/errores";
import type { BitacoraTurno, InfoApertura, ResumenTurno, TurnoCaja } from "../api/types";
import { AperturaCard } from "./caja/AperturaCard";
import { ArqueoRapido } from "./caja/ArqueoRapido";
import { Bitacora } from "./caja/Bitacora";
import { CierreForzado } from "./caja/CierreForzado";
import { CierreGuiado } from "./caja/CierreGuiado";
import { HistorialTurnos } from "./caja/HistorialTurnos";
import { Movimientos } from "./caja/Movimientos";
import { PanelNotas } from "./caja/PanelNotas";
import { dinero } from "./caja/comun";

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

/**
 * Caja unica del hotel. Se abre RECIBIENDO la caja del turno anterior (el efectivo contado debe coincidir con lo que
 * dejo), y se cierra con un cierre guiado: el sistema verifica el conteo antes de cerrar y, si hay que cerrar con
 * diferencia, deja una nota pendiente que solo el administrador puede resolver.
 */
export function CajaView() {
  const { refrescar: refrescarCaja, estado: estadoCaja } = useCaja();
  const { user } = useAuth();
  const esAdmin = user?.role === "ADMINISTRADOR";

  const [resumen, setResumen] = useState<ResumenTurno | null>(null);
  const [bitacora, setBitacora] = useState<BitacoraTurno[]>([]);
  const [historial, setHistorial] = useState<TurnoCaja[]>([]);
  /** Notas sin resolver de TODOS los turnos (los pendientes que hereda quien abre la caja). */
  const [pendientes, setPendientes] = useState<BitacoraTurno[]>([]);
  const [infoApertura, setInfoApertura] = useState<InfoApertura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  /** Trae todo lo de la pantalla sin tocar el estado: asi el efecto inicial y los botones comparten la misma carga. */
  const traer = useCallback(async () => {
    const [data, pend] = await Promise.all([
      cajaApi.turnoActual(),
      cajaApi.pendientesRelevo().catch(() => [] as BitacoraTurno[]),
    ]);
    if (data) {
      // El resumen con movimientos y notas del turno abierto, y su bitacora
      const completo = await cajaApi.resumen(data.turno.idTurnoCaja).catch(() => data);
      const notas = completo.notas ?? (await cajaApi.listarBitacora(data.turno.idTurnoCaja));
      return { pend, resumen: completo, notas, info: null as InfoApertura | null };
    }
    return { pend, resumen: null as ResumenTurno | null, notas: [] as BitacoraTurno[], info: await cajaApi.infoApertura().catch(() => null) };
  }, []);

  const aplicar = useCallback((d: Awaited<ReturnType<typeof traer>>) => {
    setPendientes(d.pend);
    setResumen(d.resumen);
    setBitacora(d.notas);
    setInfoApertura(d.info);
  }, []);

  const cargar = useCallback(async () => {
    try {
      aplicar(await traer());
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo cargar el estado de la caja.") });
    } finally {
      setCargando(false);
    }
  }, [traer, aplicar]);

  useEffect(() => {
    let vigente = true;
    traer()
      .then((d) => vigente && aplicar(d))
      .catch((err) => vigente && setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo cargar el estado de la caja.") }))
      .finally(() => vigente && setCargando(false));
    cajaApi.historial().then((h) => vigente && setHistorial(h)).catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [traer, aplicar]);

  const cargarHistorial = useCallback(() => {
    cajaApi.historial().then(setHistorial).catch(() => undefined);
  }, []);

  const abrirCaja = async (fondo: number, motivo?: string) => {
    setMensaje(null);
    setAbriendo(true);
    try {
      const turno = await cajaApi.abrir(fondo, motivo);
      const dif = Number(turno.diferenciaApertura ?? 0);
      setMensaje({
        tipo: "ok",
        texto:
          "Caja abierta. Recepcion, cajero y administrador operan sobre este mismo turno." +
          (dif !== 0 ? ` Quedo una nota pendiente: se recibio con ${dif < 0 ? "faltante" : "sobrante"} de ${dinero(Math.abs(dif))}.` : ""),
      });
      await cargar();
      cargarHistorial();
      refrescarCaja();
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo abrir la caja.") });
      await cargar(); // si otra persona la abrio primero, mostrar su turno
      refrescarCaja();
    } finally {
      setAbriendo(false);
    }
  };

  const alCerrar = async (turno: TurnoCaja, quedanPendientes: number, notaGuardada: boolean) => {
    const dif = Number(turno.diferenciaCuadre ?? 0);
    setMensaje({
      tipo: dif === 0 ? "ok" : "error",
      texto:
        (dif === 0
          ? "Caja cerrada y cuadrada correctamente."
          : `Caja cerrada con ${dif < 0 ? "faltante" : "sobrante"} de ${dinero(Math.abs(dif))} (esperado ${dinero(turno.efectivoSistemaEsperado)}). Quedo una nota pendiente de prioridad alta para el administrador.`) +
        (quedanPendientes > 0 ? ` Quedan ${quedanPendientes} nota(s) pendiente(s) para el siguiente turno.` : "") +
        (notaGuardada ? "" : " La nota para el siguiente turno no se pudo guardar: escribela de nuevo en la bitacora."),
    });
    await cargar();
    cargarHistorial();
    refrescarCaja();
  };

  const alForzar = async (turno: TurnoCaja) => {
    const dif = Number(turno.diferenciaCuadre ?? 0);
    setMensaje({
      tipo: dif === 0 ? "ok" : "error",
      texto:
        "Caja cerrada por el administrador (cierre forzado)." +
        (dif === 0 ? " El efectivo cuadra." : ` Quedo ${dif < 0 ? "faltante" : "sobrante"} de ${dinero(Math.abs(dif))} como nota pendiente.`) +
        " El siguiente turno vera un aviso del cierre forzado.",
    });
    await cargar();
    cargarHistorial();
    refrescarCaja();
  };

  const agregarNota = async (nota: { categoria: string; mensaje: string; prioridad: string }): Promise<boolean> => {
    if (!resumen || !nota.mensaje.trim()) {
      setMensaje({ tipo: "error", texto: "Escribe el mensaje de la bitacora." });
      return false;
    }
    try {
      await cajaApi.registrarNota(resumen.turno.idTurnoCaja, nota);
      await cargar();
      return true;
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo registrar la nota.") });
      return false;
    }
  };

  const resolver = async (n: BitacoraTurno, comentario?: string) => {
    try {
      await cajaApi.marcarResuelto(n.idBitacora, !n.resuelto, comentario);
      await cargar();
      cargarHistorial();
    } catch (err) {
      setMensaje({ tipo: "error", texto: mensajeDeError(err, "No se pudo actualizar la nota.") });
      throw err;
    }
  };

  const alternarDeLaBitacora = (n: BitacoraTurno) => {
    resolver(n).catch(() => undefined);
  };

  const sinResolverDelTurno = bitacora.filter((n) => !n.resuelto).length;

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-semibold">Recepcion › Caja</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Turno de Caja y Arqueo</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Caja unica del hotel: se recibe contando el efectivo, se cobra por metodo de pago y se cierra con arqueo guiado.
        </p>
      </div>

      {mensaje && (
        <div
          role="status"
          className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
            mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {mensaje.tipo === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{mensaje.texto}</span>
          <button onClick={() => setMensaje(null)} className="text-[10px] font-semibold opacity-70 hover:opacity-100">Cerrar</button>
        </div>
      )}

      {!cargando && (
        <PanelNotas pendientes={pendientes} turnoActualId={resumen?.turno.idTurnoCaja} esAdmin={esAdmin} onResolver={resolver} />
      )}

      {cargando ? (
        <p className="p-6 text-center text-slate-400 text-xs">Cargando caja...</p>
      ) : !resumen ? (
        <AperturaCard info={infoApertura} abriendo={abriendo} onAbrir={abrirCaja} />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Fondo inicial</p>
                <p className="text-lg font-bold text-slate-900">{dinero(resumen.turno.fondoInicialEfectivo)}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Total cobrado</p>
                <p className="text-lg font-bold text-emerald-800">{dinero(resumen.totalCobrado)}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Transacciones</p>
                <p className="text-lg font-bold text-slate-900">{resumen.cantidadTransacciones}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <span className="font-bold text-slate-700 text-xs">Cobros por metodo de pago</span>
              </div>
              {Object.keys(resumen.totalPorMetodo ?? {}).length === 0 ? (
                <p className="p-4 text-center text-slate-400 text-xs">Aun no se han registrado cobros en este turno.</p>
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
                        <td className="p-3 text-right font-bold text-slate-900">{dinero(total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Movimientos
              movimientos={resumen.movimientos ?? []}
              total={Number(resumen.totalMovimientos ?? 0)}
              onCambio={cargar}
              onError={(texto) => setMensaje({ tipo: "error", texto })}
            />

            <ArqueoRapido
              key={`arqueo-${resumen.turno.idTurnoCaja}`}
              arqueos={resumen.arqueos ?? []}
              maximo={resumen.maximoArqueos ?? 5}
              onCambio={cargar}
              onError={(texto) => setMensaje({ tipo: "error", texto })}
            />

            {esAdmin && estadoCaja?.excedeLimite && estadoCaja.idTurnoCaja === resumen.turno.idTurnoCaja && (
              <CierreForzado
                idTurno={resumen.turno.idTurnoCaja}
                horasAbierta={estadoCaja.horasAbierta ?? 0}
                limiteHoras={estadoCaja.limiteHoras ?? 16}
                abrio={`${resumen.turno.empleado?.nombres ?? ""} ${resumen.turno.empleado?.apellidos ?? ""}`.trim() || "otra persona"}
                onCerrado={alForzar}
                onError={(texto) => setMensaje({ tipo: "error", texto })}
              />
            )}

            <CierreGuiado
              key={resumen.turno.idTurnoCaja}
              resumen={resumen}
              notasSinResolver={sinResolverDelTurno}
              onCerrado={alCerrar}
              onError={(texto) => setMensaje({ tipo: "error", texto })}
            />
          </div>

          <div className="col-span-4 space-y-4">
            <Bitacora notas={bitacora} onAgregar={agregarNota} onAlternar={alternarDeLaBitacora} />
          </div>
        </div>
      )}

      <HistorialTurnos historial={historial} esAdmin={esAdmin} onCambio={cargarHistorial} />
    </div>
  );
}
