import { useState } from "react";
import { CreditCard, Smartphone, X, Lock } from "lucide-react";
import { isAxiosError } from "axios";
import { portalApi, type ResultadoPagoPortal } from "../../api/portal";
import { mensajeDeError } from "../../api/errores";

interface Props {
  titulo: string;
  /** Lo que falta pagar: tope y valor por defecto del monto. */
  pendiente: number;
  /** Sin reserva paga el saldo de la estadia en curso. */
  idReserva?: number;
  onCerrar: () => void;
  onPagado: (r: ResultadoPagoPortal) => void;
}

type Metodo = "TARJETA" | "YAPE";

/** Tarjeta de prueba que simula el rechazo (la misma que al reservar en la web). */
const TARJETA_RECHAZO = "4000000000000002";

const campo = "w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-huerto/40";
const etiqueta = "flex flex-col gap-1.5 text-sm font-semibold text-slate-700";
const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/**
 * Pago en linea desde el portal del huesped (RF24) con la pasarela de demostracion: tarjeta o Yape/Plin. Ningun dato
 * de la tarjeta sale del navegador; solo se avisa al servidor si es la tarjeta de prueba del rechazo.
 */
export function PagarEnLineaModal({ titulo, pendiente, idReserva, onCerrar, onPagado }: Props) {
  const [metodo, setMetodo] = useState<Metodo>("TARJETA");
  const [monto, setMonto] = useState(pendiente.toFixed(2));
  const [tarjeta, setTarjeta] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rechazado, setRechazado] = useState(false);

  const valor = Number(monto);

  function problema(): string | null {
    if (!Number.isFinite(valor) || valor <= 0) return "Escribe un monto mayor a cero.";
    if (valor > pendiente + 0.001) return `El monto no puede superar lo pendiente (${soles(pendiente)}).`;
    if (metodo === "TARJETA") {
      if (tarjeta.replace(/\D/g, "").length < 13) return "Revisa el número de tarjeta.";
      if (!/^\d{2}\s*\/\s*\d{2}$/.test(vencimiento.trim())) return "Escribe el vencimiento como MM / AA.";
      if (!/^\d{3,4}$/.test(cvv.trim())) return "Revisa el CVV.";
    } else if (codigo.trim().length < 4) {
      return "Ingresa el código de operación de Yape o Plin.";
    }
    return null;
  }

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    const p = problema();
    if (p) {
      setError(p);
      return;
    }
    setEnviando(true);
    setError(null);
    setRechazado(false);
    try {
      const r = await portalApi.pagar({
        idReserva,
        monto: Math.round(valor * 100) / 100,
        metodo,
        codigoOperacion: metodo === "YAPE" ? codigo.trim() : undefined,
        simularRechazo: metodo === "TARJETA" && tarjeta.replace(/\D/g, "") === TARJETA_RECHAZO,
      });
      onPagado(r);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 402) {
        setRechazado(true);
        setTarjeta("");
      } else {
        setError(mensajeDeError(err, "No pudimos procesar el pago. Inténtalo de nuevo."));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-tinta/45" onClick={onCerrar} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="h-pagar"
        onSubmit={pagar}
        noValidate
        className="relative bg-white w-full sm:max-w-[480px] rounded-t-[22px] sm:rounded-[22px] shadow-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="h-pagar" className="m-0 font-display text-2xl font-semibold">{titulo}</h2>
            <p className="m-0 mt-1 text-sm text-slate-600">Pendiente: <strong className="text-tinta">{soles(pendiente)}</strong></p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <label className={etiqueta}>Monto a pagar (S/)
          <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" className={campo} />
        </label>

        <div role="group" aria-label="Método de pago" className="grid grid-cols-2 gap-2.5">
          {([["TARJETA", "Tarjeta", CreditCard], ["YAPE", "Yape / Plin", Smartphone]] as const).map(([m, texto, Icono]) => (
            <button
              key={m}
              type="button"
              aria-pressed={metodo === m}
              onClick={() => { setMetodo(m); setError(null); setRechazado(false); }}
              className={`min-h-[52px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 ${
                metodo === m ? "bg-huerto-suave text-emerald-800 border-2 border-huerto" : "bg-white border border-slate-300"
              }`}
            >
              <Icono size={19} /> {texto}
            </button>
          ))}
        </div>

        {metodo === "TARJETA" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className={`${etiqueta} col-span-2`}>Número de tarjeta
              <input value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className={`${campo} tracking-wider`} />
            </label>
            <label className={etiqueta}>Vencimiento
              <input value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} autoComplete="cc-exp" placeholder="MM / AA" className={campo} />
            </label>
            <label className={etiqueta}>CVV
              <input value={cvv} onChange={(e) => setCvv(e.target.value)} inputMode="numeric" autoComplete="cc-csc" placeholder="123" className={campo} />
            </label>
            <p className="col-span-2 m-0 text-[12px] text-slate-600">
              Pasarela de demostración: los datos de la tarjeta no salen de tu navegador. Para probar un rechazo usa 4000 0000 0000 0002.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-arena rounded-2xl p-4 text-sm">
            <strong>Yapea o plinea {Number.isFinite(valor) && valor > 0 ? soles(valor) : ""} al hostel</strong>
            <span className="text-slate-600">Luego escribe el código de operación que te muestra la app.</span>
            <label className={etiqueta}>Código de operación
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" placeholder="Ej. 01234567" className={campo} />
            </label>
          </div>
        )}

        {rechazado && (
          <div role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm font-semibold">
            Tu banco no aprobó el pago. No se cobró nada: prueba con otra tarjeta o paga con Yape.
          </div>
        )}
        {error && <div role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm font-semibold">{error}</div>}

        <button
          type="submit"
          disabled={enviando}
          className="min-h-[52px] rounded-full bg-terracota hover:bg-terracota-oscuro disabled:opacity-60 text-white text-base font-bold flex items-center justify-center gap-2"
        >
          <Lock size={17} /> {enviando ? "Procesando…" : `Pagar ${Number.isFinite(valor) && valor > 0 ? soles(valor) : ""}`}
        </button>
      </form>
    </div>
  );
}
