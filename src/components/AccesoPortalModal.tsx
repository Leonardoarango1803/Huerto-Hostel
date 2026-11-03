import { useState, useEffect, useCallback } from "react";
import { KeyRound, Copy, Check, ShieldOff, ShieldCheck, RotateCcw } from "lucide-react";
import { clientesApi } from "../api/clientes";
import type { AccesoPortal, Cliente } from "../api/types";
import { Button, AlertBanner, LoadingState } from "./ui";

interface Props {
  cliente: Cliente | null;
  onClose: () => void;
}

/**
 * Alta y mantenimiento del acceso de un huesped al Portal.
 * La clave temporal solo la devuelve el backend en el momento de generarla,
 * asi que se muestra aqui una unica vez para entregarsela al huesped.
 */
export function AccesoPortalModal({ cliente, onClose }: Props) {
  const [acceso, setAcceso] = useState<AccesoPortal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    setCargando(true);
    setError(null);
    try {
      setAcceso(await clientesApi.consultarAcceso(cliente.idCliente));
    } catch {
      setError("No se pudo consultar el acceso de este huesped.");
    } finally {
      setCargando(false);
    }
  }, [cliente]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!cliente) return null;

  const mensajeError = (e: unknown, porDefecto: string) => {
    const r = (e as { response?: { data?: { message?: string } } })?.response;
    return r?.data?.message ?? porDefecto;
  };

  const ejecutar = async (accion: () => Promise<AccesoPortal>, porDefecto: string) => {
    setTrabajando(true);
    setError(null);
    setCopiado(false);
    try {
      setAcceso(await accion());
    } catch (e) {
      setError(mensajeError(e, porDefecto));
    } finally {
      setTrabajando(false);
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <KeyRound size={14} className="text-emerald-700" /> Acceso al Portal
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {cliente.nombres} {cliente.apellidos} · {cliente.tipoDocumento}{" "}
              {cliente.numeroDocumento}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {error && <AlertBanner type="error" message={error} />}

          {cargando ? (
            <LoadingState />
          ) : !acceso?.existe ? (
            <>
              <p className="text-slate-600">
                Este huesped aun no puede entrar al portal. Al crear el acceso, el sistema
                propone un usuario y genera una clave temporal que debes entregarle.
              </p>
              <Button
                variant="primary"
                loading={trabajando}
                icon={<KeyRound size={13} />}
                onClick={() =>
                  ejecutar(
                    () => clientesApi.crearAcceso(cliente.idCliente),
                    "No se pudo crear el acceso."
                  )
                }
              >
                Crear acceso al portal
              </Button>
            </>
          ) : (
            <>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Usuario</span>
                  <span className="font-bold text-slate-900">{acceso.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estado</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      acceso.activo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {acceso.activo ? "ACTIVO" : "DESHABILITADO"}
                  </span>
                </div>
              </div>

              {acceso.passwordTemporal && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
                  <p className="text-amber-900 font-semibold">
                    Clave temporal — se muestra una sola vez
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-amber-200 rounded px-2 py-1.5 font-mono text-sm tracking-wider text-slate-900">
                      {acceso.passwordTemporal}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copiado ? <Check size={12} /> : <Copy size={12} />}
                      onClick={() => copiar(acceso.passwordTemporal as string)}
                    >
                      {copiado ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Anotala o copiala ahora: al cerrar esta ventana no volvera a mostrarse.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={trabajando}
                  icon={<RotateCcw size={12} />}
                  onClick={() =>
                    ejecutar(
                      () => clientesApi.restablecerPassword(cliente.idCliente),
                      "No se pudo restablecer la clave."
                    )
                  }
                >
                  Generar nueva clave
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={trabajando}
                  icon={acceso.activo ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                  onClick={() =>
                    ejecutar(
                      () => clientesApi.cambiarEstadoAcceso(cliente.idCliente, !acceso.activo),
                      "No se pudo cambiar el estado."
                    )
                  }
                >
                  {acceso.activo ? "Deshabilitar" : "Reactivar"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
