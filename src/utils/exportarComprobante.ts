/**
 * Salidas del comprobante sin impresora ni servidor de archivos: imprimir (o "guardar como PDF" desde el dialogo del
 * navegador), bajar un PDF y bajar una imagen. Las librerias se cargan solo al usarlas.
 *
 * El ticket termico mide 80 mm de ancho (el estandar de las impresoras de recibos): cuando haya una, basta imprimir el
 * mismo documento desde el navegador. El PDF y la imagen salen del mismo diseno que se ve en pantalla.
 */

export type FormatoComprobante = "TERMICO" | "A4";

/** 80 mm y 210 mm en pixeles CSS (96 por pulgada): el ancho del documento en pantalla. */
export const ANCHO_PX: Record<FormatoComprobante, number> = { TERMICO: 302, A4: 794 };
const ANCHO_MM: Record<FormatoComprobante, number> = { TERMICO: 80, A4: 210 };
const ALTO_PAGINA_A4_MM = 297;
const PX_A_MM = 25.4 / 96;

const ESTILO_PAGINA = "estilo-pagina-comprobante";

/** Abre el dialogo de impresion con el tamano de papel del formato (ticket de 80 mm o A4). */
export function imprimirComprobante(formato: FormatoComprobante): void {
  const estilo = document.createElement("style");
  estilo.id = ESTILO_PAGINA;
  estilo.textContent = formato === "TERMICO"
    ? "@page { size: 80mm auto; margin: 0; }"
    : "@page { size: A4; margin: 12mm; }";
  document.head.appendChild(estilo);
  document.body.classList.add("imprimiendo-comprobante");
  const limpiar = () => {
    document.body.classList.remove("imprimiendo-comprobante");
    document.getElementById(ESTILO_PAGINA)?.remove();
    window.removeEventListener("afterprint", limpiar);
  };
  window.addEventListener("afterprint", limpiar);
  window.print();
}

async function aPng(nodo: HTMLElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(nodo, { pixelRatio: 3, backgroundColor: "#ffffff", cacheBust: true });
}

function descargar(url: string, nombreArchivo: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Baja el comprobante como imagen PNG (nitida: sale a 3x). */
export async function descargarImagen(nodo: HTMLElement, nombreBase: string): Promise<void> {
  descargar(await aPng(nodo), `${nombreBase}.png`);
}

/**
 * Baja el comprobante como PDF. El ticket termico es una sola tira de 80 mm del largo que necesite; el A4 se reparte en las
 * paginas que haga falta.
 */
export async function descargarPdf(nodo: HTMLElement, formato: FormatoComprobante, nombreBase: string): Promise<void> {
  const [{ jsPDF }, png] = await Promise.all([import("jspdf"), aPng(nodo)]);
  const anchoMm = ANCHO_MM[formato];
  const altoMm = (nodo.scrollHeight || nodo.offsetHeight) * PX_A_MM;
  if (formato === "TERMICO") {
    const pdf = new jsPDF({ unit: "mm", format: [anchoMm, Math.max(altoMm, 40)] });
    pdf.addImage(png, "PNG", 0, 0, anchoMm, altoMm);
    pdf.save(`${nombreBase}.pdf`);
    return;
  }
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const paginas = Math.max(1, Math.ceil(altoMm / ALTO_PAGINA_A4_MM));
  for (let i = 0; i < paginas; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(png, "PNG", 0, -i * ALTO_PAGINA_A4_MM, anchoMm, altoMm);
  }
  pdf.save(`${nombreBase}.pdf`);
}
