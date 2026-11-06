import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { BarraAcciones, Cuadricula, Desglose, Estado, GraficoSerie, GraficoTorta, Seccion, Tabla, Tarjeta, type EsqueletoReporte } from "./comun";
import { decimal, entero, etiqueta, porcentaje, soles, useReporte } from "./formatos";

const ESQUELETO: EsqueletoReporte = {
  tarjetas: ["Cobrado", "Ocupacion", "Tarifa promedio (ADR)", "RevPAR", "Reservas nuevas", "Consumos", "Por cobrar ahora", "Diferencia de caja"],
  secciones: [
    { titulo: "Cobrado por dia (S/)", alto: 230 }, { titulo: "Ocupacion por dia (%)", alto: 230 },
    { titulo: "Facturado por area", alto: 200 }, { titulo: "Cobrado por metodo de pago", alto: 200 },
    { titulo: "Productos mas vendidos" }, { titulo: "Inventario" },
  ],
};

export function ResumenTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("resumen", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => {
        const inv = d.inventario;
        const hayAlertaInventario = inv.insumosAgotados > 0 || inv.insumosStockBajo > 0 || inv.faltantesUltimos7Dias > 0;
        return (
          <>
            <BarraAcciones
              generadoEn={d.generadoEn}
              onCsv={() => exportarCsv(`resumen_${d.desde}_${d.hasta}`, ["Fecha", "Cobrado (S/)", "Ocupacion (%)"],
                d.serie.map((p) => [p.fecha, p.cobrado, p.ocupacionPct]))}
            />

            <Cuadricula>
              <Tarjeta titulo="Cobrado" valor={soles(d.cobrado.actual)} variacion={d.cobrado.variacionPct} tono="verde" detalle="dinero que entro en el periodo" />
              <Tarjeta titulo="Ocupacion" valor={porcentaje(d.ocupacionPct.actual)} variacion={d.ocupacionPct.variacionPct} tono="azul" detalle={`${entero(d.llegadas)} llegadas · ${entero(d.salidas)} salidas`} />
              <Tarjeta titulo="Tarifa promedio (ADR)" valor={soles(d.adr.actual)} variacion={d.adr.variacionPct} detalle="por noche ocupada" />
              <Tarjeta titulo="RevPAR" valor={soles(d.revpar.actual)} variacion={d.revpar.variacionPct} detalle="ingreso por habitacion disponible" />
              <Tarjeta titulo="Reservas nuevas" valor={entero(d.reservas.actual)} variacion={d.reservas.variacionPct} detalle={`${porcentaje(d.tasaCancelacionPct)} canceladas`} />
              <Tarjeta titulo="Consumos" valor={soles(d.ventaConsumos.actual)} variacion={d.ventaConsumos.variacionPct} detalle="cocina, bar y venta directa" />
              <Tarjeta titulo="Por cobrar ahora" valor={soles(d.porCobrarAhora)} tono="ambar" detalle="saldo de las estadias en curso" />
              <Tarjeta titulo="Diferencia de caja" valor={soles(d.diferenciaCaja)} tono={d.diferenciaCaja === 0 ? "verde" : "rojo"} detalle="suma de los cierres del periodo" />
            </Cuadricula>

            <div className="grid grid-cols-2 gap-4">
              <Seccion titulo="Cobrado por dia (S/)">
                <GraficoSerie datos={d.serie.map((p) => ({ x: p.fecha, cobrado: p.cobrado }))}
                  series={[{ clave: "cobrado", nombre: "Cobrado", color: "#10b981" }]} />
              </Seccion>
              <Seccion titulo="Ocupacion por dia (%)">
                <GraficoSerie datos={d.serie.map((p) => ({ x: p.fecha, ocupacion: p.ocupacionPct }))}
                  series={[{ clave: "ocupacion", nombre: "Ocupacion", color: "#3b82f6", tipo: "linea" }]}
                  formato={porcentaje} formatoEje={(v) => `${decimal(v, 0)}%`} />
              </Seccion>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Seccion titulo="Facturado por area" subtitulo="Alojamiento al hacer check-out + consumos del periodo">
                <GraficoTorta datos={d.porArea.map((x) => ({ nombre: etiqueta(x.clave), valor: x.monto }))} />
              </Seccion>
              <Seccion titulo="Cobrado por metodo de pago">
                <GraficoTorta datos={d.porMetodo.map((x) => ({ nombre: etiqueta(x.clave), valor: x.monto }))} />
              </Seccion>
              <Seccion titulo="Detalle por area">
                <Desglose datos={d.porArea} />
              </Seccion>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Seccion titulo="Productos mas vendidos" className="col-span-2">
                <Tabla columnas={["Producto", "Area", "Unidades", "Venta"]} derecha={[2, 3]}
                  vacio="Aun no hay consumos en este periodo."
                  filas={d.topProductos.map((p) => [p.nombre, etiqueta(p.categoria), entero(p.unidades), soles(p.venta)])} />
              </Seccion>
              <Seccion titulo="Inventario" accion={<Link to="/inventario" className="text-[10px] text-emerald-700 font-semibold hover:underline no-imprimir">Ver</Link>}>
                {hayAlertaInventario ? (
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between"><span className="text-slate-500">Agotados</span><strong className={inv.insumosAgotados ? "text-red-600" : ""}>{inv.insumosAgotados}</strong></li>
                    <li className="flex justify-between"><span className="text-slate-500">En o bajo el minimo</span><strong className={inv.insumosStockBajo ? "text-amber-600" : ""}>{inv.insumosStockBajo}</strong></li>
                    <li className="flex justify-between"><span className="text-slate-500">Ventas con faltante (7 dias)</span><strong>{inv.faltantesUltimos7Dias}</strong></li>
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-700 pt-1"><AlertTriangle size={12} className="shrink-0" /> Revisa el almacen antes de que falte para vender.</li>
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-700">El stock esta sobre el minimo y no hubo faltantes.</p>
                )}
              </Seccion>
            </div>
          </>
        );
      }}
    </Estado>
  );
}
