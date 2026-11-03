import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { inventarioApi } from "../../api/inventario";
import { mensajeDeError } from "../../api/errores";
import type { ReporteInventario } from "../../api/types";
import { Button, EmptyState, KpiCard, LoadingState } from "../../components/ui";
import { AREA_LABEL, hoyISO, num, soles, type Mensaje } from "./comun";

interface Props {
  verCosto: boolean;
  onCambio: (mensaje: Mensaje) => void;
}

export function ReportesTab({ verCosto, onCambio }: Props) {
  const [desde, setDesde] = useState(hoyISO(29));
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState<ReporteInventario | null>(null);
  const cargando = reporte === null || reporte.desde !== desde || reporte.hasta !== hasta;

  useEffect(() => {
    let vigente = true;
    inventarioApi
      .reporteConsumo(desde, hasta)
      .then((datos) => vigente && setReporte(datos))
      .catch((e) => vigente && onCambio({ tipo: "error", texto: mensajeDeError(e, "No se pudo generar el reporte.") }));
    return () => {
      vigente = false;
    };
  }, [desde, hasta, onCambio]);

  const exportarCsv = () => {
    if (!reporte) return;
    const encabezado = ["Insumo", "Unidad", "Area", "Entradas", "Consumido", "Merma", "Sobrante", "Faltante", "Costo consumo", "Costo merma"];
    const filas = reporte.filas.map((f) => [
      f.nombre, f.unidad, AREA_LABEL[f.area], f.entradas, f.consumido, f.merma, f.sobrante, f.faltante, f.costoConsumo, f.costoMerma,
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario_${reporte.desde}_${reporte.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 bg-white p-3 rounded-xl border border-slate-200">
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)}
            className="block mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-bold text-slate-500 uppercase">
          Hasta
          <input type="date" value={hasta} min={desde} max={hoyISO()} onChange={(e) => setHasta(e.target.value)}
            className="block mt-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-normal" />
        </label>
        <div className="ml-auto">
          <Button variant="secondary" size="sm" icon={<Download size={12} />} onClick={exportarCsv} disabled={!reporte || reporte.filas.length === 0}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {!reporte ? (
        <LoadingState />
      ) : (
        <div className={`space-y-3 transition-opacity ${cargando ? "opacity-50" : ""}`}>
          <div className={`grid gap-3 ${verCosto ? "grid-cols-5" : "grid-cols-2"}`}>
            {verCosto && <KpiCard title="Valor del stock" value={soles(reporte.valorizacionStock)} color="emerald" />}
            {verCosto && <KpiCard title="Costo de consumo" value={soles(reporte.costoConsumoTotal)} subtitle="Segun costo actual" color="blue" />}
            {verCosto && <KpiCard title="Costo de mermas" value={soles(reporte.costoMermaTotal)} color="amber" />}
            <KpiCard title="Por reponer" value={reporte.insumosStockBajo} color="amber" />
            <KpiCard title="Agotados" value={reporte.insumosAgotados} color="red" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100 text-xs font-bold text-slate-700">
              Consumo por insumo ({reporte.filas.length})
            </div>
            {reporte.filas.length === 0 ? (
              <EmptyState title="No hubo movimientos en este rango" />
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                    <th className="p-3">Insumo</th>
                    <th className="p-3 text-right">Entradas</th>
                    <th className="p-3 text-right">Consumido</th>
                    <th className="p-3 text-right">Merma</th>
                    <th className="p-3 text-right">Sobrante</th>
                    <th className="p-3 text-right">Faltante</th>
                    {verCosto && <th className="p-3 text-right">Costo consumo</th>}
                    {verCosto && <th className="p-3 text-right">Costo merma</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reporte.filas.map((f) => (
                    <tr key={f.idInsumo} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">
                        {f.nombre} <span className="font-normal text-slate-400">({f.unidad})</span>
                      </td>
                      <td className="p-3 text-right">{num(f.entradas)}</td>
                      <td className="p-3 text-right font-semibold">{num(f.consumido)}</td>
                      <td className="p-3 text-right">{num(f.merma)}</td>
                      <td className="p-3 text-right">{num(f.sobrante)}</td>
                      <td className={`p-3 text-right ${Number(f.faltante) > 0 ? "text-red-600 font-semibold" : "text-slate-300"}`}>
                        {Number(f.faltante) > 0 ? num(f.faltante) : "—"}
                      </td>
                      {verCosto && <td className="p-3 text-right">{soles(f.costoConsumo)}</td>}
                      {verCosto && <td className="p-3 text-right">{soles(f.costoMerma)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
