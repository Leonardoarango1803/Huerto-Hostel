import { Check } from "lucide-react";

const PASOS = ["Elige tu habitación", "Tus datos y adelanto", "Confirmación"];

/** Indicador de los 3 pasos de la reserva web. */
export function PasosReserva({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Pasos de la reserva" className="m-0 p-0 list-none flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
      {PASOS.map((p, i) => {
        const n = i + 1;
        const hecho = n < actual;
        const enCurso = n === actual;
        return (
          <li key={p} aria-current={enCurso ? "step" : undefined} className={`flex items-center gap-2 ${hecho || enCurso ? "text-huerto" : "text-slate-600"}`}>
            <span
              className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] ${
                enCurso ? "bg-huerto text-white" : hecho ? "bg-huerto-suave text-emerald-800" : "border-[1.5px] border-slate-400"
              }`}
            >
              {hecho ? <Check size={14} strokeWidth={3} /> : n}
            </span>
            {p}
          </li>
        );
      })}
    </ol>
  );
}
