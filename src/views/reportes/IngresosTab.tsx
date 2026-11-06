import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { BarraAcciones, Cuadricula, Desglose, Estado, GraficoSerie, GraficoTorta, Seccion, Tarjeta, type EsqueletoReporte } from "./comun";
import { entero, etiqueta, soles, useReporte } from "./formatos";

const ESQUELETO: EsqueletoReporte = {
  columnas: 5,
  tarjetas: ["Cobrado", "Facturado", "Por cobrar ahora", "Cobros registrados", "Cobro promedio"],
  secciones: [
    { titulo: "Facturado y cobrado por dia (S/)", alto: 260, completa: true },
    { titulo: "Por metodo de pago", alto: 220 }, { titulo: "Por concepto de cobro", alto: 220 },
    { titulo: "Por canal de la reserva" }, { titulo: "Facturado por area" },
  ],
};

export function IngresosTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("ingresos", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => (
        <>
          <BarraAcciones
            generadoEn={d.generadoEn}
            nota="Cobrado = dinero que entro. Facturado = alojamiento al hacer check-out + consumos."
            onCsv={() => exportarCsv(`ingresos_${d.desde}_${d.hasta}`, ["Fecha", "Cobrado (S/)", "Alojamiento facturado (S/)", "Consumos (S/)"],
              d.serie.map((p) => [p.fecha, p.cobrado, p.alojamiento, p.consumos]))}
          />

          <Cuadricula columnas={5}>
            <Tarjeta titulo="Cobrado" valor={soles(d.cobrado.actual)} variacion={d.cobrado.variacionPct} tono="verde" />
            <Tarjeta titulo="Facturado" valor={soles(d.facturado)} detalle="alojamiento + consumos" />
            <Tarjeta titulo="Por cobrar ahora" valor={soles(d.porCobrarAhora)} tono="ambar" detalle="estadias en curso" />
            <Tarjeta titulo="Cobros registrados" valor={entero(d.cantidadCobros)} />
            <Tarjeta titulo="Cobro promedio" valor={soles(d.cantidadCobros ? d.cobrado.actual / d.cantidadCobros : 0)} />
          </Cuadricula>

          <Seccion titulo="Facturado y cobrado por dia (S/)" subtitulo="Las barras suman lo facturado; la linea es lo que realmente se cobro ese dia">
            <GraficoSerie
              datos={d.serie.map((p) => ({ x: p.fecha, alojamiento: p.alojamiento, consumos: p.consumos, cobrado: p.cobrado }))}
              series={[
                { clave: "alojamiento", nombre: "Alojamiento", color: "#1b4332", apilar: true },
                { clave: "consumos", nombre: "Consumos", color: "#f59e0b", apilar: true },
                { clave: "cobrado", nombre: "Cobrado", color: "#3b82f6", tipo: "linea" },
              ]}
              alto={260}
            />
          </Seccion>

          <div className="grid grid-cols-2 gap-4">
            <Seccion titulo="Por metodo de pago">
              <GraficoTorta datos={d.porMetodo.map((x) => ({ nombre: etiqueta(x.clave), valor: x.monto }))} />
              <Desglose datos={d.porMetodo} />
            </Seccion>
            <Seccion titulo="Por concepto de cobro">
              <Desglose datos={d.porConcepto} />
            </Seccion>
            <Seccion titulo="Por canal de la reserva" subtitulo="De donde vino el huesped que pago">
              <Desglose datos={d.porCanal} />
            </Seccion>
            <Seccion titulo="Facturado por area">
              <Desglose datos={d.porArea} />
            </Seccion>
          </div>
        </>
      )}
    </Estado>
  );
}
