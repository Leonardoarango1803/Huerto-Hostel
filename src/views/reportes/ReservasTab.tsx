import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { BarraAcciones, Cuadricula, Desglose, Estado, GraficoBarrasHorizontales, GraficoSerie, GraficoTorta, Seccion, Tarjeta, type EsqueletoReporte } from "./comun";
import { decimal, entero, etiqueta, porcentaje, soles, useReporte } from "./formatos";

const ESQUELETO: EsqueletoReporte = {
  tarjetas: ["Reservas registradas", "Canceladas", "Liberadas automaticamente", "Esperando adelanto ahora", "Anticipacion promedio", "Huespedes nuevos", "Huespedes repetidos", "Huespedes alojados"],
  secciones: [
    { titulo: "Reservas registradas por dia", alto: 230, completa: true },
    { titulo: "Por estado", alto: 200 }, { titulo: "Por canal", alto: 200 },
    { titulo: "Nacionalidad de los huespedes", alto: 160 },
  ],
};

export function ReservasTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("reservas", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => (
        <>
          <BarraAcciones
            generadoEn={d.generadoEn}
            nota="Reservas contadas por el dia en que se registraron."
            onCsv={() => exportarCsv(`reservas_${d.desde}_${d.hasta}`, ["Fecha", "Reservas registradas"], d.serie.map((p) => [p.fecha, p.valor]))}
          />

          <Cuadricula>
            <Tarjeta titulo="Reservas registradas" valor={entero(d.registradas.actual)} variacion={d.registradas.variacionPct} tono="azul" />
            <Tarjeta titulo="Canceladas" valor={entero(d.canceladas)} tono={d.canceladas ? "rojo" : "gris"} detalle={`${porcentaje(d.tasaCancelacionPct)} de las registradas`} />
            <Tarjeta titulo="Liberadas automaticamente" valor={entero(d.liberadasAutomaticamente)} tono="ambar" detalle="sin adelanto al llegar su dia" />
            <Tarjeta titulo="Esperando adelanto ahora" valor={entero(d.pendientesAdelanto)} detalle="se liberan solas al llegar su dia" />
            <Tarjeta titulo="Anticipacion promedio" valor={`${decimal(d.antelacionPromedioDias)} dias`} detalle="entre reservar y llegar" />
            <Tarjeta titulo="Huespedes nuevos" valor={entero(d.huespedes.nuevos)} detalle="clientes registrados en el periodo" />
            <Tarjeta titulo="Huespedes repetidos" valor={entero(d.huespedes.repetidos)} tono="verde" detalle="con mas de una reserva" />
            <Tarjeta titulo="Huespedes alojados" valor={entero(d.huespedes.conEstadia)} detalle="con check-in en el periodo" />
          </Cuadricula>

          <Seccion titulo="Reservas registradas por dia">
            <GraficoSerie datos={d.serie.map((p) => ({ x: p.fecha, reservas: p.valor }))}
              series={[{ clave: "reservas", nombre: "Reservas", color: "#3b82f6" }]} formato={entero} />
          </Seccion>

          <div className="grid grid-cols-3 gap-4">
            <Seccion titulo="Por estado">
              <GraficoTorta datos={d.porEstado.map((x) => ({ nombre: etiqueta(x.clave), valor: x.cantidad }))} formato={entero} />
              <Desglose datos={d.porEstado} usar="cantidad" formato={entero} />
            </Seccion>
            <Seccion titulo="Por canal">
              <GraficoTorta datos={d.porCanal.map((x) => ({ nombre: etiqueta(x.clave), valor: x.cantidad }))} formato={entero} />
              <Desglose datos={d.porCanal} usar="cantidad" formato={entero} />
              <p className="text-[10px] text-slate-400 mt-2">Alojamiento reservado: {soles(d.porCanal.reduce((s, c) => s + c.monto, 0))}</p>
            </Seccion>
            <Seccion titulo="Nacionalidad de los huespedes" subtitulo="De quienes hicieron check-in en el periodo">
              <GraficoBarrasHorizontales datos={d.porNacionalidad.map((x) => ({ nombre: x.clave, valor: x.cantidad }))} />
            </Seccion>
          </div>
        </>
      )}
    </Estado>
  );
}
