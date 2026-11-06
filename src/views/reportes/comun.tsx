import type { ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Dato } from "../../api/reportes";
import { diaCorto } from "../../utils/fechas";
import { PALETA, decimal, entero, etiqueta, soles } from "./formatos";

// ---------- Piezas visuales ----------

export function Seccion({ titulo, subtitulo, accion, children, className = "" }: {
  titulo: string; subtitulo?: string; accion?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 shadow-sm break-inside-avoid ${className}`}>
      <div className="flex items-start justify-between gap-3 p-3 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-slate-800 text-xs">{titulo}</h2>
          {subtitulo && <p className="text-[10px] text-slate-400 mt-0.5">{subtitulo}</p>}
        </div>
        {accion}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

/** {@code contra} dice con que se compara: el periodo anterior en los reportes, ayer en el panel. */
export function Variacion({ pct, contra = "periodo anterior" }: { pct: number | null | undefined; contra?: string }) {
  if (pct === null || pct === undefined) {
    return <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Minus size={11} /> sin comparacion</span>;
  }
  if (pct === 0) {
    return <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><Minus size={11} /> igual que antes</span>;
  }
  const sube = pct > 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${sube ? "text-emerald-600" : "text-red-600"}`}>
      <Icono size={12} /> {sube ? "+" : ""}{decimal(pct)} % vs {contra}
    </span>
  );
}

const TONO: Record<string, string> = {
  verde: "text-emerald-700", ambar: "text-amber-700", rojo: "text-red-700", azul: "text-blue-700", gris: "text-slate-900",
};

export function Tarjeta({ titulo, valor, detalle, variacion, tono = "gris" }: {
  titulo: string; valor: string; detalle?: string; variacion?: number | null; tono?: keyof typeof TONO;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 break-inside-avoid">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{titulo}</p>
      <p className={`text-xl font-bold mt-1 leading-tight ${TONO[tono]}`}>{valor}</p>
      {variacion !== undefined && <div className="mt-1"><Variacion pct={variacion} /></div>}
      {detalle && <p className="text-[10px] text-slate-400 mt-1">{detalle}</p>}
    </div>
  );
}

export function Vacio({ texto = "Sin datos en este periodo." }: { texto?: string }) {
  return <p className="text-center text-slate-400 text-[11px] py-8">{texto}</p>;
}

