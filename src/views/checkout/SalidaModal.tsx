import { useMemo, useState } from "react";
import { estadiasApi } from "../../api/estadias";
import { esCajaCerrada, mensajeDeError } from "../../api/errores";
import type { Estadia, SaldoResponse } from "../../api/types";
import { AlertBanner, FormField, FormModal, Input, Select, Textarea } from "../../components/ui";

interface Props {
  estadia: Estadia;
  folio: SaldoResponse;
  /** Una incidencia abierta bloquea la habitacion: al salir iria a mantenimiento y no a limpieza. */
  habitacionBloqueada: boolean;
  cajaCerrada: boolean;
  esAdmin: boolean;
  onCerrar: () => void;
  /** La salida se hizo: la pantalla abre el comprobante y recarga. */
  onHecho: (idEstadia: number, final: Estadia) => void;
  onCajaCerrada: () => void;
}

const centimos = (n: number) => Math.round(Number(n) * 100);
const soles = (n: number) => `S/ ${Math.abs(Number(n)).toFixed(2)}`;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Una sola pantalla para todas las formas de salir: con la cuenta saldada, cobrando el saldo, devolviendo un saldo a favor, o
 * (solo el administrador) dejando una deuda. Si el huesped se va antes o se quedo de mas se puede ajustar las noches, y se
 * muestra lo que sigue abierto (comandas, solicitudes) antes de cerrar el folio.
 */
