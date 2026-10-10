type BadgeVariant =
  | "disponible"
  | "ocupada"
  | "pendiente_limpieza"
  | "en_limpieza"
  | "mantenimiento"
  | "confirmada"
  | "pendiente_adelanto"
  | "cancelada"
  | "completada"
  | "en_curso"
  | "finalizada"
  | "emerald"
  | "blue"
  | "amber"
  | "red"
  | "slate"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  disponible: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ocupada: "bg-blue-100 text-blue-800 border-blue-300",
  pendiente_limpieza: "bg-amber-100 text-amber-800 border-amber-300",
  en_limpieza: "bg-sky-100 text-sky-800 border-sky-300",
  mantenimiento: "bg-red-100 text-red-800 border-red-300",
  confirmada: "bg-blue-100 text-blue-800 border-blue-300",
  pendiente_adelanto: "bg-amber-100 text-amber-800 border-amber-300",
  cancelada: "bg-red-100 text-red-800 border-red-300",
  completada: "bg-slate-100 text-slate-700 border-slate-300",
  en_curso: "bg-emerald-100 text-emerald-800 border-emerald-300",
  finalizada: "bg-slate-100 text-slate-600 border-slate-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  red: "bg-red-100 text-red-800 border-red-300",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  default: "bg-slate-100 text-slate-700 border-slate-300",
};

export function Badge({ variant = "default", label, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${variantClasses[variant]} ${className}`}
    >
      {label}
    </span>
  );
}

export function estadoReservaToVariant(estado: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    PENDIENTE_ADELANTO: "pendiente_adelanto",
    CONFIRMADA: "confirmada",
    EN_CURSO: "en_curso",
    CANCELADA: "cancelada",
    COMPLETADA: "completada",
  };
  return map[estado] ?? "default";
}

export function estadoHabToVariant(estado: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DISPONIBLE: "disponible",
    OCUPADA: "ocupada",
    PENDIENTE_LIMPIEZA: "pendiente_limpieza",
    EN_LIMPIEZA: "en_limpieza",
    MANTENIMIENTO: "mantenimiento",
  };
  return map[estado] ?? "default";
}

export function estadoEstadiaToVariant(estado: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    EN_CURSO: "en_curso",
    FINALIZADA: "finalizada",
  };
  return map[estado] ?? "default";
}
