import { useNavigate, useLocation } from "react-router-dom";
import { LockKeyhole, AlertTriangle } from "lucide-react";
import { useCaja } from "../context/CajaContext";

/**
 * Aviso permanente del estado de la caja, solo para los roles que la usan (el contexto no
 * carga estado para los demas). Cerrada: explica que se bloquea y lleva a abrirla.
 */
export function CajaBanner() {
  const { estado, cajaCerrada } = useCaja();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!estado) return null;

  if (cajaCerrada) {
    return (
      <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
        <span className="flex items-center gap-2.5">
          <LockKeyhole size={16} />
          <span>
            <strong>La caja esta cerrada.</strong> No se pueden registrar adelantos, check-in ni cobros
            hasta que alguien abra el turno.
          </span>
        </span>
        {pathname !== "/caja" && (
          <button
            onClick={() => navigate("/caja")}
            className="rounded-xl bg-huerto px-4 min-h-[38px] font-bold text-white hover:bg-huerto-oscuro"
          >
            Abrir caja
          </button>
        )}
      </div>
    );
  }

  if (estado.excedeLimite) {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900" role="alert">
        <span className="flex items-center gap-2.5">
          <AlertTriangle size={16} />
          <span>
            <strong>La caja lleva {estado.horasAbierta} h abierta</strong>
            {estado.abiertaPor ? ` (la abrio ${estado.abiertaPor})` : ""}: parece que se olvido cerrar. Cuenta el efectivo y cierrala; si no esta
            quien la abrio, el administrador puede forzar el cierre.
          </span>
        </span>
        {pathname !== "/caja" && (
          <button onClick={() => navigate("/caja")} className="rounded-xl bg-red-700 px-4 min-h-[38px] font-bold text-white hover:bg-red-800">
            Ir a Caja
          </button>
        )}
      </div>
    );
  }

  // Caja abierta y en regla: el estado se ve en la tarjeta del menu lateral, no hace falta otro aviso.
  return null;
}