export function SalidaModal({ estadia, folio, habitacionBloqueada, cajaCerrada, esAdmin, onCerrar, onHecho, onCajaCerrada }: Props) {
  const [ajustar, setAjustar] = useState(false);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [monto, setMonto] = useState("");
  const [conDeuda, setConDeuda] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayAjuste = folio.noches > 0 && folio.nochesReales !== folio.noches;
  const ajuste = ajustar && hayAjuste ? Number(folio.ajusteNoches) : 0;
  const saldoFinal = (centimos(folio.saldoPendiente) + centimos(ajuste)) / 100;
  const debe = saldoFinal > 0;
  const aFavor = saldoFinal < 0;

  // Lo que se cobra: por defecto todo el saldo; si el campo esta vacio o es 0, nada.
  const montoNum = monto === "" ? (debe ? saldoFinal : 0) : Number(monto);
  const cobraAlgo = debe && montoNum > 0;
  const quedaDebiendo = debe && centimos(montoNum) < centimos(saldoFinal);
  const necesitaCaja = cobraAlgo || aFavor;
  const faltaMotivo = quedaDebiendo && conDeuda && motivo.trim() === "";
  const quedaDeuda = quedaDebiendo && !conDeuda;

  const destino = habitacionBloqueada
    ? "La habitación irá a mantenimiento porque tiene una incidencia abierta que la bloquea."
    : "La habitación pasará a Pendiente de limpieza.";

  const avisos = useMemo(() => {
    const lista: { tipo: "warning" | "info"; texto: string }[] = [];
    if (folio.comandasActivas > 0) {
      lista.push({ tipo: "warning", texto: `Hay ${plural(folio.comandasActivas, "comanda", "comandas")} sin entregar: se cargan al folio al entregarse, así que el total puede subir. Resuélvelas antes de cerrar.` });
    }
    if (folio.solicitudesCobrablesPendientes > 0) {
      lista.push({ tipo: "warning", texto: `Hay ${plural(folio.solicitudesCobrablesPendientes, "solicitud cobrable", "solicitudes cobrables")} sin atender: su monto todavía no está en el folio.` });
    }
    const otras = folio.solicitudesPendientes - folio.solicitudesCobrablesPendientes;
    if (otras > 0) {
      lista.push({ tipo: "info", texto: `Quedan ${plural(otras, "solicitud", "solicitudes")} del huésped sin atender.` });
    }
    return lista;
  }, [folio]);

  const enviar = async () => {
    setError(null);
    if (debe && quedaDebiendo && !esAdmin) {
      setError("Cobra el saldo completo para cerrar la cuenta. Solo un administrador puede autorizar una salida con deuda.");
      return;
    }
    if (quedaDeuda && esAdmin) {
      setError("El monto no cubre el saldo. Marca \"Autorizar salida con saldo pendiente\" o cobra el saldo completo.");
      return;
    }
    if (faltaMotivo) {
      setError("Explica por qué se autoriza la salida con saldo pendiente.");
      return;
    }
    if (Number.isNaN(montoNum) || montoNum < 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    setCargando(true);
    try {
      const cuerpo: Record<string, unknown> = {
        ajustarNoches: ajustar && hayAjuste,
        devolverSaldo: aFavor,
        forzar: quedaDebiendo && conDeuda,
        motivo: motivo.trim() || undefined,
      };
      if (cobraAlgo) {
        cuerpo.metodoPago = metodoPago;
        cuerpo.monto = montoNum;
        cuerpo.concepto = "LIQUIDACION_CHECKOUT";
      }
      const final = (await estadiasApi.checkout(estadia.idEstadia, cuerpo)) as Estadia;
      onHecho(estadia.idEstadia, final);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo completar la salida. Revisa el saldo e intenta de nuevo."));
      if (esCajaCerrada(e)) onCajaCerrada();
    } finally {
      setCargando(false);
    }
  };

  const etiqueta = aFavor ? "Devolver y dar salida" : cobraAlgo ? "Cobrar y dar salida" : quedaDebiendo ? "Dar salida con deuda" : "Dar salida";

  return (
    <FormModal
      open
      title="Procesar salida"
      subtitle={`${estadia.reserva.cliente.nombres} ${estadia.reserva.cliente.apellidos} — Hab. ${estadia.habitacion.numero}`}
      submitLabel={etiqueta}
      loading={cargando}
      submitDisabled={(necesitaCaja && cajaCerrada) || faltaMotivo}
      onClose={onCerrar}
      onSubmit={enviar}
      size="md"
    >
      {error && <AlertBanner type="error" message={error} dismissible={false} />}
      {necesitaCaja && cajaCerrada && (
        <AlertBanner type="warning" dismissible={false}
          message={aFavor ? "La caja está cerrada: abre el turno para devolver el saldo a favor en efectivo." : "La caja está cerrada: abre el turno para cobrar el saldo."} />
      )}
      {avisos.map((a) => <AlertBanner key={a.texto} type={a.tipo} message={a.texto} dismissible={false} />)}

      {hayAjuste && (
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs cursor-pointer">
          <input type="checkbox" checked={ajustar} onChange={(e) => { setAjustar(e.target.checked); setMonto(""); }} className="mt-0.5" />
          <span>
            <strong>{folio.nochesReales < folio.noches
              ? `Salida anticipada: reservó ${plural(folio.noches, "noche", "noches")} y usó ${plural(folio.nochesReales, "noche", "noches")}.`
              : `Se quedó de más: reservó ${plural(folio.noches, "noche", "noches")} y lleva ${plural(folio.nochesReales, "noche", "noches")}.`}</strong>
            <span className="block text-slate-600 mt-0.5">
              Cobrar solo las noches usadas ({soles(folio.tarifaPorNoche)} por noche):{" "}
              {folio.nochesReales < folio.noches ? "baja" : "sube"} el alojamiento en {soles(folio.ajusteNoches)}.
              Si no lo marcas, se cobra lo reservado.
            </span>
          </span>
        </label>
      )}

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Alojamiento{ajustar && hayAjuste ? ` (${plural(folio.nochesReales, "noche", "noches")})` : ""}</span>
          <span className="font-semibold">{soles(Number(folio.totalAlojamiento) + ajuste)}</span>
        </div>
        <div className="flex justify-between text-slate-600"><span>Consumos</span><span className="font-semibold">{soles(folio.totalConsumos)}</span></div>
        <div className="flex justify-between text-emerald-700"><span>Ya pagado</span><span className="font-semibold">− {soles(folio.totalPagos)}</span></div>
        {Number(folio.totalDevuelto) > 0 && (
          <div className="flex justify-between text-slate-600"><span>Ya devuelto</span><span className="font-semibold">+ {soles(folio.totalDevuelto)}</span></div>
        )}
        <div className={`flex justify-between font-bold text-sm border-t pt-2 ${aFavor ? "text-blue-700" : debe ? "text-red-700" : "text-emerald-700"}`}>
          <span>{aFavor ? "Saldo a favor del huésped" : debe ? "Saldo pendiente a cobrar" : "Cuenta saldada"}</span>
          <span>{soles(saldoFinal)}</span>
        </div>
      </div>

      {aFavor && (
        <AlertBanner type="info" dismissible={false}
          message={`Se devolverán ${soles(saldoFinal)} en efectivo de la caja y quedará registrado en el turno. Entrégaselos al huésped antes de que salga.`} />
      )}

      {debe && (
        <>
          <FormField label="Método de pago" required>
            <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} aria-label="Método de pago">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA_POS">Tarjeta POS</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="PASARELA_ONLINE">Pasarela Online</option>
            </Select>
          </FormField>
          <FormField label="Monto a cobrar (S/)" required>
            <Input type="number" step="0.01" min="0" aria-label="Monto a cobrar"
              value={monto === "" ? saldoFinal.toFixed(2) : monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
          </FormField>
          {esAdmin && (
            <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs cursor-pointer">
              <input type="checkbox" checked={conDeuda} className="mt-0.5"
                onChange={(e) => { setConDeuda(e.target.checked); setMonto(e.target.checked ? "0" : ""); }} />
              <span>
                <strong>Autorizar salida con saldo pendiente</strong>
                <span className="block text-slate-600 mt-0.5">
                  Solo administrador. Lo que no se cobre queda registrado como deuda de esta estadía, con tu motivo.
                </span>
              </span>
            </label>
          )}
          {esAdmin && conDeuda && (
            <FormField label="Motivo de la salida con deuda" required>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} rows={2}
                placeholder="Ej.: pagará por transferencia mañana; se le avisó al encargado" aria-label="Motivo de la salida con deuda" />
            </FormField>
          )}
        </>
      )}

      <p className="text-[11px] text-slate-500">{destino}</p>
    </FormModal>
  );
}
