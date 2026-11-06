/** Reglas de la clave: las mismas que valida el servidor (se repiten aqui solo para avisar antes de enviar). */
export function problemaDeClave(clave: string, usuario?: string): string | null {
  if (clave.length < 8) return "Debe tener al menos 8 caracteres.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/\d/.test(clave)) return "Debe combinar letras y números.";
  if (usuario && clave.toLowerCase() === usuario.toLowerCase()) return "No puede ser igual al usuario.";
  return null;
}
