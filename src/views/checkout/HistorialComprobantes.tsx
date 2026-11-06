import { useEffect, useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { estadiasApi } from "../../api/estadias";
import { mensajeDeError } from "../../api/errores";
import type { Estadia } from "../../api/types";
import { Badge, Button, EmptyState, LoadingState } from "../../components/ui";

const DIAS = 30;

function fechaHora(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Estadias que ya salieron (ultimos 30 dias): para reimprimir o reenviar el comprobante a un huesped. */
export function HistorialComprobantes({ busqueda, onVer }: { busqueda: string; onVer: (idEstadia: number) => void }) {
  const [estadias, setEstadias] = useState<Estadia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Fecha desde la que se muestran las salidas: se fija al abrir la pestana.
  const [limite] = useState(() => Date.now() - DIAS * 86400000);

  useEffect(() => {
    let vigente = true;
    estadiasApi.listar("FINALIZADA")
      .then((d) => vigente && setEstadias(d))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudieron cargar las estadías finalizadas.")));
    return () => { vigente = false; };
  }, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (estadias ?? [])
      .filter((e) => !e.fechaCheckoutReal || new Date(e.fechaCheckoutReal).getTime() >= limite)
      .filter((e) => !q || `${e.reserva.cliente.nombres} ${e.reserva.cliente.apellidos}`.toLowerCase().includes(q)
        || e.reserva.cliente.numeroDocumento.includes(q) || e.habitacion.numero.toLowerCase().includes(q))
      .sort((a, b) => String(b.fechaCheckoutReal ?? "").localeCompare(String(a.fechaCheckoutReal ?? "")));
  }, [estadias, busqueda, limite]);

  if (error) return <p className="p-4 text-xs text-red-700">{error}</p>;
  if (!estadias) return <LoadingState />;
  if (visibles.length === 0) {
    return <EmptyState title="Sin salidas recientes" description={`No hay estadías finalizadas en los últimos ${DIAS} días.`}
      icon={<ReceiptText size={28} className="text-slate-300" />} />;
  }
  return (
    <div className="divide-y divide-slate-100" aria-label="Estadías finalizadas">
      {visibles.map((e) => (
        <div key={e.idEstadia} className="p-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 flex items-center gap-2">
              {e.reserva.cliente.nombres} {e.reserva.cliente.apellidos}
              {e.salidaForzada && <Badge variant="red" label={`Salió con deuda S/ ${Number(e.saldoAlSalir ?? 0).toFixed(2)}`} />}
            </p>
            <p className="text-[10px] text-slate-500">
              Hab. {e.habitacion.numero} · {e.reserva.cliente.tipoDocumento} {e.reserva.cliente.numeroDocumento} · Salió {fechaHora(e.fechaCheckoutReal)}
            </p>
            {e.salidaForzada && e.motivoSalidaForzada && (
              <p className="text-[10px] text-red-700">Motivo: {e.motivoSalidaForzada}</p>
            )}
          </div>
          <Button size="sm" variant="secondary" icon={<ReceiptText size={11} />} onClick={() => onVer(e.idEstadia)}
            title={`Comprobante de la estadía ${e.idEstadia}`}>
            Comprobante
          </Button>
        </div>
      ))}
    </div>
  );
}
