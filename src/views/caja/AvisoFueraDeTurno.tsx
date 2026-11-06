import { Clock } from "lucide-react";
import type { AvisoTurno } from "../../api/types";

/** Aviso (no bloquea): quien opera la caja esta fuera del horario de su turno. Queda registrado quien la abrio o cerro. */
export function AvisoFueraDeTurno({ turno, accion }: { turno: AvisoTurno | null | undefined; accion: "abrir" | "cerrar" }) {
  if (!turno || turno.enCurso) return null;
  return (
    <p role="status" className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-2 flex items-start gap-1.5">
      <Clock size={13} className="mt-0.5 shrink-0" />
      <span>
        Vas a {accion === "abrir" ? "abrir" : "cerrar"} la caja fuera de tu turno ({turno.nombre}, {turno.horaInicio}–{turno.horaFin}).
        Puedes continuar si corresponde; queda registrado quién la {accion === "abrir" ? "abrió" : "cerró"}.
      </span>
    </p>
  );
}
