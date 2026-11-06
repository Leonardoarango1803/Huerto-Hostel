import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileDown, Image as ImagenIcono, Printer, ReceiptText, X } from "lucide-react";
import { comprobanteApi, type ComprobanteEstadia } from "../../api/comprobante";
import { mensajeDeError } from "../../api/errores";
import { Button } from "../../components/ui";
import { descargarImagen, descargarPdf, imprimirComprobante, type FormatoComprobante } from "../../utils/exportarComprobante";
import { Comprobante } from "./Ticket";

interface Props {
  idEstadia: number;
  onCerrar: () => void;
}

const FORMATOS: { id: FormatoComprobante; texto: string; detalle: string }[] = [
  { id: "TERMICO", texto: "Ticket 80 mm", detalle: "Impresora de recibos térmica" },
  { id: "A4", texto: "Hoja A4", detalle: "Tamaño normal de hoja" },
];

/**
 * Comprobante de la estadia para entregar al huesped: ticket de 80 mm (impresora termica) u hoja A4, con imprimir, PDF e
 * imagen. Con la estadia en curso es una pre-cuenta; ya cerrada, el comprobante del pago.
 */
export function ComprobanteModal({ idEstadia, onCerrar }: Props) {
  const [datos, setDatos] = useState<ComprobanteEstadia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formato, setFormato] = useState<FormatoComprobante>("TERMICO");
  const [haciendo, setHaciendo] = useState<"pdf" | "imagen" | null>(null);
  const nodo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    comprobanteApi.de(idEstadia)
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudo generar el comprobante.")));
    return () => { vigente = false; };
  }, [idEstadia]);

  const nombreBase = datos ? `${datos.numero}-${formato === "TERMICO" ? "ticket" : "a4"}` : "comprobante";

  const exportar = async (tipo: "pdf" | "imagen") => {
    if (!nodo.current) return;
    setHaciendo(tipo);
    setError(null);
    try {
      if (tipo === "pdf") await descargarPdf(nodo.current, formato, nombreBase);
      else await descargarImagen(nodo.current, nombreBase);
    } catch {
      setError("No se pudo generar el archivo. Prueba con Imprimir y elige \"Guardar como PDF\".");
    } finally {
      setHaciendo(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-imprimir" role="dialog" aria-label="Comprobante de la estadía">
        <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
        <div className={`relative bg-white rounded-xl shadow-xl w-full ${formato === "A4" ? "max-w-[900px]" : "max-w-[460px]"} max-h-[94vh] flex flex-col`}>
          <div className="flex items-start justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center"><ReceiptText size={15} /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {datos?.tipo === "PRE_CUENTA" ? "Estado de cuenta (pre-cuenta)" : "Comprobante de la estadía"}
                </h2>
                <p className="text-[11px] text-slate-500">{datos ? `N.° ${datos.numero}` : "Generando..."}</p>
              </div>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar comprobante" className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          <div className="px-4 pt-3 flex gap-2" role="tablist" aria-label="Formato del comprobante">
            {FORMATOS.map((f) => (
              <button key={f.id} role="tab" aria-selected={formato === f.id} onClick={() => setFormato(f.id)}
                className={`flex-1 text-left border rounded-lg px-3 py-2 ${formato === f.id ? "border-[#1b4332] bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="block text-xs font-semibold text-slate-800">{f.texto}</span>
                <span className="block text-[10px] text-slate-500">{f.detalle}</span>
              </button>
            ))}
          </div>

          {error && <p role="alert" className="mx-4 mt-3 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="p-4 overflow-auto flex-1 bg-slate-100 mt-3 flex justify-center">
            {datos ? (
              <div className="shadow-md self-start"><Comprobante formato={formato} datos={datos} nodoRef={nodo} /></div>
            ) : !error ? (
              <p className="text-xs text-slate-400 py-10">Generando comprobante...</p>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 p-3 border-t border-slate-200">
            <Button variant="secondary" icon={<ImagenIcono size={13} />} disabled={!datos} loading={haciendo === "imagen"} onClick={() => exportar("imagen")}>
              Descargar imagen
            </Button>
            <Button variant="secondary" icon={<FileDown size={13} />} disabled={!datos} loading={haciendo === "pdf"} onClick={() => exportar("pdf")}>
              Descargar PDF
            </Button>
            <Button icon={<Printer size={13} />} disabled={!datos} onClick={() => imprimirComprobante(formato)}>
              Imprimir {formato === "TERMICO" ? "ticket" : "hoja A4"}
            </Button>
          </div>
        </div>
      </div>

      {/* Copia solo para imprimir: fuera de la app, para que al papel llegue unicamente el comprobante. */}
      {datos && createPortal(
        <div id="comprobante-impresion"><Comprobante formato={formato} datos={datos} /></div>,
        document.body
      )}
    </>
  );
}
