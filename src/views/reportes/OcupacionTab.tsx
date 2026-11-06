import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { Barra, BarraAcciones, Cuadricula, Desglose, Estado, GraficoSerie, Seccion, Tabla, Tarjeta, type EsqueletoReporte } from "./comun";
import { COLOR_ESTADO_HAB, decimal, entero, etiqueta, porcentaje, soles, useReporte } from "./formatos";

const ESQUELETO: EsqueletoReporte = {
  tarjetas: ["Ocupacion", "Tarifa promedio (ADR)", "RevPAR", "Ingreso por noches", "Estadia promedio", "Llegadas", "Salidas", "Noches disponibles"],
  secciones: [
    { titulo: "Ocupacion por dia (%)", alto: 250, completa: true },
    { titulo: "Por tipo de habitacion", alto: 180 }, { titulo: "Estado de las habitaciones hoy", alto: 180 },
  ],
};

export function OcupacionTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("ocupacion", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => (
        <>
          <BarraAcciones
            generadoEn={d.generadoEn}
            nota="Una noche cuenta cuando la estadia ya ingreso y todavia no salio; la noche de la salida no se cuenta."
            onCsv={() => exportarCsv(`ocupacion_${d.desde}_${d.hasta}`, ["Fecha", "Habitaciones ocupadas", "Ocupacion (%)", "Ingreso por noches (S/)"],
              d.serie.map((p) => [p.fecha, p.ocupadas, p.ocupacionPct, p.ingreso]))}
          />

          <Cuadricula>
            <Tarjeta titulo="Ocupacion" valor={porcentaje(d.ocupacionPct.actual)} variacion={d.ocupacionPct.variacionPct} tono="azul"
              detalle={`${entero(d.nochesOcupadas)} de ${entero(d.nochesDisponibles)} noches`} />
            <Tarjeta titulo="Tarifa promedio (ADR)" valor={soles(d.adr.actual)} variacion={d.adr.variacionPct} detalle="ingreso entre noches ocupadas" />
            <Tarjeta titulo="RevPAR" valor={soles(d.revpar.actual)} variacion={d.revpar.variacionPct} detalle="ingreso entre noches disponibles" />
            <Tarjeta titulo="Ingreso por noches" valor={soles(d.ingresoAlojamiento)} detalle={`${d.habitaciones} habitaciones activas`} />
            <Tarjeta titulo="Estadia promedio" valor={`${decimal(d.estadiaPromedioNoches)} noches`} detalle="de las estadias que salieron" />
            <Tarjeta titulo="Llegadas" valor={entero(d.llegadas)} detalle="check-in realizados" />
            <Tarjeta titulo="Salidas" valor={entero(d.salidas)} detalle="check-out realizados" />
            <Tarjeta titulo="Noches disponibles" valor={entero(d.nochesDisponibles)} detalle={`${d.habitaciones} hab. x ${d.dias} dias`} />
          </Cuadricula>

          <Seccion titulo="Ocupacion por dia (%)" subtitulo="Habitaciones con una estadia en curso cada noche, sobre el total de habitaciones">
            <GraficoSerie
              datos={d.serie.map((p) => ({ x: p.fecha, ocupacion: p.ocupacionPct }))}
              series={[{ clave: "ocupacion", nombre: "Ocupacion", color: "#3b82f6", tipo: "linea" }]}
              formato={porcentaje} formatoEje={(v) => `${decimal(v, 0)}%`} alto={250}
            />
          </Seccion>

          <div className="grid grid-cols-3 gap-4">
            <Seccion titulo="Por tipo de habitacion" className="col-span-2">
              <Tabla columnas={["Tipo", "Habitaciones", "Noches", "Ocupacion", "Ingreso"]} derecha={[1, 2, 4]}
                filas={d.porTipo.map((t) => [
                  t.tipo, entero(t.habitaciones), entero(t.noches),
                  <span key="o" className="flex items-center gap-2"><span className="w-24"><Barra pct={t.ocupacionPct} color="#3b82f6" /></span>{porcentaje(t.ocupacionPct)}</span>,
                  soles(t.ingreso),
                ])} />
            </Seccion>
            <Seccion titulo="Estado de las habitaciones hoy">
              <div className="space-y-2">
                {d.estadoActual.map((e) => (
                  <div key={e.clave} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLOR_ESTADO_HAB[e.clave] ?? "#64748b" }} />
                    <span className="flex-1 text-slate-600">{etiqueta(e.clave)}</span>
                    <strong>{e.cantidad}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-3"><Desglose datos={d.estadoActual} usar="cantidad" formato={entero} /></div>
            </Seccion>
          </div>
        </>
      )}
    </Estado>
  );
}
