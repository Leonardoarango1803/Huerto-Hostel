import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpToLine, Luggage } from "lucide-react";
import { equipajeApi, estadoEquipajeTexto, TIPO_EQUIPAJE, type SolicitudEquipaje } from "../../api/equipaje";
import { mensajeDeError } from "../../api/errores";
import { fechaHora } from "../../utils/fechas";

const tarjeta = "bg-white border border-[#EFE6D6] rounded-[22px]";

const CLASE_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  ASIGNADA: "bg-blue-100 text-blue-800",
  EN_ATENCION: "bg-blue-100 text-blue-800",
  ATENDIDA: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-slate-200 text-slate-600",
};

/**
 * Equipaje del huesped en su portal. Alojado (puedePedir) puede pedir que le suban o bajen las maletas; siempre ve lo
 * que tiene en custodia con su codigo EQ-… (tambien despues del check-out, mientras espera su bus). Sin nada que
 * mostrar y sin poder pedir, no se dibuja.
 */
export function MiEquipaje({ puedePedir }: { puedePedir: boolean }) {
  const [lista, setLista] = useState<SolicitudEquipaje[] | null>(null);
  const [version, setVersion] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  /** Momento de la ultima carga: lo cerrado hace menos de 24 h se sigue mostrando como confirmacion. */
  const [cargadoEn, setCargadoEn] = useState(() => Date.now());

  useEffect(() => {
    let vigente = true;
    equipajeApi
      .mio()
      .then((l) => {
        if (!vigente) return;
        setLista(l);
        setCargadoEn(Date.now());
      })
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, [version]);

  async function pedir(tipo: "SUBIDA" | "BAJADA") {
    setEnviando(true);
    setMensaje(null);
    try {
      await equipajeApi.pedir(tipo, nota.trim() || undefined);
      setMensaje({ tipo: "ok", texto: tipo === "BAJADA" ? "Listo, vamos por tus maletas." : "Listo, te subimos tus maletas." });
      setNota("");
      setVersion((v) => v + 1);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDeError(e, "No pudimos enviar tu pedido. Llama a recepción.") });
    } finally {
      setEnviando(false);
    }
  }

  // Lo vigente: pedidos abiertos y lo que sigue en custodia; mas lo cerrado de las ultimas 24 h como confirmacion.
  const hace24h = cargadoEn - 24 * 3600 * 1000;
  const visibles = (lista ?? []).filter((s) =>
    ["PENDIENTE", "ASIGNADA", "EN_ATENCION"].includes(s.estado)
    || new Date((s.fechaAtencion ?? s.fechaSolicitud) + "-05:00").getTime() > hace24h);
  if (!puedePedir && visibles.length === 0) return null;

  return (
    <section aria-labelledby="h-equipaje" className={`${tarjeta} p-5 sm:p-6 flex flex-col gap-4 max-w-[620px]`}>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-huerto-suave text-huerto flex items-center justify-center"><Luggage size={21} /></span>
        <div>
          <h2 id="h-equipaje" className="m-0 text-lg font-bold">Tu equipaje</h2>
          <p className="m-0 text-[13px] text-slate-600">
            {puedePedir ? "Te ayudamos a subir o bajar tus maletas. Para guardarlas después del check-out, pídelo en recepción." : "Maletas que dejaste guardadas en recepción."}
          </p>
        </div>
      </div>

      {puedePedir && (
        <>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={300}
            placeholder="Nota opcional: hora, cuántas maletas…"
            aria-label="Nota para el pedido de equipaje"
            className="w-full min-h-[46px] px-4 rounded-xl border border-slate-300 bg-white text-[15px]"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={enviando} onClick={() => pedir("BAJADA")}
              className="min-h-[50px] rounded-full bg-huerto hover:bg-huerto-oscuro disabled:opacity-60 text-white font-bold inline-flex items-center justify-center gap-2">
              <ArrowDownToLine size={17} /> Bajar mis maletas
            </button>
            <button type="button" disabled={enviando} onClick={() => pedir("SUBIDA")}
              className="min-h-[50px] rounded-full border border-slate-300 bg-white hover:border-huerto font-bold inline-flex items-center justify-center gap-2">
              <ArrowUpToLine size={17} /> Subir mis maletas
            </button>
          </div>
        </>
      )}

      {mensaje && (
        <div role="status" className={`px-4 py-3 rounded-2xl text-sm font-semibold ${mensaje.tipo === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
          {mensaje.texto}
        </div>
      )}

      {visibles.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-[#F1EADD]">
          {visibles.map((s) => (
            <li key={s.idSolicitud} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <strong className="text-[15px]">{TIPO_EQUIPAJE[s.tipo]} <span className="font-mono text-[13px] text-slate-500">{s.codigo}</span></strong>
                <span className="text-[13px] text-slate-600">{s.descripcion ?? fechaHora(s.fechaSolicitud)}</span>
                {s.tipo === "CUSTODIA" && s.estado === "EN_ATENCION" && (
                  <span className="text-[13px] text-slate-600">Presenta el código <strong>{s.codigo}</strong> en recepción para recogerlas.</span>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${CLASE_ESTADO[s.estado] ?? ""}`}>{estadoEquipajeTexto(s)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
