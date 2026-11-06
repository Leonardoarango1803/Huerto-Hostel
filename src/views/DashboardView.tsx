import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Info, RefreshCw, ShieldAlert } from "lucide-react";
import { panelApi, type Aviso, type Grafico, type Kpi, type Lista, type Panel } from "../api/reportes";
import { mensajeDeError } from "../api/errores";
import { useAuth } from "../context/AuthContext";
import { haceCuanto } from "../utils/fechas";
import { Bloque, GraficoBarrasHorizontales, GraficoSerie, GraficoTorta, Seccion, Tabla, TarjetaEsqueleto, Variacion } from "./reportes/comun";
import { COLOR_ESTADO_HAB, decimal, entero, etiqueta, minutos, porcentaje, soles } from "./reportes/formatos";

/** Cada cuanto se vuelve a pedir el panel. El servidor lo guarda 20 s, asi que varios usuarios comparten la consulta. */
const REFRESCO_MS = 30_000;

const BORDE: Record<Kpi["tono"], string> = {
  verde: "border-l-emerald-500", ambar: "border-l-amber-500", rojo: "border-l-red-500", azul: "border-l-blue-500", gris: "border-l-slate-300",
};
const COLOR_TEXTO: Record<Kpi["tono"], string> = {
  verde: "text-emerald-700", ambar: "text-amber-700", rojo: "text-red-700", azul: "text-blue-700", gris: "text-slate-900",
};

function valorDe(k: Kpi): string {
  switch (k.formato) {
    case "soles": return soles(k.valor);
    case "porcentaje": return porcentaje(k.valor);
    case "minutos": return minutos(k.valor);
    case "texto": return k.texto ?? "—";
    default: return entero(k.valor);
  }
}

function formatoDe(g: Grafico) {
  return g.formato === "soles" ? soles : g.formato === "porcentaje" ? porcentaje : entero;
}

