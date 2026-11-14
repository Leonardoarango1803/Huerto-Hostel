/**
 * Que sitio se esta compilando. El mismo codigo se publica como dos proyectos de Vercel:
 *  - VITE_SITIO=web    → web publica: inicio, habitaciones, reservar y el portal del huesped.
 *  - VITE_SITIO=admin  → portal administrativo: login del personal y los modulos.
 *  - sin definir       → todo junto (para desarrollar en tu maquina).
 *
 * Las comparaciones van directo contra import.meta.env para que Vite las resuelva al compilar y deje fuera del
 * paquete las pantallas del otro sitio.
 */
export type Sitio = "web" | "admin" | "completo";

export const SITIO: Sitio =
  import.meta.env.VITE_SITIO === "web" ? "web" : import.meta.env.VITE_SITIO === "admin" ? "admin" : "completo";

/** Lo que se manda al login: el backend acepta en cada sitio solo sus cuentas. */
export const SITIO_LOGIN: "web" | "admin" | undefined = SITIO === "completo" ? undefined : SITIO;

/** Direccion de la web publica, para enlazarla desde el admin (opcional). */
export const URL_WEB: string | undefined = import.meta.env.VITE_URL_WEB || undefined;
