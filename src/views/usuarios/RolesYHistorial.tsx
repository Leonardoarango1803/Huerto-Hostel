import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { ACCIONES, ETIQUETA_MODULO, MODULOS_POR_ROL, type Accion, type Modulo, type Rol } from "../../auth/permisos";
import { LoadingState } from "../../components/ui";
import { usuariosApi, type EmpleadoAdmin, type EntradaAuditoria } from "../../api/usuarios";
import { ETIQUETA_ACCION, ETIQUETA_ROL, fechaHora } from "./comun";

const ROLES: Rol[] = ["ADMINISTRADOR", "RECEPCIONISTA", "CAJERO", "COCINA", "BAR", "HOUSEKEEPING"];

const ETIQUETA_ACCION_SISTEMA: Record<Accion, string> = {
  crearReserva: "Crear reservas",
  cancelarReserva: "Cancelar reservas",
  registrarAdelanto: "Registrar adelantos",
  hacerCheckin: "Hacer check-in",
  ingresoDirecto: "Ingreso directo (walk-in)",
  editarHuesped: "Crear y editar huéspedes",
  gestionarHabitaciones: "Cambiar el estado de habitaciones",
  registrarConsumo: "Cargar consumos al folio",
  registrarPago: "Registrar pagos",
  hacerCheckout: "Hacer check-out y cobrar",
  operarCaja: "Abrir, arquear y cerrar la caja",
  cargarSolicitudAlFolio: "Cargar solicitudes al folio",
  gestionarInventario: "Crear y editar insumos y recetas",
};

function Marca({ si }: { si: boolean }) {
  return si
    ? <Check size={14} className="inline text-emerald-600" aria-label="Sí" />
    : <Minus size={14} className="inline text-slate-300" aria-label="No" />;
}

/** Que puede hacer cada rol: sale de la misma matriz que usa el menu, asi que nunca queda desactualizada. */
export function RolesTab({ empleados }: { empleados: EmpleadoAdmin[] }) {
  const modulos = (Object.keys(ETIQUETA_MODULO) as Modulo[]).filter((m) => m !== "portal");
  const acciones = Object.keys(ETIQUETA_ACCION_SISTEMA) as Accion[];
  const cuantos = (rol: Rol) => empleados.filter((e) => e.estado && e.rol?.nombre === rol).length;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500">
        El rol de cada empleado decide a qué pantallas entra y qué puede hacer en ellas. Se elige al crear o editar al
        empleado; si cambia, se aplica de inmediato.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="p-3 text-left">Pantalla</th>
              {ROLES.map((r) => (
                <th key={r} className="p-3 text-center">
                  {ETIQUETA_ROL[r]}
                  <div className="font-normal normal-case text-slate-400">{cuantos(r)} activo(s)</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modulos.map((m) => (
              <tr key={m} className="border-b border-slate-100">
                <td className="p-2.5 font-medium text-slate-700">{m === "turnos" ? "Turnos (los demás ven su propio turno)" : ETIQUETA_MODULO[m]}</td>
                {ROLES.map((r) => <td key={r} className="p-2.5 text-center"><Marca si={MODULOS_POR_ROL[r].includes(m)} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="p-3 text-left">Acción</th>
              {ROLES.map((r) => <th key={r} className="p-3 text-center">{ETIQUETA_ROL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {acciones.map((a) => (
              <tr key={a} className="border-b border-slate-100">
                <td className="p-2.5 font-medium text-slate-700">{ETIQUETA_ACCION_SISTEMA[a]}</td>
                {ROLES.map((r) => <td key={r} className="p-2.5 text-center"><Marca si={ACCIONES[a].includes(r)} /></td>)}
              </tr>
            ))}
            <tr>
              <td className="p-2.5 font-medium text-slate-700">Resolver diferencias de dinero y auditar la caja</td>
              {ROLES.map((r) => <td key={r} className="p-2.5 text-center"><Marca si={r === "ADMINISTRADOR"} /></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Ultimos movimientos sensibles del administrador: altas, bajas, cambios de rol, claves y horarios. */
export function HistorialTab() {
  const [entradas, setEntradas] = useState<EntradaAuditoria[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    usuariosApi.auditoria()
      .then((d) => vigente && setEntradas(d))
      .catch(() => vigente && setError(true));
    return () => { vigente = false; };
  }, []);

  if (error) return <p className="text-xs text-red-700">No se pudo cargar el historial.</p>;
  if (!entradas) return <LoadingState />;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {entradas.length === 0 ? (
        <p className="p-6 text-center text-slate-400 text-xs">Aún no hay movimientos registrados.</p>
      ) : (
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
              <th className="p-3">Cuándo</th>
              <th className="p-3">Quién lo hizo</th>
              <th className="p-3">Qué</th>
              <th className="p-3">A quién</th>
              <th className="p-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((a) => (
              <tr key={a.idAuditoria} className="border-b border-slate-100 align-top">
                <td className="p-3 text-slate-500 whitespace-nowrap">{fechaHora(a.fechaHora)}</td>
                <td className="p-3 font-semibold">{a.actorUsername ?? "—"}</td>
                <td className="p-3">{ETIQUETA_ACCION[a.accion] ?? a.accion}</td>
                <td className="p-3">{a.objetivo ?? "—"}</td>
                <td className="p-3 text-slate-600">{a.detalle ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
