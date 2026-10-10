interface SaldoPanelProps {
  alojamiento: number;
  consumos: number;
  pagos: number;
  className?: string;
}

function formatSoles(amount: number) {
  return `S/ ${amount.toFixed(2)}`;
}

export function SaldoPanel({ alojamiento, consumos, pagos, className = "" }: SaldoPanelProps) {
  const total = alojamiento + consumos;
  const saldo = total - pagos;

  return (
    <div className={`bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs ${className}`}>
      <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Resumen de Folio</p>

      <div className="space-y-1.5">
        <div className="flex justify-between text-slate-600">
          <span>Alojamiento</span>
          <span className="font-semibold">{formatSoles(alojamiento)}</span>
        </div>
        {consumos > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Consumos</span>
            <span className="font-semibold">{formatSoles(consumos)}</span>
          </div>
        )}
        <div className="border-t border-slate-200 pt-1.5 flex justify-between text-slate-700 font-semibold">
          <span>Total</span>
          <span>{formatSoles(total)}</span>
        </div>
        {pagos > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Pagos recibidos</span>
            <span className="font-semibold">− {formatSoles(pagos)}</span>
          </div>
        )}
      </div>

      <div
        className={`flex justify-between font-bold text-sm border-t pt-2 ${
          saldo <= 0 ? "text-emerald-700" : "text-red-700"
        }`}
      >
        <span>{saldo <= 0 ? "Saldo pagado" : "Saldo pendiente"}</span>
        <span>{formatSoles(Math.abs(saldo))}</span>
      </div>
    </div>
  );
}
