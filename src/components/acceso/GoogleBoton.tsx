import { useEffect, useRef, useState } from "react";
import { cargarScript } from "./cargarScript";

/** ID de cliente OAuth de Google (Google Cloud → Credenciales). Sin el, el boton no aparece. */
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || undefined;
const SCRIPT = "https://accounts.google.com/gsi/client";

export const googleDisponible = !!CLIENT_ID;

interface GoogleId {
  initialize: (opciones: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
  renderButton: (contenedor: HTMLElement, opciones: Record<string, string | number>) => void;
}
type ConGoogle = Window & { google?: { accounts?: { id?: GoogleId } } };

interface Props {
  /** Google entrega un comprobante firmado ("credential"); el backend lo valida. */
  onCredencial: (credencial: string) => void;
  /** Texto del boton de Google. */
  texto?: "continue_with" | "signin_with" | "signup_with";
  ancho?: number;
}

/** Boton oficial "Continuar con Google" (Google Identity Services). Solo para huespedes. */
export function GoogleBoton({ onCredencial, texto = "continue_with", ancho = 320 }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const avisar = useRef(onCredencial);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    avisar.current = onCredencial;
  }, [onCredencial]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let vigente = true;
    cargarScript(SCRIPT)
      .then(() => {
        const id = (window as ConGoogle).google?.accounts?.id;
        if (!vigente || !contenedor.current || !id) return;
        id.initialize({ client_id: CLIENT_ID, callback: (r) => avisar.current(r.credential) });
        id.renderButton(contenedor.current, { theme: "outline", size: "large", shape: "pill", text: texto, locale: "es", width: ancho });
      })
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [texto, ancho]);

  if (!CLIENT_ID) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div ref={contenedor} className="min-h-[44px]" data-testid="boton-google" />
      {fallo && <p className="m-0 text-[13px] text-red-700">No se pudo cargar el acceso con Google. Revisa tu conexión.</p>}
    </div>
  );
}
