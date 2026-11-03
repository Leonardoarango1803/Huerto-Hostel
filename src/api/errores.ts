/**
 * Motivo real de un error de la API. El backend responde las reglas de negocio con un 409 y el
 * texto en `message` (por ejemplo "La caja esta cerrada..."); mostrar solo "No se pudo..." le
 * oculta al usuario la causa y la forma de resolverla.
 */
export function mensajeDeError(error: unknown, porDefecto: string): string {
  const datos = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof datos?.message === "string" && datos.message.trim() !== "" ? datos.message : porDefecto;
}

/** true si el backend rechazo la operacion porque la caja esta cerrada. */
export function esCajaCerrada(error: unknown): boolean {
  return /caja esta cerrada/i.test(mensajeDeError(error, ""));
}
