import { useState } from "react";
import { AlertBanner, FormField, FormModal, Input } from "../../components/ui";
import { mensajeDeError } from "../../api/errores";
import { usuariosApi, type EmpleadoAdmin, type ResultadoCuenta } from "../../api/usuarios";
import { nombreCompleto } from "./comun";

interface Props {
  empleado: EmpleadoAdmin;
  onCerrar: () => void;
  onListo: (resultado: ResultadoCuenta) => void;
}

/** Da acceso a un empleado que aun no tiene cuenta: usuario sugerido y clave temporal (o una escrita por el administrador). */
export function CrearAccesoModal({ empleado, onCerrar, onListo }: Props) {
  const [username, setUsername] = useState("");
  const [propia, setPropia] = useState(false);
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      onListo(await usuariosApi.crearAcceso(empleado.idEmpleado, {
        username: username.trim() || undefined,
        password: propia && password ? password : undefined,
      }));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo crear el acceso."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title="Dar acceso al sistema" subtitle={nombreCompleto(empleado)} submitLabel="Crear acceso"
      loading={guardando} onClose={onCerrar} onSubmit={guardar} size="sm">
      {error && <AlertBanner type="error" message={error} dismissible={false} />}
      <FormField label="Usuario" hint="Vacío = se sugiere uno a partir de su nombre.">
        <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} aria-label="Usuario" />
      </FormField>
      <label className="flex items-center gap-2 text-[11px] text-slate-700">
        <input type="checkbox" checked={propia} onChange={(e) => setPropia(e.target.checked)} aria-label="Escribir la clave yo" />
        Prefiero escribir yo la clave (si no, se genera una temporal)
      </label>
      {propia && (
        <FormField label="Clave" hint="Mínimo 8 caracteres, con letras y números. De todos modos deberá cambiarla al entrar.">
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Clave" />
        </FormField>
      )}
    </FormModal>
  );
}

/** Restablece la clave de otra persona. Pide la contrasena del propio administrador para confirmar. */
export function RestablecerModal({ empleado, onCerrar, onListo }: Props) {
  const [passwordAdmin, setPasswordAdmin] = useState("");
  const [propia, setPropia] = useState(false);
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!passwordAdmin) return setError("Escribe tu contraseña de administrador para confirmar.");
    setGuardando(true);
    setError(null);
    try {
      onListo(await usuariosApi.restablecer(empleado.idEmpleado, {
        passwordAdmin,
        passwordNueva: propia && nueva ? nueva : undefined,
      }));
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo restablecer la contraseña."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal open title="Restablecer contraseña"
      subtitle={`${nombreCompleto(empleado)} · usuario ${empleado.acceso.username}`}
      submitLabel="Restablecer" loading={guardando} onClose={onCerrar} onSubmit={guardar} size="sm">
      {error && <AlertBanner type="error" message={error} dismissible={false} />}
      <p className="text-[11px] text-slate-600">
        Se crea una clave temporal y se cierran sus sesiones abiertas. Al volver a entrar tendrá que elegir una propia.
      </p>
      <FormField label="Tu contraseña de administrador" required hint="Confirma que eres tú quien hace este cambio.">
        <Input type="password" autoComplete="current-password" value={passwordAdmin}
          onChange={(e) => setPasswordAdmin(e.target.value)} aria-label="Tu contraseña de administrador" />
      </FormField>
      <label className="flex items-center gap-2 text-[11px] text-slate-700">
        <input type="checkbox" checked={propia} onChange={(e) => setPropia(e.target.checked)} aria-label="Escribir la clave nueva" />
        Prefiero escribir yo la clave nueva
      </label>
      {propia && (
        <FormField label="Clave nueva" hint="Mínimo 8 caracteres, con letras y números.">
          <Input type="text" value={nueva} onChange={(e) => setNueva(e.target.value)} aria-label="Clave nueva" />
        </FormField>
      )}
    </FormModal>
  );
}
