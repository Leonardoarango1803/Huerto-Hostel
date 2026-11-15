/** Carga un script externo una sola vez (los botones de Google y el captcha se montan y desmontan varias veces). */
const cargas = new Map<string, Promise<void>>();

export function cargarScript(src: string): Promise<void> {
  const previa = cargas.get(src);
  if (previa) return previa;
  const promesa = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      cargas.delete(src); // permite reintentar mas tarde
      reject(new Error("No se pudo cargar " + src));
    };
    document.head.appendChild(s);
  });
  cargas.set(src, promesa);
  return promesa;
}
