import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { fechaHora } from "../../utils/fechas";
import { BarraAcciones, Cuadricula, Desglose, Estado, Seccion, Tabla, Tarjeta, type EsqueletoReporte } from "./comun";
import { entero, etiqueta, soles, useReporte } from "./formatos";

function Diferencia({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-slate-400">—</span>;
  if (valor === 0) return <span className="text-emerald-700 font-semibold">Cuadro</span>;
  return <span className={`font-semibold ${valor < 0 ? "text-red-600" : "text-amber-600"}`}>{valor < 0 ? "Faltante " : "Sobrante "}{soles(Math.abs(valor))}</span>;
}

const ESQUELETO: EsqueletoReporte = {
  tarjetas: ["Turnos de caja", "Diferencia neta", "Cierres con diferencia", "Cobrado", "Diferencias sin resolver", "Retiros a custodia", "Gastos en efectivo"],
  secciones: [
    { titulo: "Descuadres por cajero", alto: 120, completa: true },
    { titulo: "Cobrado por metodo" }, { titulo: "Cobrado por quien lo registro" },
    { titulo: "Historial de turnos", alto: 200, completa: true },
  ],
};

export function CajaTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("caja", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => (
        <>
          <BarraAcciones
            generadoEn={d.generadoEn}
            nota="Turnos contados por el dia en que se abrieron."
            onCsv={() => exportarCsv(`caja_${d.desde}_${d.hasta}`,
              ["Turno", "Abrio", "Cerro", "Apertura", "Cierre", "Fondo (S/)", "Esperado (S/)", "Declarado (S/)", "Diferencia (S/)", "Cobrado (S/)", "Veces que no cuadro", "Motivo de la diferencia", "Estado", "Observaciones"],
              d.detalle.map((t) => [t.id, t.abrio, t.cerro, t.apertura, t.cierre, t.fondo, t.esperado, t.declarado, t.diferencia, t.cobrado, t.reconteos, t.motivo, etiqueta(t.estado), t.observaciones]))}
          />

          <Cuadricula>
            <Tarjeta titulo="Turnos de caja" valor={entero(d.turnos)} detalle={`${d.turnosCerrados} cerrados`} tono="azul" />
            <Tarjeta titulo="Diferencia neta" valor={soles(d.diferenciaNeta)} tono={d.diferenciaNeta === 0 ? "verde" : "rojo"} detalle="suma de los cierres" />
            <Tarjeta titulo="Cierres con diferencia" valor={`${d.sobrantes + d.faltantes}`} tono={d.sobrantes + d.faltantes ? "ambar" : "verde"} detalle={`${d.faltantes} faltante(s) · ${d.sobrantes} sobrante(s)`} />
            <Tarjeta titulo="Cobrado" valor={soles(d.cobradoTotal)} tono="verde" detalle="todos los metodos" />
            <Tarjeta titulo="Diferencias sin resolver" valor={entero(d.diferenciasPendientes)}
              tono={d.diferenciasPendientes ? "rojo" : "verde"}
              detalle={d.diferenciasPendientes ? `faltan ${soles(Math.abs(d.faltantePendiente))} · sobran ${soles(d.sobrantePendiente)}` : "ninguna pendiente"} />
            <Tarjeta titulo="Retiros a custodia" valor={soles(d.retiros)} detalle="efectivo que salio de la caja" />
            <Tarjeta titulo="Gastos en efectivo" valor={soles(d.gastos)} detalle="gastos menores del periodo" />
          </Cuadricula>

          <Seccion titulo="Descuadres por cajero" subtitulo="Quien cierra la caja responde por su cuadre (cierres hechos en el periodo)">
            <Tabla
              columnas={["Cajero", "Cierres", "Con diferencia", "Faltante", "Sobrante", "Neto", "Veces que no cuadro al verificar"]}
              derecha={[1, 2, 3, 4, 5, 6]}
              vacio="No hubo cierres de caja en este periodo."
              filas={d.descuadresPorCajero.map((c) => [
                c.cajero, entero(c.cierres), entero(c.con_diferencia),
                <span key="f" className={c.faltante < 0 ? "text-red-600 font-semibold" : "text-slate-400"}>{soles(Math.abs(c.faltante))}</span>,
                <span key="s" className={c.sobrante > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>{soles(c.sobrante)}</span>,
                <span key="n" className={c.neto === 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>{soles(c.neto)}</span>,
                entero(c.reconteos),
              ])}
            />
          </Seccion>

          <div className="grid grid-cols-2 gap-4">
            <Seccion titulo="Cobrado por metodo"><Desglose datos={d.porMetodo} /></Seccion>
            <Seccion titulo="Cobrado por quien lo registro" subtitulo="Los pagos del portal no tienen empleado">
              <Desglose datos={d.porEmpleado} />
            </Seccion>
          </div>

          <Seccion titulo="Historial de turnos" subtitulo="Cuadre de cada turno: lo que el sistema esperaba en efectivo frente a lo que se conto">
            <Tabla
              columnas={["Turno", "Abrio", "Cerro", "Apertura", "Cierre", "Fondo", "Esperado", "Declarado", "Resultado", "Cobrado", "Estado", "Motivo"]}
              derecha={[5, 6, 7, 9]}
              vacio="No hubo turnos de caja en este periodo."
              filas={d.detalle.map((t) => [
                `#${t.id}`, t.abrio, t.cerro ?? "—", fechaHora(t.apertura), fechaHora(t.cierre), soles(t.fondo),
                t.esperado === null ? "—" : soles(t.esperado), t.declarado === null ? "—" : soles(t.declarado),
                <Diferencia key="d" valor={t.diferencia} />, soles(t.cobrado), etiqueta(t.estado),
                t.motivo ?? "—",
              ])}
            />
          </Seccion>

          <Seccion titulo={`Notas de turno sin resolver (${d.bitacorasPendientes})`} subtitulo="Novedades que dejo cada turno y nadie marco como resueltas">
            <Tabla
              columnas={["Turno", "Prioridad", "Categoria", "Nota", "Fecha"]}
              vacio="No hay notas pendientes."
              filas={d.bitacoras.map((b) => [`#${b.turno}`, b.prioridad, b.categoria ?? "—", b.mensaje, fechaHora(b.fecha)])}
            />
          </Seccion>
        </>
      )}
    </Estado>
  );
}
