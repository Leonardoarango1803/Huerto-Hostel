import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, LockKeyhole } from "lucide-react";
import { useCaja } from "../context/CajaContext";

function formatoApertura(fecha?: string) {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
        <span className="flex items-center gap-2">
          <LockKeyhole size={14} />
          <span>
            <strong>La caja esta cerrada.</strong> No se pueden registrar adelantos, check-in ni cobros
            hasta que alguien abra el turno.
          </span>
        </span>
        {pathname !== "/caja" && (
          <button
            onClick={() => navigate("/caja")}
            className="rounded-md bg-[#1b4332] px-3 py-1 font-semibold text-white hover:bg-[#143427]"
          >
            Abrir caja
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2 text-[11px] text-emerald-800">
      <Wallet size={12} />
      <span>
        Caja abierta{estado.abiertaPor ? ` por ${estado.abiertaPor}` : ""}
        {estado.fechaApertura ? ` desde ${formatoApertura(estado.fechaApertura)}` : ""}
      </span>
    </div>
  );
}
