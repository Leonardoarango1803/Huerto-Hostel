import type { EmpleadoAdmin, ResultadoCuenta } from "../../api/usuarios";
import { CrearAccesoModal, RestablecerModal } from "./AccesoModals";
import { ClaveTemporalModal } from "./ClaveTemporalModal";

type ModalAcceso =
  | { tipo: "form"; editando: EmpleadoAdmin | null }
  | { tipo: "acceso"; empleado: EmpleadoAdmin }
  | { tipo: "restablecer"; empleado: EmpleadoAdmin }
  | { tipo: "clave"; username: string; clave: string; nombre: string; motivo: "nueva" | "restablecida" }
  | null;

interface Props {
  modal: ModalAcceso;
  onCerrar: () => void;
  onAcceso: (r: ResultadoCuenta) => void;
  onRestablecido: (r: ResultadoCuenta) => void;
}

/** Muestra el modal de acceso que corresponda (dar acceso, restablecer o la clave temporal recien creada). */
export function AccesoModalsHost({ modal, onCerrar, onAcceso, onRestablecido }: Props) {
  if (!modal) return null;
  if (modal.tipo === "acceso") return <CrearAccesoModal empleado={modal.empleado} onCerrar={onCerrar} onListo={onAcceso} />;
  if (modal.tipo === "restablecer") return <RestablecerModal empleado={modal.empleado} onCerrar={onCerrar} onListo={onRestablecido} />;
  if (modal.tipo === "clave") {
    return <ClaveTemporalModal username={modal.username} clave={modal.clave} nombre={modal.nombre} motivo={modal.motivo} onCerrar={onCerrar} />;
  }
  return null;
}
