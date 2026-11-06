import { forwardRef } from "react";
import type { ComprobanteEstadia } from "../../api/comprobante";
import { ANCHO_PX, type FormatoComprobante } from "../../utils/exportarComprobante";
import { fechaDMA } from "../../utils/fechas";

/** Aviso legal del comprobante: se escribe aquí (y no viene del servidor) para que lleve tildes. */
const AVISO = "Documento informativo del hostel. No es una boleta ni una factura electrónica; solicita tu comprobante electrónico en recepción si lo necesitas.";

const soles = (n: number) => `S/ ${Number(n ?? 0).toFixed(2)}`;

function fecha(iso: string | null | undefined, conHora = true): string {
  if (!iso) return "—";
  if (iso.length === 10) return fechaDMA(iso); // fecha sola (salida prevista): dia local, no UTC
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-PE", conHora
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }
    : { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CONCEPTO: Record<string, string> = {
  ADELANTO_RESERVA: "Adelanto de reserva",
  PAGO_PARCIAL_ESTADIA: "Pago parcial",
  LIQUIDACION_CHECKOUT: "Pago al salir",
};
const METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_POS: "Tarjeta POS",
  TRANSFERENCIA: "Transferencia",
  PASARELA_ONLINE: "Pasarela online",
};

const titulo = (c: ComprobanteEstadia) => (c.tipo === "COMPROBANTE" ? "COMPROBANTE DE PAGO" : "ESTADO DE CUENTA");
const subtitulo = (c: ComprobanteEstadia) =>
  c.tipo === "COMPROBANTE" ? "Estadía y consumos" : "Pre-cuenta: aún no es comprobante de pago";

function estadoDelSaldo(c: ComprobanteEstadia): { texto: string; valor: number } {
  if (c.saldoAFavor > 0) return { texto: "SALDO A FAVOR DEL HUÉSPED", valor: c.saldoAFavor };
  if (c.saldoPendiente > 0) return { texto: c.salidaConDeuda ? "SALIÓ CON SALDO PENDIENTE" : "SALDO PENDIENTE", valor: c.saldoPendiente };
  return { texto: c.tipo === "COMPROBANTE" ? "CANCELADO" : "SIN SALDO PENDIENTE", valor: 0 };
}

interface Props {
  datos: ComprobanteEstadia;
}

