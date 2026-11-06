import type { Periodo } from "../../api/reportes";
import { exportarCsv } from "../../utils/csv";
import { BarraAcciones, Cuadricula, Desglose, Estado, Seccion, Tabla, Tarjeta, type EsqueletoReporte } from "./comun";
import { decimal, entero, etiqueta, minutos, soles, useReporte } from "./formatos";

const ESQUELETO: EsqueletoReporte = {
  tarjetas: [],
  secciones: [
    { titulo: "Limpieza", alto: 200, completa: true },
    { titulo: "Incidencias de mantenimiento", alto: 200, completa: true },
    { titulo: "Solicitudes del huesped", alto: 200, completa: true },
  ],
};

export function OperacionTab({ periodo, version }: { periodo: Periodo; version: number }) {
  const r = useReporte("operacion", periodo, version);

  return (
    <Estado r={r} esqueleto={ESQUELETO}>
      {(d) => {
        const { limpieza: l, incidencias: i, solicitudes: s } = d;
        return (
          <>
            <BarraAcciones
              generadoEn={d.generadoEn}
              nota="Tareas, incidencias y solicitudes contadas por el dia en que se crearon."
              onCsv={() => exportarCsv(`operacion_${d.desde}_${d.hasta}`, ["Area", "Indicador", "Valor"], [
                ["Limpieza", "Tareas", l.tareas], ["Limpieza", "Completadas", l.completadas], ["Limpieza", "Minutos promedio", l.minutosPromedio],
                ["Incidencias", "Reportadas", i.reportadas], ["Incidencias", "Abiertas ahora", i.abiertas], ["Incidencias", "Resueltas", i.resueltas],
                ["Incidencias", "Horas promedio de resolucion", i.horasResolucionPromedio], ["Incidencias", "Horas promedio de respuesta", i.horasRespuestaPromedio],
                ["Incidencias", "Reabiertas", i.reabiertas], ["Incidencias", "Descartadas", i.descartadas],
                ["Solicitudes", "Total", s.total], ["Solicitudes", "Pendientes", s.pendientes], ["Solicitudes", "Atendidas", s.atendidas],
                ["Solicitudes", "Minutos promedio de atencion", s.minutosAtencionPromedio],
              ])}
            />

            <Seccion titulo="Limpieza">
              <div className="space-y-3">
                <Cuadricula>
                  <Tarjeta titulo="Tareas" valor={entero(l.tareas)} tono="azul" />
                  <Tarjeta titulo="Completadas" valor={entero(l.completadas)} tono="verde" />
                  <Tarjeta titulo="Abiertas" valor={entero(l.pendientes + l.enProceso)} tono={l.pendientes + l.enProceso ? "ambar" : "gris"} detalle={`${l.pendientes} pendientes · ${l.enProceso} en proceso`} />
                  <Tarjeta titulo="Tiempo por tarea" valor={minutos(l.minutosPromedio)} detalle="de inicio a fin" />
                </Cuadricula>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Origen</p><Desglose datos={l.porOrigen} usar="cantidad" formato={entero} vacio="Sin tareas en este periodo." /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Por empleado</p>
                    <Tabla columnas={["Empleado", "Tareas", "Tiempo promedio"]} derecha={[1, 2]} vacio="Sin tareas en este periodo."
                      filas={l.porEmpleado.map((e) => [e.clave, entero(e.cantidad), minutos(e.monto)])} />
                  </div>
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Incidencias de mantenimiento">
              <div className="space-y-3">
                <Cuadricula>
                  <Tarjeta titulo="Reportadas" valor={entero(i.reportadas)} tono="azul" />
                  <Tarjeta titulo="Abiertas ahora" valor={entero(i.abiertas)} tono={i.abiertas ? "rojo" : "verde"} detalle="pendientes o en reparacion" />
                  <Tarjeta titulo="Resueltas" valor={entero(i.resueltas)} tono="verde" />
                  <Tarjeta titulo="Tiempo de respuesta" valor={i.horasRespuestaPromedio ? `${decimal(i.horasRespuestaPromedio)} h` : "—"} detalle="desde el reporte hasta empezar a atenderla" />
                  <Tarjeta titulo="Tiempo de resolucion" valor={i.horasResolucionPromedio ? `${decimal(i.horasResolucionPromedio)} h` : "—"} detalle="desde el reporte hasta resolverla" />
                  <Tarjeta titulo="Reabiertas" valor={entero(i.reabiertas)} tono={i.reabiertas ? "ambar" : "verde"} detalle="la falla volvio" />
                  <Tarjeta titulo="Descartadas" valor={entero(i.descartadas)} detalle="duplicadas o sin procedencia" />
                </Cuadricula>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Por tipo</p><Desglose datos={i.porTipo} usar="cantidad" formato={entero} vacio="Sin incidencias en este periodo." /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Habitaciones con mas incidencias</p>
                    <Tabla columnas={["Habitacion", "Incidencias"]} derecha={[1]} vacio="Sin incidencias en este periodo."
                      filas={i.habitacionesRecurrentes.map((h) => [`Hab. ${h.clave}`, entero(h.cantidad)])} />
                  </div>
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Solicitudes del huesped">
              <div className="space-y-3">
                <Cuadricula>
                  <Tarjeta titulo="Solicitudes" valor={entero(s.total)} tono="azul" />
                  <Tarjeta titulo="Sin atender ahora" valor={entero(s.pendientes)} tono={s.pendientes ? "ambar" : "verde"} />
                  <Tarjeta titulo="Atendidas" valor={entero(s.atendidas)} tono="verde" detalle={`${s.canceladas} canceladas`} />
                  <Tarjeta titulo="Tiempo de atencion" valor={minutos(s.minutosAtencionPromedio)} detalle="desde el pedido hasta atenderlo" />
                </Cuadricula>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Por estado</p><Desglose datos={s.porEstado} usar="cantidad" formato={entero} vacio="Sin solicitudes en este periodo." /></div>
                  <div className="text-xs space-y-2 pt-5">
                    <p className="flex justify-between"><span className="text-slate-500">Pedidos cobrables</span><strong>{entero(s.cobrables)}</strong></p>
                    <p className="flex justify-between"><span className="text-slate-500">Monto cobrable</span><strong>{soles(s.montoCobrable)}</strong></p>
                    <p className="text-[10px] text-slate-400">Los estados se muestran como: {["PENDIENTE", "ASIGNADA", "EN_ATENCION", "ATENDIDA"].map(etiqueta).join(", ")}.</p>
                  </div>
                </div>
              </div>
            </Seccion>
          </>
        );
      }}
    </Estado>
  );
}
