import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "../../components/ui";

interface Props {
  username: string;
  clave: string;
  nombre: string;
  /** "nueva": cuenta recien creada. "restablecida": el administrador cambio la clave de una cuenta existente. */
  motivo: "nueva" | "restablecida";
  onCerrar: () => void;
}

/** La clave temporal se muestra una sola vez: quien la crea debe entregarla ahora. */
export function ClaveTemporalModal({ username, clave, nombre, motivo, onCerrar }: Props) {
  const [copiado, setCopiado] = useState<"" | "clave" | "mensaje">("");

  const copiar = async (texto: string, cual: "clave" | "mensaje") => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      // Sin permiso del portapapeles: la clave sigue a la vista para anotarla.
    }
  };

  const mensaje =
    `Hola ${nombre}. Tus datos para entrar al sistema del hostel:\n` +
    `Usuario: ${username}\nClave temporal: ${clave}\n` +
    `Al ingresar el sistema te pedirá elegir tu propia contraseña.`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-label="Clave temporal">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center"><KeyRound size={16} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {motivo === "nueva" ? "Cuenta creada" : "Contraseña restablecida"}
            </h2>
            <p className="text-[11px] text-slate-500">Para {nombre}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Usuario</span>
            <strong data-testid="clave-usuario" className="text-slate-900">{username}</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Clave temporal</span>
            <span className="flex items-center gap-2">
              <strong data-testid="clave-temporal" className="font-mono text-sm text-slate-900 tracking-wide">{clave}</strong>
              <button onClick={() => copiar(clave, "clave")} aria-label="Copiar clave" className="text-slate-500 hover:text-slate-800">
                {copiado === "clave" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          <strong>Se muestra una sola vez.</strong> Entrégasela a {nombre} ahora. Al ingresar, el sistema le pedirá elegir su
          propia contraseña y esta clave dejará de servir.
        </p>

        <div className="flex justify-between gap-2">
          <Button variant="secondary" icon={copiado === "mensaje" ? <Check size={12} /> : <Copy size={12} />} onClick={() => copiar(mensaje, "mensaje")}>
            Copiar mensaje para enviar
          </Button>
          <Button onClick={onCerrar}>Ya la entregué</Button>
        </div>
      </div>
    </div>
  );
}