function Fila({ izquierda, derecha, negrita = false }: { izquierda: string; derecha: string; negrita?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${negrita ? "font-bold" : ""}`}>
      <span>{izquierda}</span>
      <span className="whitespace-nowrap">{derecha}</span>
    </div>
  );
}

/** Ticket para impresora de recibos termica de 80 mm: texto monoespaciado, una sola columna, blanco y negro. */
export const TicketTermico = forwardRef<HTMLDivElement, Props>(function TicketTermico({ datos: c }, ref) {
  const saldo = estadoDelSaldo(c);
  const separador = <div className="border-t border-dashed border-black my-1.5" />;
  return (
    <div ref={ref} data-testid="ticket-termico" className="ticket-termico bg-white text-black"
      style={{ width: ANCHO_PX.TERMICO, padding: "10px 12px", fontFamily: "'Courier New', ui-monospace, monospace", fontSize: 11, lineHeight: 1.35 }}>
      <div className="text-center">
        <p className="font-bold text-sm uppercase">{c.hotel.nombre}</p>
        {c.hotel.ruc && <p>RUC {c.hotel.ruc}</p>}
        {c.hotel.direccion && <p>{c.hotel.direccion}</p>}
        {c.hotel.telefono && <p>Tel. {c.hotel.telefono}</p>}
        {c.hotel.correo && <p>{c.hotel.correo}</p>}
      </div>
      {separador}
      <div className="text-center">
        <p className="font-bold text-xs">{titulo(c)}</p>
        <p className="text-[10px]">{subtitulo(c)}</p>
        <p className="font-bold">N.° {c.numero}</p>
      </div>
      <p>Emitido: {fecha(c.emitidoEn)}</p>
      {c.atendidoPor && <p>Atendió: {c.atendidoPor}</p>}
      {separador}
      <p className="font-bold">HUÉSPED</p>
      <p>{c.huesped.nombre}</p>
      {c.huesped.numeroDocumento && <p>{c.huesped.tipoDocumento} {c.huesped.numeroDocumento}</p>}
      <p className="mt-1">Hab. {c.habitacion.numero}{c.habitacion.tipo ? ` · ${c.habitacion.tipo}` : ""}</p>
      <p>Ingreso: {fecha(c.checkin)}</p>
      <p>{c.checkout ? `Salida:  ${fecha(c.checkout)}` : `Salida prevista: ${fecha(c.salidaPrevista, false)}`}</p>
      {separador}
      <p className="font-bold">ALOJAMIENTO</p>
      <Fila izquierda={`${c.alojamiento.noches} noche(s) x ${soles(c.alojamiento.tarifaPorNoche)}`} derecha={soles(c.alojamiento.total)} />
      {c.consumos.length > 0 && (
        <>
          {separador}
          <p className="font-bold">CONSUMOS Y SERVICIOS</p>
          {c.consumos.map((l, i) => (
            <div key={i} className="mb-0.5">
              <p>{fecha(l.fecha, false).slice(0, 5)} {l.descripcion}</p>
              <Fila izquierda={`   ${l.cantidad} x ${Number(l.precioUnitario).toFixed(2)}`} derecha={soles(l.total)} />
            </div>
          ))}
        </>
      )}
      {separador}
      <Fila izquierda="Alojamiento" derecha={soles(c.alojamiento.total)} />
      <Fila izquierda="Consumos" derecha={soles(c.totalConsumos)} />
      <Fila izquierda="TOTAL" derecha={soles(c.total)} negrita />
      {c.pagos.length > 0 && (
        <>
          {separador}
          <p className="font-bold">PAGOS</p>
          {c.pagos.map((p, i) => (
            <div key={i} className="mb-0.5">
              <p>{fecha(p.fecha, false).slice(0, 5)} {CONCEPTO[p.concepto ?? ""] ?? p.concepto}</p>
              <Fila izquierda={`   ${METODO[p.metodo ?? ""] ?? p.metodo ?? ""}${p.referencia ? ` ${p.referencia}` : ""}`} derecha={soles(p.monto)} />
            </div>
          ))}
          <Fila izquierda="Total pagado" derecha={soles(c.totalPagado)} negrita />
        </>
      )}
      {c.devoluciones.length > 0 && (
        <>
          {separador}
          <p className="font-bold">DEVOLUCIÓN AL HUÉSPED</p>
          {c.devoluciones.map((d, i) => (
            <Fila key={i} izquierda={`${fecha(d.fecha, false).slice(0, 5)} Efectivo`} derecha={soles(d.monto)} />
          ))}
        </>
      )}
      {separador}
      <div className="text-center my-1">
        <p className="font-bold text-xs">{saldo.texto}</p>
        {saldo.valor > 0 && <p className="font-bold text-sm">{soles(saldo.valor)}</p>}
      </div>
      {separador}
      <p className="text-[9px] text-center">{AVISO}</p>
      {c.hotel.mensajePie && <p className="text-center font-bold mt-1.5">{c.hotel.mensajePie}</p>}
    </div>
  );
});

/** Hoja A4: el mismo comprobante con mas aire, tablas y cuadro de totales; para archivar o entregar impreso. */
export const HojaA4 = forwardRef<HTMLDivElement, Props>(function HojaA4({ datos: c }, ref) {
  const saldo = estadoDelSaldo(c);
  const th = "text-left text-[10px] uppercase text-slate-500 font-bold border-b border-slate-300 py-1.5";
  return (
    <div ref={ref} data-testid="hoja-a4" className="hoja-a4 bg-white text-slate-900"
      style={{ width: ANCHO_PX.A4, minHeight: 1000, padding: "44px 48px", fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: 12 }}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-2xl font-bold text-[#1b4332]">{c.hotel.nombre}</p>
          <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
            {c.hotel.ruc && <p>RUC {c.hotel.ruc}</p>}
            {c.hotel.direccion && <p>{c.hotel.direccion}</p>}
            {(c.hotel.telefono || c.hotel.correo) && <p>{[c.hotel.telefono && `Tel. ${c.hotel.telefono}`, c.hotel.correo].filter(Boolean).join("  ·  ")}</p>}
          </div>
        </div>
        <div className="border-2 border-[#1b4332] rounded-lg px-5 py-3 text-center">
          <p className="font-bold text-sm text-[#1b4332]">{titulo(c)}</p>
          <p className="text-[10px] text-slate-500">{subtitulo(c)}</p>
          <p className="font-bold text-base mt-1">N.° {c.numero}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-7 text-[12px]">
        <div className="border border-slate-200 rounded-lg p-3 space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-slate-500">Huésped</p>
          <p className="font-semibold">{c.huesped.nombre}</p>
          {c.huesped.numeroDocumento && <p>{c.huesped.tipoDocumento} {c.huesped.numeroDocumento}</p>}
        </div>
        <div className="border border-slate-200 rounded-lg p-3 space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-slate-500">Estadía</p>
          <p><strong>Habitación {c.habitacion.numero}</strong>{c.habitacion.tipo ? ` · ${c.habitacion.tipo}` : ""}</p>
          <p>Ingreso: {fecha(c.checkin)}</p>
          <p>{c.checkout ? `Salida: ${fecha(c.checkout)}` : `Salida prevista: ${fecha(c.salidaPrevista, false)}`}</p>
        </div>
      </div>

      <table className="w-full mt-7 border-collapse">
        <thead><tr><th className={th}>Concepto</th><th className={`${th} text-right`}>Cant.</th><th className={`${th} text-right`}>Precio</th><th className={`${th} text-right`}>Importe</th></tr></thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-1.5 font-semibold">Alojamiento ({c.alojamiento.noches} noche{c.alojamiento.noches === 1 ? "" : "s"})</td>
            <td className="py-1.5 text-right">{c.alojamiento.noches}</td>
            <td className="py-1.5 text-right">{soles(c.alojamiento.tarifaPorNoche)}</td>
            <td className="py-1.5 text-right font-semibold">{soles(c.alojamiento.total)}</td>
          </tr>
          {c.consumos.map((l, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-1.5">{l.descripcion} <span className="text-slate-400 text-[10px]">{fecha(l.fecha)}</span></td>
              <td className="py-1.5 text-right">{l.cantidad}</td>
              <td className="py-1.5 text-right">{soles(l.precioUnitario)}</td>
              <td className="py-1.5 text-right">{soles(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-4">
        <div className="w-64 text-[12px] space-y-1">
          <Fila izquierda="Alojamiento" derecha={soles(c.alojamiento.total)} />
          <Fila izquierda="Consumos y servicios" derecha={soles(c.totalConsumos)} />
          <div className="border-t border-slate-300 pt-1"><Fila izquierda="TOTAL" derecha={soles(c.total)} negrita /></div>
        </div>
      </div>

      {c.pagos.length > 0 && (
        <>
          <p className="text-[10px] uppercase font-bold text-slate-500 mt-7 mb-1">Pagos recibidos</p>
          <table className="w-full border-collapse">
            <thead><tr><th className={th}>Fecha</th><th className={th}>Concepto</th><th className={th}>Método</th><th className={`${th} text-right`}>Monto</th></tr></thead>
            <tbody>
              {c.pagos.map((p, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5">{fecha(p.fecha)}</td>
                  <td className="py-1.5">{CONCEPTO[p.concepto ?? ""] ?? p.concepto}</td>
                  <td className="py-1.5">{METODO[p.metodo ?? ""] ?? p.metodo}{p.referencia ? ` · ${p.referencia}` : ""}</td>
                  <td className="py-1.5 text-right">{soles(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-2 text-[12px]"><div className="w-64"><Fila izquierda="Total pagado" derecha={soles(c.totalPagado)} negrita /></div></div>
        </>
      )}

      {c.devoluciones.length > 0 && (
        <>
          <p className="text-[10px] uppercase font-bold text-slate-500 mt-6 mb-1">Devolución al huésped</p>
          <table className="w-full border-collapse">
            <thead><tr><th className={th}>Fecha</th><th className={th}>Detalle</th><th className={`${th} text-right`}>Monto</th></tr></thead>
            <tbody>
              {c.devoluciones.map((d, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1.5">{fecha(d.fecha)}</td>
                  <td className="py-1.5">Saldo a favor devuelto en efectivo</td>
                  <td className="py-1.5 text-right">{soles(d.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className={`mt-6 rounded-lg px-4 py-3 flex justify-between items-center border-2 ${saldo.valor > 0 ? "border-amber-500 bg-amber-50" : "border-emerald-600 bg-emerald-50"}`}>
        <span className="font-bold text-sm">{saldo.texto}</span>
        {saldo.valor > 0 && <span className="font-bold text-lg">{soles(saldo.valor)}</span>}
      </div>

      <div className="mt-8 text-[10px] text-slate-500 space-y-0.5">
        <p>Emitido el {fecha(c.emitidoEn)}{c.atendidoPor ? ` · Atendió: ${c.atendidoPor}` : ""}</p>
        <p>{AVISO}</p>
      </div>
      {c.hotel.mensajePie && <p className="text-center font-semibold mt-6 text-[#1b4332]">{c.hotel.mensajePie}</p>}
    </div>
  );
});

export function Comprobante({ formato, datos, nodoRef }: { formato: FormatoComprobante; datos: ComprobanteEstadia; nodoRef?: React.Ref<HTMLDivElement> }) {
  return formato === "TERMICO" ? <TicketTermico ref={nodoRef} datos={datos} /> : <HojaA4 ref={nodoRef} datos={datos} />;
}