export function Tabla({ columnas, filas, vacio, derecha = [] }: {
  columnas: string[]; filas: ReactNode[][]; vacio?: string; derecha?: number[];
}) {
  if (filas.length === 0) return <Vacio texto={vacio} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
            {columnas.map((c, i) => <th key={c} className={`py-2 px-2 ${derecha.includes(i) ? "text-right" : ""}`}>{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.map((fila, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {fila.map((celda, j) => <td key={j} className={`py-2 px-2 ${derecha.includes(j) ? "text-right" : ""} ${j === 0 ? "font-semibold text-slate-800" : "text-slate-600"}`}>{celda}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Barra({ pct, color = "#10b981" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

/** Desglose clave/monto en tabla con barra de proporcion. */
export function Desglose({ datos, usar = "monto", formato = soles, vacio }: {
  datos: Dato[]; usar?: "monto" | "cantidad"; formato?: (v: number) => string; vacio?: string;
}) {
  const total = datos.reduce((s, d) => s + Number(d[usar]), 0);
  return (
    <Tabla
      columnas={["", usar === "monto" ? "Monto" : "Cantidad", "%"]}
      derecha={[1, 2]}
      vacio={vacio}
      filas={datos.map((d, i) => [
        <span key="n" className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETA[i % PALETA.length] }} />{etiqueta(d.clave)}</span>,
        formato(Number(d[usar])),
        <span key="p" className="flex items-center gap-2 justify-end"><span className="w-16"><Barra pct={total ? (Number(d[usar]) * 100) / total : 0} color={PALETA[i % PALETA.length]} /></span>{decimal(total ? (Number(d[usar]) * 100) / total : 0, 0)} %</span>,
      ])}
    />
  );
}

type Formato = (v: number) => string;
const EJE = { fontSize: 10 };

export function GraficoTorta({ datos, formato = soles, alto = 210 }: { datos: { nombre: string; valor: number }[]; formato?: Formato; alto?: number }) {
  const con = datos.filter((d) => d.valor > 0);
  if (con.length === 0) return <Vacio />;
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <PieChart>
        <Pie isAnimationActive={false} data={con} dataKey="valor" nameKey="nombre" cx="50%" cy="50%" outerRadius={alto / 2 - 35} innerRadius={alto / 2 - 70}>
          {con.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => formato(Number(v))} />
        <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface SerieGrafico {
  clave: string;
  nombre: string;
  color: string;
  /** barras apiladas comparten este grupo; una linea se dibuja encima */
  tipo?: "barra" | "linea";
  apilar?: boolean;
}

/** Barras y/o lineas sobre una misma serie de fechas o nombres. */
export function GraficoSerie({ datos, series, formato = soles, alto = 230, esFecha = true, formatoEje }: {
  datos: Record<string, string | number>[]; series: SerieGrafico[]; formato?: Formato; alto?: number; esFecha?: boolean; formatoEje?: Formato;
}) {
  if (datos.length === 0) return <Vacio />;
  const etiquetaX = (v: unknown) => (esFecha ? diaCorto(String(v)) : String(v));
  const hayBarras = series.some((s) => (s.tipo ?? "barra") === "barra");
  const Contenedor = hayBarras ? ComposedChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <Contenedor data={datos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="x" tick={EJE} tickFormatter={etiquetaX} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={EJE} tickFormatter={(v) => (formatoEje ?? formato)(Number(v)).replace("S/ ", "")} width={52} />
        <Tooltip labelFormatter={etiquetaX} formatter={(v, nombre) => [formato(Number(v)), nombre]} />
        {series.length > 1 && <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />}
        {series.map((s) =>
          (s.tipo ?? "barra") === "barra" ? (
            <Bar isAnimationActive={false} key={s.clave} dataKey={s.clave} name={s.nombre} fill={s.color} stackId={s.apilar ? "a" : undefined} radius={s.apilar ? 0 : [3, 3, 0, 0]} />
          ) : (
            <Line isAnimationActive={false} key={s.clave} type="monotone" dataKey={s.clave} name={s.nombre} stroke={s.color} strokeWidth={2} dot={datos.length <= 31 ? { r: 2 } : false} />
          )
        )}
      </Contenedor>
    </ResponsiveContainer>
  );
}

export function GraficoBarrasHorizontales({ datos, formato = entero, alto }: { datos: { nombre: string; valor: number }[]; formato?: Formato; alto?: number }) {
  if (datos.length === 0) return <Vacio />;
  return (
    <ResponsiveContainer width="100%" height={alto ?? Math.max(120, datos.length * 34)}>
      <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={EJE} tickFormatter={(v) => formato(Number(v))} />
        <YAxis type="category" dataKey="nombre" tick={EJE} width={110} />
        <Tooltip formatter={(v) => formato(Number(v))} />
        <Bar isAnimationActive={false} dataKey="valor" radius={[0, 3, 3, 0]}>
          {datos.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Cuadricula de tarjetas que reparte el ancho segun cuantas hay. */
export function Cuadricula({ columnas = 4, children }: { columnas?: 2 | 3 | 4 | 5; children: ReactNode }) {
  const clase = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" }[columnas];
  return <div className={`grid gap-3 ${clase}`}>{children}</div>;
}

// ---------- Estado de carga y barra de acciones ----------

// ---------- Esqueletos de carga ----------

/** Rectangulo gris que respira donde luego va un dato. */
export function Bloque({ className = "", alto }: { className?: string; alto?: number }) {
  return <div className={`bg-slate-200/80 rounded animate-pulse ${className}`} style={alto ? { height: alto } : undefined} />;
}

/** Tarjeta con su titulo real y solo el valor cargando: asi la pantalla ya "tiene forma" desde el primer instante. */
export function TarjetaEsqueleto({ titulo }: { titulo: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{titulo}</p>
      <Bloque className="h-6 w-28 mt-2" />
      <Bloque className="h-2.5 w-36 mt-2.5" />
    </div>
  );
}

export interface EsqueletoReporte {
  tarjetas: string[];
  columnas?: 2 | 3 | 4 | 5;
  secciones: { titulo: string; alto?: number; completa?: boolean }[];
}

function Esqueleto({ tarjetas, columnas = 4, secciones }: EsqueletoReporte) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando reporte">
      <Bloque className="h-2.5 w-80" />
      {tarjetas.length > 0 && (
        <Cuadricula columnas={columnas}>
          {tarjetas.map((t) => <TarjetaEsqueleto key={t} titulo={t} />)}
        </Cuadricula>
      )}
      <div className="grid grid-cols-2 gap-4">
        {secciones.map((s) => (
          <Seccion key={s.titulo} titulo={s.titulo} className={s.completa ? "col-span-2" : ""}>
            <Bloque className="w-full" alto={s.alto ?? 160} />
          </Seccion>
        ))}
      </div>
    </div>
  );
}

/**
 * Dibuja el reporte cuando llega. Mientras tanto muestra el diseno con cada tarjeta y seccion cargando, y si ya
 * habia datos (de la memoria o del rango anterior) los deja atenuados en vez de reemplazarlos por un vacio.
 */
export function Estado<T>({ r, esqueleto, children }: {
  r: { datos: T | null; error: string | null; cargando: boolean };
  esqueleto: EsqueletoReporte;
  children: (datos: T) => ReactNode;
}) {
  if (r.error) {
    return <div className="p-3 rounded-lg border bg-red-50 border-red-300 text-red-800 text-xs">{r.error}</div>;
  }
  if (!r.datos) {
    return <Esqueleto {...esqueleto} />;
  }
  return <div className={`space-y-4 transition-opacity ${r.cargando ? "opacity-60" : ""}`}>{children(r.datos)}</div>;
}

/** Hora de generacion y exportacion del reporte que se esta viendo. */
export function BarraAcciones({ generadoEn, onCsv, nota }: { generadoEn: string; onCsv?: () => void; nota?: string }) {
  return (
    <div className="flex items-center justify-between text-[10px] text-slate-400">
      <span>
        Datos de las {generadoEn.slice(11, 16)}{nota ? ` · ${nota}` : ""}. Se guardan unos segundos en memoria; usa Actualizar para recalcular.
      </span>
      {onCsv && (
        <button onClick={onCsv} className="text-emerald-700 font-semibold hover:underline no-imprimir">
          Exportar CSV
        </button>
      )}
    </div>
  );
}
