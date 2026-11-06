import { useState } from "react";
import { BarChart3, BedDouble, Boxes, CalendarCheck, Printer, RefreshCw, Receipt, ShoppingBag, Wallet, Wrench } from "lucide-react";
import { limpiarMemoriaDeReportes, type Periodo } from "../api/reportes";
import { diaLargo, finDeMes, hoyISO, inicioDeAnio, inicioDeMes, sumarDias } from "../utils/fechas";
import { ReportesTab as ReporteInventario } from "./inventario/ReportesTab";
import { CajaTab } from "./reportes/CajaTab";
import { ConsumosTab } from "./reportes/ConsumosTab";
import { IngresosTab } from "./reportes/IngresosTab";
import { OcupacionTab } from "./reportes/OcupacionTab";
import { OperacionTab } from "./reportes/OperacionTab";
import { ReservasTab } from "./reportes/ReservasTab";
import { ResumenTab } from "./reportes/ResumenTab";

type Pestana = "resumen" | "ingresos" | "ocupacion" | "reservas" | "consumos" | "caja" | "operacion" | "inventario";

const PESTANAS: { id: Pestana; label: string; icono: typeof BarChart3 }[] = [
  { id: "resumen", label: "Resumen", icono: BarChart3 },
  { id: "ingresos", label: "Ingresos", icono: Receipt },
  { id: "ocupacion", label: "Ocupacion", icono: BedDouble },
  { id: "reservas", label: "Reservas y huespedes", icono: CalendarCheck },
  { id: "consumos", label: "Consumos y margen", icono: ShoppingBag },
  { id: "caja", label: "Caja", icono: Wallet },
  { id: "operacion", label: "Operacion", icono: Wrench },
  { id: "inventario", label: "Inventario", icono: Boxes },
];

type Preset = "hoy" | "7" | "30" | "mes" | "mesAnterior" | "anio" | "otro";

function rangoDe(preset: Exclude<Preset, "otro">): Periodo {
  const hoy = hoyISO();
  switch (preset) {
    case "hoy": return { desde: hoy, hasta: hoy };
    case "7": return { desde: sumarDias(hoy, -6), hasta: hoy };
    case "30": return { desde: sumarDias(hoy, -29), hasta: hoy };
    case "mes": return { desde: inicioDeMes(hoy), hasta: hoy };
    case "mesAnterior": return { desde: inicioDeMes(hoy, -1), hasta: finDeMes(hoy, -1) };
    case "anio": return { desde: inicioDeAnio(hoy), hasta: hoy };
  }
}

const PRESETS: { id: Exclude<Preset, "otro">; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "mes", label: "Este mes" },
  { id: "mesAnterior", label: "Mes anterior" },
  { id: "anio", label: "Este año" },
];

export function ReportesView() {
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [preset, setPreset] = useState<Preset>("30");
  const [periodo, setPeriodo] = useState<Periodo>(() => rangoDe("30"));
  /** Sube con cada "Actualizar": las pestanas vuelven a pedir y el servidor recalcula una vez. */
  const [version, setVersion] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  const elegir = (p: Exclude<Preset, "otro">) => {
    setPreset(p);
    setPeriodo(rangoDe(p));
    setAviso(null);
  };

  const cambiarFecha = (campo: keyof Periodo, valor: string) => {
    if (!valor) return;
    const siguiente = { ...periodo, [campo]: valor };
    if (siguiente.desde > siguiente.hasta) {
      setAviso("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    const dias = (new Date(siguiente.hasta).getTime() - new Date(siguiente.desde).getTime()) / 86400000 + 1;
    if (dias > 366) {
      setAviso("El rango no puede pasar de un año.");
      return;
    }
    setAviso(null);
    setPreset("otro");
    setPeriodo(siguiente);
  };

  const actualizar = () => {
    limpiarMemoriaDeReportes();
    setVersion((v) => v + 1);
  };

  const props = { periodo, version };

  return (
    <div className="space-y-4 font-sans text-slate-800 text-xs bg-[#f5f6f8] -m-8 p-6 min-h-screen">
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Administracion › Reportes</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Reportes y estadisticas</h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            {diaLargo(periodo.desde)} — {diaLargo(periodo.hasta)}. Cada cifra se compara con el periodo anterior de la misma duracion.
          </p>
        </div>
        <div className="flex items-center gap-2 no-imprimir">
          <button onClick={actualizar} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50">
            <RefreshCw size={12} /> Actualizar
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b4332] text-white font-semibold hover:bg-[#143427]">
            <Printer size={12} /> Imprimir o guardar PDF
          </button>
        </div>
      </div>

      {pestana !== "inventario" && (
        <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 no-imprimir">
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => elegir(p.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  preset === p.id ? "bg-[#1b4332] text-white border-[#1b4332]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-500">Desde</span>
            <input type="date" value={periodo.desde} max={periodo.hasta} onChange={(e) => cambiarFecha("desde", e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1 text-xs" aria-label="Fecha inicial" />
            <span className="text-slate-500">hasta</span>
            <input type="date" value={periodo.hasta} min={periodo.desde} max={hoyISO()} onChange={(e) => cambiarFecha("hasta", e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1 text-xs" aria-label="Fecha final" />
          </div>
          {aviso && <p className="w-full text-[11px] text-red-600">{aviso}</p>}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto no-imprimir">
        {PESTANAS.map((t) => {
          const Icono = t.icono;
          return (
            <button
              key={t.id}
              onClick={() => setPestana(t.id)}
              className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 -mb-px whitespace-nowrap ${
                pestana === t.id ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icono size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {pestana === "resumen" && <ResumenTab {...props} />}
      {pestana === "ingresos" && <IngresosTab {...props} />}
      {pestana === "ocupacion" && <OcupacionTab {...props} />}
      {pestana === "reservas" && <ReservasTab {...props} />}
      {pestana === "consumos" && <ConsumosTab {...props} />}
      {pestana === "caja" && <CajaTab {...props} />}
      {pestana === "operacion" && <OperacionTab {...props} />}
      {pestana === "inventario" && <ReporteInventario verCosto onCambio={() => undefined} />}
    </div>
  );
}
