import { ArrowRight } from "lucide-react";
import type { EstadoDeCuenta as Cuenta } from "../../api/consumos";

const soles = (n: number) => `S/ ${Number(n ?? 0).toFixed(2)}`;

/** El folio de la estadia de un vistazo: alojamiento, consumos, pagos y lo que falta por cobrar. */
export function EstadoDeCuenta({ cuenta, onIrAlCheckout }: { cuenta: Cuenta | null; onIrAlCheckout?: () => void }) {
  if (!cuenta) return null;
  const celdas: { titulo: string; valor: string; destacado?: boolean; color?: string }[] = [
    { titulo: "Alojamiento", valor: soles(cuenta.totalAlojamiento) },
    { titulo: "Consumos", valor: soles(cuenta.totalConsumos) },
    { titulo: "Pagado", valor: soles(cuenta.totalPagos), color: "text-emerald-700" },
    { titulo: "Saldo por cobrar", valor: soles(cuenta.saldoPendiente), destacado: true, color: cuenta.saldoPendiente > 0 ? "text-amber-700" : "text-emerald-700" },
  ];
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4" aria-label="Estado de cuenta de la estadía">
      <div className="grid grid-cols-4 gap-4 flex-1">
        {celdas.map((c) => (
          <div key={c.titulo}>
            <p className="text-[10px] text-slate-400 uppercase font-bold">{c.titulo}</p>
            <p className={`${c.destacado ? "text-lg" : "text-sm"} font-bold ${c.color ?? "text-slate-900"}`}>{c.valor}</p>
          </div>
        ))}
      </div>
      {onIrAlCheckout && (
        <button onClick={onIrAlCheckout}
          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 whitespace-nowrap">
          Ir al check-out <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
