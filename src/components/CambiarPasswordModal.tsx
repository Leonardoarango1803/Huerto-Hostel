import { useState } from "react";
import { KeyRound, LogOut, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { mensajeDeError } from "../api/errores";
import { Button, FormField, Input } from "./ui";
import { problemaDeClave } from "../utils/clave";

interface Props {
  /** true cuando entra con una clave temporal: no se puede cerrar ni seguir sin cambiarla. */
  obligatorio?: boolean;
  onCerrar?: () => void;
}

/** Cambio de la clave propia. Voluntario (ventana) o forzado tras recibir una clave temporal (pantalla completa). */
export function CambiarPasswordModal({ obligatorio = false, onCerrar }: Props) {
  const { user, cambiarPassword, logout } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  const problema = nueva ? problemaDeClave(nueva, user?.username) : null;
  const noCoinciden = repetir !== "" && nueva !== repetir;
  const puede = actual !== "" && nueva !== "" && repetir !== "" && !problema && !noCoinciden && !guardando;

  const guardar = async () => {
    if (!puede) return;
    setGuardando(true);
    setError(null);
    try {
      await cambiarPassword(actual, nueva);
      setListo(true);
      if (!obligatorio) setTimeout(() => onCerrar?.(), 1400);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo cambiar la contraseña."));
    } finally {
      setGuardando(false);
    }
  };

  const formulario = (
    <div className="space-y-3">
      {obligatorio && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
          Entraste con una <strong>clave temporal</strong>. Por seguridad elige una contraseña propia para continuar:
          solo tú la conocerás.
        </p>
      )}
      {error && <p role="alert" className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {listo && <p role="status" className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2">Contraseña cambiada. Tu sesión se renovó.</p>}
      <FormField label={obligatorio ? "Clave temporal que te entregaron" : "Contraseña actual"} required>
        <Input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} aria-label="Contraseña actual" />
      </FormField>
      <FormField label="Contraseña nueva" required error={problema ?? undefined}
        hint="Mínimo 8 caracteres, con letras y números.">
        <Input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} aria-label="Contraseña nueva" />
      </FormField>
      <FormField label="Repite la contraseña nueva" required error={noCoinciden ? "No coinciden." : undefined}>
        <Input type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} aria-label="Repite la contraseña nueva" />
      </FormField>
      <div className="flex items-center justify-between pt-1">
        {obligatorio ? (
          <button onClick={logout} className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <LogOut size={12} /> Cerrar sesión
          </button>
        ) : <span />}
        <div className="flex gap-2">
          {!obligatorio && <Button variant="secondary" onClick={onCerrar} disabled={guardando}>Cancelar</Button>}
          <Button onClick={guardar} loading={guardando} disabled={!puede}>Guardar contraseña</Button>
        </div>
      </div>
    </div>
  );

  if (obligatorio) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-md p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center"><KeyRound size={16} /></div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Elige tu contraseña</h1>
              <p className="text-[11px] text-slate-500">Usuario: {user?.username}</p>
            </div>
          </div>
          {formulario}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Cambiar mi contraseña">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-3">
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-bold text-slate-900">Cambiar mi contraseña</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        {formulario}
      </div>
    </div>
  );
}
