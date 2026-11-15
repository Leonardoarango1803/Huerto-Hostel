import { useEffect, useRef, useState } from "react";
import { cargarScript } from "./cargarScript";

/** Clave PUBLICA del sitio en Cloudflare Turnstile. Sin ella no se muestra (y el backend tampoco la exige si no tiene la secreta). */
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || undefined;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const captchaDisponible = !!SITE_KEY;

interface Turnstile {
  render: (contenedor: HTMLElement, opciones: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
type ConTurnstile = Window & { turnstile?: Turnstile };

interface Props {
  /** Token listo para mandar al login; null si vencio o fallo. */
  onToken: (token: string | null) => void;
  /** Cambiarlo vuelve a pedir la verificacion (despues de un intento fallido: el token es de un solo uso). */
  reinicio: number;
}

/** Verificacion anti-robots de Cloudflare Turnstile para el login del personal. */
export function Captcha({ onToken, reinicio }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const avisar = useRef(onToken);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    avisar.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let vigente = true;
    let id: string | null = null;
    cargarScript(SCRIPT)
      .then(() => {
        const t = (window as ConTurnstile).turnstile;
        if (!vigente || !contenedor.current || !t) return;
        id = t.render(contenedor.current, {
          sitekey: SITE_KEY,
          language: "es",
          callback: (token: string) => avisar.current(token),
          "expired-callback": () => avisar.current(null),
          "error-callback": () => avisar.current(null),
        });
      })
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
      const t = (window as ConTurnstile).turnstile;
      if (id && t) t.remove(id);
    };
  }, [reinicio]);

  if (!SITE_KEY) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div ref={contenedor} className="min-h-[65px]" data-testid="captcha" />
      {fallo && <p className="m-0 text-[13px] text-red-700">No se pudo cargar la verificación de seguridad. Revisa tu conexión y recarga la página.</p>}
    </div>
  );
}