function TarjetaKpi({ kpi, ir }: { kpi: Kpi; ir: (ruta: string) => void }) {
  const contenido = (
    <>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.titulo}</p>
      <p className={`text-2xl font-bold mt-1 leading-tight ${COLOR_TEXTO[kpi.tono]}`}>{valorDe(kpi)}</p>
      {kpi.variacionPct !== null && <div className="mt-1"><Variacion pct={kpi.variacionPct} contra="ayer" /></div>}
      {kpi.detalle && <p className="text-[10px] text-slate-400 mt-1">{kpi.detalle}</p>}
    </>
  );
  const clase = `bg-white p-4 rounded-xl border border-slate-200/80 border-l-4 ${BORDE[kpi.tono]} shadow-sm text-left`;
  return kpi.ruta ? (
    <button onClick={() => ir(kpi.ruta as string)} className={`${clase} hover:shadow-md transition-shadow`}>{contenido}</button>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

const AVISO_ESTILO: Record<Aviso["tipo"], { caja: string; icono: typeof Info }> = {
  alerta: { caja: "bg-red-50 border-red-200 text-red-900", icono: ShieldAlert },
  aviso: { caja: "bg-amber-50 border-amber-200 text-amber-900", icono: AlertTriangle },
  ok: { caja: "bg-emerald-50 border-emerald-200 text-emerald-900", icono: CheckCircle2 },
};

function FilaAviso({ aviso, ir }: { aviso: Aviso; ir: (ruta: string) => void }) {
  const { caja, icono: Icono } = AVISO_ESTILO[aviso.tipo];
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-[11px] ${caja}`}>
      <Icono size={14} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{aviso.titulo}</p>
        {aviso.detalle && <p className="text-[10px] opacity-80 mt-0.5">{aviso.detalle}</p>}
      </div>
      {aviso.ruta && (
        <button onClick={() => ir(aviso.ruta as string)} className="text-[10px] font-semibold underline shrink-0">Ir</button>
      )}
    </div>
  );
}

function GraficoDelPanel({ g }: { g: Grafico }) {
  const formato = formatoDe(g);
  return (
    <Seccion titulo={g.titulo}>
      {g.tipo === "torta" ? (
        <GraficoTorta datos={g.puntos.map((p) => ({ nombre: etiqueta(p.nombre), valor: p.valor }))} formato={formato} />
      ) : g.tipo === "lineas" ? (
        <GraficoSerie esFecha={false} datos={g.puntos.map((p) => ({ x: p.nombre, valor: p.valor }))}
          series={[{ clave: "valor", nombre: g.titulo, color: "#3b82f6", tipo: "linea" }]}
          formato={formato} formatoEje={g.formato === "porcentaje" ? (v) => `${decimal(v, 0)}%` : formato} />
      ) : g.puntos.length > 0 && g.puntos.every((p) => p.nombre.length > 8) ? (
        <GraficoBarrasHorizontales datos={g.puntos.map((p) => ({ nombre: etiqueta(p.nombre), valor: p.valor }))} formato={formato} />
      ) : (
        <GraficoSerie esFecha={false} datos={g.puntos.map((p) => ({ x: etiqueta(p.nombre), valor: p.valor }))}
          series={[{ clave: "valor", nombre: g.titulo, color: "#1b4332" }]} formato={formato} />
      )}
    </Seccion>
  );
}

function ListaDelPanel({ lista, ir }: { lista: Lista; ir: (ruta: string) => void }) {
  return (
    <Seccion titulo={lista.titulo}
      accion={lista.ruta ? <button onClick={() => ir(lista.ruta as string)} className="text-[10px] text-emerald-700 font-semibold hover:underline">Ver todo</button> : undefined}>
      <Tabla columnas={lista.columnas} filas={lista.filas} vacio={lista.vacio} />
    </Seccion>
  );
}

/**
 * Forma de cada panel antes de que llegue el dato: titulos reales de cada tarjeta, grafico y lista, y solo el contenido
 * cargando. Es solo presentacion (si el servidor cambia un titulo, el panel real lo reemplaza al llegar).
 */
const ESQUELETOS: Record<string, { titulo: string; subtitulo: string; kpis: string[]; habitaciones: boolean; graficos: string[]; listas: string[] }> = {
  ADMINISTRADOR: {
    titulo: "Panel gerencial", subtitulo: "Resumen en vivo de la operacion del hostel.",
    kpis: ["Ocupacion hoy", "Cobrado hoy", "Por cobrar", "Llegadas pendientes", "Salidas por procesar", "Caja"], habitaciones: true,
    graficos: ["Ocupacion de los ultimos 14 dias (%)", "Cobrado en los ultimos 14 dias (S/)", "Facturado por area este mes (S/)", "Cobrado hoy por metodo (S/)"],
    listas: ["Llegadas de hoy", "Salidas por procesar", "Reservas sin adelanto", "Ultimos cierres de caja", "Mas vendidos hoy", "De turno ahora"],
  },
  RECEPCIONISTA: {
    titulo: "Panel de recepcion", subtitulo: "Llegadas, salidas y lo que necesita atencion ahora.",
    kpis: ["Ocupacion hoy", "Habitaciones libres", "Llegadas pendientes", "Salidas por procesar", "Caja"], habitaciones: true,
    graficos: ["Ocupacion de los ultimos 7 dias (%)"], listas: ["Llegadas de hoy", "Salidas por procesar", "Reservas sin adelanto", "De turno ahora"],
  },
  CAJERO: {
    titulo: "Panel de caja", subtitulo: "Cobros del dia y estado del turno.",
    kpis: ["Caja", "Efectivo esperado", "Cobrado hoy", "Por cobrar"], habitaciones: true,
    graficos: ["Cobrado hoy por metodo (S/)"], listas: ["Salidas por procesar", "Ultimos cierres de caja"],
  },
  COCINA: {
    titulo: "Panel de cocina", subtitulo: "Comandas por atender y stock de tu area.",
    kpis: ["Comandas activas", "Pendientes", "En preparacion", "Demoradas", "Entregadas hoy", "Tiempo de preparacion"], habitaciones: false,
    graficos: ["Comandas activas por estado"], listas: ["Comandas por atender", "Insumos por reponer", "Mas vendidos hoy"],
  },
  BAR: {
    titulo: "Panel de bar", subtitulo: "Comandas por atender y stock de tu area.",
    kpis: ["Comandas activas", "Pendientes", "En preparacion", "Demoradas", "Entregadas hoy", "Tiempo de preparacion"], habitaciones: false,
    graficos: ["Comandas activas por estado"], listas: ["Comandas por atender", "Insumos por reponer", "Mas vendidos hoy"],
  },
  HOUSEKEEPING: {
    titulo: "Panel de limpieza", subtitulo: "Habitaciones por preparar y pedidos pendientes.",
    kpis: ["Por limpiar", "Tareas pendientes", "En proceso", "Completadas hoy", "Incidencias abiertas", "Solicitudes pendientes"], habitaciones: true,
    graficos: ["Tareas abiertas por estado"],
    listas: ["Tareas de limpieza abiertas", "Incidencias abiertas", "Solicitudes del huesped", "Insumos de limpieza por reponer"],
  },
};

function columnasDeKpis(n: number): string {
  return n <= 4 ? "grid-cols-4" : n === 5 ? "grid-cols-5" : "grid-cols-6";
}

function columnasDeGraficos(n: number): string {
  return n === 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4";
}

function PanelEsqueleto({ e }: { e: (typeof ESQUELETOS)[string] }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando panel">
      <div className={`grid gap-4 ${columnasDeKpis(e.kpis.length)}`}>
        {e.kpis.map((t) => <TarjetaEsqueleto key={t} titulo={t} />)}
      </div>
      <Seccion titulo="Que necesita atencion ahora">
        <div className="grid grid-cols-2 gap-2">
          <Bloque className="h-12" /><Bloque className="h-12" />
        </div>
      </Seccion>
      {e.habitaciones && (
        <Seccion titulo="Estado de las habitaciones">
          <Bloque className="h-3 rounded-full w-full mb-3" />
          <div className="flex gap-6"><Bloque className="h-3 w-24" /><Bloque className="h-3 w-24" /><Bloque className="h-3 w-24" /></div>
        </Seccion>
      )}
      <div className={`grid gap-4 ${columnasDeGraficos(e.graficos.length)}`}>
        {e.graficos.map((t) => <Seccion key={t} titulo={t}><Bloque className="w-full" alto={190} /></Seccion>)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {e.listas.map((t) => (
          <Seccion key={t} titulo={t}>
            <div className="space-y-2.5"><Bloque className="h-3 w-full" /><Bloque className="h-3 w-5/6" /><Bloque className="h-3 w-2/3" /></div>
          </Seccion>
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Si ya se vio el panel de este rol se pinta al instante con lo ultimo recibido y se actualiza por detras.
  const [panel, setPanel] = useState<Panel | null>(() => panelApi.enMemoria(user?.role));
  const [error, setError] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const traer = useCallback((refrescar: boolean) => {
    return panelApi
      .obtener(refrescar)
      .then((p) => {
        setPanel(p);
        setError(null);
      })
      .catch((e) => setError(mensajeDeError(e, "No se pudo cargar el panel.")));
  }, []);

  // Carga inicial y refresco automatico (se pausa con la pestana oculta para no gastar conexiones de balde).
  useEffect(() => {
    let vigente = true;
    traer(false);
    const refresco = window.setInterval(() => {
      if (vigente && !document.hidden) traer(false);
    }, REFRESCO_MS);
    const reloj = window.setInterval(() => setAhora(Date.now()), 10_000);
    const alVolver = () => {
      if (!document.hidden) traer(false);
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vigente = false;
      window.clearInterval(refresco);
      window.clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [traer]);

  const actualizar = () => {
    setActualizando(true);
    traer(true).finally(() => setActualizando(false));
  };

  const ir = (ruta: string) => navigate(ruta);
  const totalHab = panel?.habitaciones.reduce((s, h) => s + h.cantidad, 0) ?? 0;
  const columnasKpi = columnasDeKpis(panel?.kpis.length ?? 6);
  const esqueleto = ESQUELETOS[user?.role ?? ""] ?? ESQUELETOS.ADMINISTRADOR;

  return (
    <div className="space-y-5 font-sans text-slate-800 text-xs">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{panel?.titulo ?? esqueleto.titulo}</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Hola, {user?.username}. {panel?.subtitulo ?? esqueleto.subtitulo}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {panel ? `En vivo · actualizado ${haceCuanto(panel.generadoEn, ahora)}` : "Cargando datos..."}
          </span>
          <button onClick={actualizar} disabled={actualizando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={12} className={actualizando ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg border bg-red-50 border-red-300 text-red-800">{error}</div>}

      {!panel ? (
        !error && <PanelEsqueleto e={esqueleto} />
      ) : (
        <>
          <div className={`grid gap-4 ${columnasKpi}`}>
            {panel.kpis.map((k) => <TarjetaKpi key={k.id} kpi={k} ir={ir} />)}
          </div>

          <Seccion titulo="Que necesita atencion ahora">
            <div className="grid grid-cols-2 gap-2">
              {panel.avisos.map((a, i) => <FilaAviso key={i} aviso={a} ir={ir} />)}
            </div>
          </Seccion>

          {totalHab > 0 && (
            <Seccion titulo="Estado de las habitaciones" accion={<button onClick={() => ir("/habitaciones")} className="text-[10px] text-emerald-700 font-semibold hover:underline">Ir al mapa</button>}>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
                {panel.habitaciones.map((h) => (
                  <div key={h.clave} title={`${etiqueta(h.clave)}: ${h.cantidad}`} style={{ width: `${(h.cantidad * 100) / totalHab}%`, background: COLOR_ESTADO_HAB[h.clave] ?? "#64748b" }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {panel.habitaciones.map((h) => (
                  <div key={h.clave} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_ESTADO_HAB[h.clave] ?? "#64748b" }} />
                    <span className="text-slate-500">{etiqueta(h.clave)}</span>
                    <strong className="text-slate-900">{h.cantidad}</strong>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {panel.graficos.length > 0 && (
            <div className={`grid gap-4 ${columnasDeGraficos(panel.graficos.length)}`}>
              {panel.graficos.map((g) => <GraficoDelPanel key={g.id} g={g} />)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {panel.listas.map((l) => <ListaDelPanel key={l.id} lista={l} ir={ir} />)}
          </div>
        </>
      )}
    </div>
  );
}
