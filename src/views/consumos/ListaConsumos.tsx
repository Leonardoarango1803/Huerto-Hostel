import { useState } from "react";
import { Ban, ChevronDown, ChevronRight } from "lucide-react";
import { FormField, FormModal, Textarea } from "../../components/ui";
import { consumosApi, type ConsumoAnulado, type ConsumoEstadia, type Persona } from "../../api/consumos";
import { mensajeDeError } from "../../api/errores";

const soles = (n: number) => `S/ ${Number(n ?? 0).toFixed(2)}`;
const fecha = (iso?: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");
const nombre = (p?: Persona | null) => (p ? `${p.nombres} ${p.apellidos}`.trim() : "—");

const ORIGEN: Record<string, { texto: (c: ConsumoEstadia) => string; estilo: string }> = {
  COMANDA: { texto: (c) => `Comanda #${c.comanda?.idComanda ?? "?"}`, estilo: "bg-blue-100 text-blue-800" },
  DIRECTO: { texto: () => "Recepción", estilo: "bg-slate-100 text-slate-700" },
  SOLICITUD: { texto: () => "Pedido del huésped", estilo: "bg-purple-100 text-purple-800" },
};

function AnularModal({ idEstadia, consumo, onCerrar, onHecho, onError }: {
  idEstadia: number;
  consumo: ConsumoEstadia;
  onCerrar: () => void;
  onHecho: () => void;
  onError: (mensaje: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) {
      onError("Explica por qué se anula el consumo.");
      return;
    }
    setGuardando(true);
    try {
      await consumosApi.anular(idEstadia, consumo.idConsumo, motivo.trim());
      onHecho();
    } catch (e) {
      onError(mensajeDeError(e, "No se pudo anular el consumo."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title="Anular consumo"
      subtitle={`${consumo.producto?.nombre ?? "Consumo"} × ${consumo.cantidad} — ${soles(consumo.totalConsumo)}`}
      submitLabel="Anular consumo" loading={guardando} onClose={onCerrar} onSubmit={confirmar} size="sm">
      <FormField label="Motivo" required>
        <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo de la anulación"
          placeholder="Ej.: me equivoqué de producto; el huésped lo rechazó" />
      </FormField>
      <p className="text-[11px] text-slate-500">
        El cargo sale del folio (el saldo baja), los insumos que descontó vuelven al almacén y queda la constancia de quién lo
        anuló y por qué.
      </p>
    </FormModal>
  );
}

interface Props {
  idEstadia: number;
  consumos: ConsumoEstadia[];
  anulados: ConsumoAnulado[];
  cargando: boolean;
  puedeAnular: boolean;
  onCambio: (mensaje: string) => void;
  onError: (mensaje: string) => void;
}

/** Lo cargado al folio, con su origen y quien lo registro; los de recepcion y de pedidos se pueden anular con motivo. */
export function ListaConsumos({ idEstadia, consumos, anulados, cargando, puedeAnular, onCambio, onError }: Props) {
  const [aAnular, setAAnular] = useState<ConsumoEstadia | null>(null);
  const [verAnulados, setVerAnulados] = useState(false);
  const total = consumos.reduce((s, c) => s + Number(c.totalConsumo), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <span className="font-bold text-slate-700 text-xs">Consumos registrados ({consumos.length})</span>
        {consumos.length > 0 && <span className="text-[11px] font-bold text-slate-800">Total: {soles(total)}</span>}
      </div>
      {cargando ? (
        <p className="p-4 text-center text-slate-400 text-xs">Cargando consumos...</p>
      ) : consumos.length === 0 ? (
        <p className="p-4 text-center text-slate-400 text-xs">Sin consumos registrados aún.</p>
      ) : (
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="p-3">Producto</th>
              <th className="p-3 text-center">Cant.</th>
              <th className="p-3 text-right">P. unit.</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Origen</th>
              <th className="p-3">Registró</th>
              <th className="p-3">Fecha</th>
              {puedeAnular && <th className="p-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consumos.map((c) => {
              const o = ORIGEN[c.origen] ?? ORIGEN.DIRECTO;
              return (
                <tr key={c.idConsumo} className="hover:bg-slate-50">
                  <td className="p-3">
                    <p className="font-semibold text-slate-800">{c.producto?.nombre ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">{c.producto?.categoria}</p>
                  </td>
                  <td className="p-3 text-center font-bold">{c.cantidad}</td>
                  <td className="p-3 text-right text-slate-600">{soles(c.precioUnitario)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{soles(c.totalConsumo)}</td>
                  <td className="p-3"><span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${o.estilo}`}>{o.texto(c)}</span></td>
                  <td className="p-3 text-slate-500">{nombre(c.empleadoRegistra)}</td>
                  <td className="p-3 text-slate-400">{fecha(c.fechaRegistro)}</td>
                  {puedeAnular && (
                    <td className="p-3 text-right">
                      {c.origen !== "COMANDA" ? (
                        <button onClick={() => setAAnular(c)} aria-label={`Anular ${c.producto?.nombre ?? "consumo"} ${c.idConsumo}`}
                          className="text-[10px] font-semibold text-red-700 hover:text-red-900 inline-flex items-center gap-1">
                          <Ban size={11} /> Anular
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300" title="Se gestiona desde Comandas">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {anulados.length > 0 && (
        <div className="border-t border-slate-100">
          <button onClick={() => setVerAnulados((v) => !v)} aria-expanded={verAnulados}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
            {verAnulados ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Consumos anulados ({anulados.length})
          </button>
          {verAnulados && (
            <table className="w-full text-left text-xs border-collapse">
              <tbody className="divide-y divide-slate-100">
                {anulados.map((a) => (
                  <tr key={a.idAnulacion} className="bg-slate-50/50">
                    <td className="p-3">
                      <p className="font-semibold text-slate-600 line-through">{a.producto?.nombre ?? "—"} × {a.cantidad}</p>
                      <p className="text-[10px] text-slate-400">{soles(a.totalConsumo)}</p>
                    </td>
                    <td className="p-3 text-slate-600">{a.motivo}</td>
                    <td className="p-3 text-slate-400 text-[10px]">
                      Anuló {nombre(a.empleadoAnula)}<br />{fecha(a.fechaAnulacion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {aAnular && (
        <AnularModal idEstadia={idEstadia} consumo={aAnular} onCerrar={() => setAAnular(null)} onError={onError}
          onHecho={() => { setAAnular(null); onCambio("Consumo anulado: salió del folio y los insumos volvieron al almacén."); }} />
      )}
    </div>
  );
}
