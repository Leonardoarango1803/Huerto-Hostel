/** Descarga una tabla como CSV (con BOM para que Excel respete las tildes). */
export function exportarCsv(nombre: string, encabezados: string[], filas: (string | number | null | undefined)[][]) {
  const celda = (c: string | number | null | undefined) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csv = [encabezados, ...filas].map((fila) => fila.map(celda).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre.endsWith(".csv") ? nombre : `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
