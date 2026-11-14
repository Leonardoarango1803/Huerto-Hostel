type BadgeVariant =
  | "disponible"
  | "reservado"
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

/**
 * Escala semantica del diseño: el estado se lee por el texto y el color lo refuerza.
 * Disponible/confirmada = verde · reservada/en curso = azul · ocupada = terracota ·
 * pendiente = ocre · en limpieza = verde agua · mantenimiento/finalizada = neutro.
 */
const variantClasses: Record<BadgeVariant, string> = {
  disponible: "bg-emerald-100 text-emerald-800",
  reservado: "bg-blue-100 text-blue-700",
  ocupada: "bg-red-100 text-red-800",
  pendiente_limpieza: "bg-amber-100 text-amber-800",
  en_limpieza: "bg-sky-100 text-sky-800",
  mantenimiento: "bg-slate-200 text-slate-700",
  confirmada: "bg-emerald-100 text-emerald-800",
  pendiente_adelanto: "bg-amber-100 text-amber-800",
  cancelada: "bg-red-100 text-red-800",
  completada: "bg-slate-200 text-slate-700",
  en_curso: "bg-blue-100 text-blue-700",
  finalizada: "bg-slate-200 text-slate-700",
  emerald: "bg-emerald-100 text-emerald-800",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  slate: "bg-slate-200 text-slate-700",
  default: "bg-slate-200 text-slate-700",
};

export function Badge({ variant = "default", label, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap text-[12px] font-bold px-2.5 py-0.5 rounded-full ${variantClasses[variant]} ${className}`}
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
    RESERVADO: "reservado",
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
