import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { Barra, BarraAcciones, Cuadricula, Desglose, Estado, GraficoSerie, GraficoTorta, Seccion, Tabla, Tarjeta, type EsqueletoReporte } from "./comun";
import { entero, etiqueta, minutos, porcentaje, soles, useReporte } from "./formatos";

const ESQUELETO: EsqueletoReporte = {
  tarjetas: ["Venta de consumos", "Unidades vendidas", "Comandas", "Merma por cancelaciones", "Tiempo de preparacion", "Tiempo hasta la entrega", "Comandas activas ahora"],
  secciones: [
    { titulo: "Venta por dia (S/)", alto: 230 }, { titulo: "Por area", alto: 230 },
    { titulo: "Productos mas vendidos y su margen", alto: 220, completa: true },
  ],
};

export function ConsumosTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("consumos", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => (
        <>
          <BarraAcciones
            generadoEn={d.generadoEn}
            nota="El margen usa el costo actual de la receta de cada producto."
            onCsv={() => exportarCsv(`consumos_${d.desde}_${d.hasta}`,
              ["Producto", "Area", "Unidades", "Venta (S/)", "Costo por unidad (S/)", "Margen (S/)", "Margen (%)", "Con receta"],
              d.topProductos.map((p) => [p.nombre, etiqueta(p.categoria), p.unidades, p.venta, p.costoUnitario, p.margen, p.margenPct, p.conReceta ? "si" : "no"]))}
          />

          <Cuadricula>
            <Tarjeta titulo="Venta de consumos" valor={soles(d.venta.actual)} variacion={d.venta.variacionPct} tono="verde" />
            <Tarjeta titulo="Unidades vendidas" valor={entero(d.unidades)} />
            <Tarjeta titulo="Comandas" valor={entero(d.comandas.total)} detalle={`${d.comandas.entregadas} entregadas · ${d.comandas.canceladas} canceladas`} />
            <Tarjeta titulo="Merma por cancelaciones" valor={soles(d.mermaPorCancelaciones)} tono={d.mermaPorCancelaciones ? "rojo" : "gris"} detalle="insumos de comandas canceladas ya empezadas" />
            <Tarjeta titulo="Tiempo de preparacion" valor={minutos(d.comandas.minutosPreparacion)} detalle="desde que se pide hasta que esta lista" />
            <Tarjeta titulo="Tiempo hasta la entrega" valor={minutos(d.comandas.minutosEntrega)} detalle="desde que se pide hasta que se entrega" />
            <Tarjeta titulo="Comandas activas ahora" valor={entero(d.comandas.activas)} detalle="pendientes, en preparacion o listas" />
          </Cuadricula>

          <div className="grid grid-cols-3 gap-4">
            <Seccion titulo="Venta por dia (S/)" className="col-span-2">
              <GraficoSerie datos={d.serie.map((p) => ({ x: p.fecha, venta: p.valor }))}
                series={[{ clave: "venta", nombre: "Venta", color: "#f59e0b" }]} />
            </Seccion>
            <Seccion titulo="Por area">
              <GraficoTorta datos={d.porCategoria.map((x) => ({ nombre: etiqueta(x.clave), valor: x.monto }))} />
            </Seccion>
          </div>

          <Seccion titulo="Productos mas vendidos y su margen" subtitulo="Los 10 con mayor venta del periodo">
            <Tabla
              columnas={["Producto", "Area", "Unidades", "Venta", "Costo por unidad", "Margen", "Margen %"]}
              derecha={[2, 3, 4, 5, 6]}
              vacio="Aun no hay consumos en este periodo."
              filas={d.topProductos.map((p) => [
                p.nombre, etiqueta(p.categoria), entero(p.unidades), soles(p.venta),
                p.conReceta ? soles(p.costoUnitario) : <span key="c" className="text-amber-600">sin receta</span>,
                p.margen === null ? "—" : <span key="m" className={p.margen < 0 ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold"}>{soles(p.margen)}</span>,
                p.margenPct === null ? "—" : <span key="p" className="flex items-center gap-2 justify-end"><span className="w-14"><Barra pct={p.margenPct} /></span>{porcentaje(p.margenPct)}</span>,
              ])}
            />
          </Seccion>

          <div className="grid grid-cols-2 gap-4">
            <Seccion titulo="Comandas por area"><Desglose datos={d.comandas.porArea} usar="cantidad" formato={entero} vacio="Sin comandas en este periodo." /></Seccion>
            <Seccion titulo="Detalle por area vendida"><Desglose datos={d.porCategoria} /></Seccion>
          </div>
        </>
      )}
    </Estado>
  );
}
