import { AlertTriangle, Lock } from "lucide-react";
import type { IncidenciaDeHabitacion } from "../api/types";
import { NOMBRE_TIPO } from "../utils/incidencias";

/** Aviso de que la habitacion tiene incidencias abiertas: rojo si la bloquean, ambar si es menor y sigue a la venta. */
export function AvisoIncidencia({ inc, className = "" }: { inc?: IncidenciaDeHabitacion; className?: string }) {
  if (!inc) return null;
  const detalle = inc.detalle
    .slice(0, 2)
    .map((d) => {
      const [tipo, ...resto] = d.split(": ");
      return `${NOMBRE_TIPO(tipo)}: ${resto.join(": ")}`;
    })
    .join(" · ");
  const mas = inc.detalle.length > 2 ? ` (+${inc.detalle.length - 2} más)` : "";
  return inc.bloquea ? (
    <p role="status" className={`text-[10px] text-red-800 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 flex items-start gap-1.5 ${className}`}>
      <Lock size={11} className="mt-0.5 shrink-0" />
      <span><strong>Bloqueada por incidencia.</strong> {detalle}{mas}</span>
    </p>
  ) : (
    <p role="status" className={`text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 flex items-start gap-1.5 ${className}`}>
      <AlertTriangle size={11} className="mt-0.5 shrink-0" />
      <span><strong>Incidencia abierta (no bloquea).</strong> {detalle}{mas}. Se puede usar; avisa al huésped o elige otra.</span>
    </p>
  );
}
