import { type ReactNode } from "react";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title = "Sin resultados",
  description = "No se encontraron registros con los filtros aplicados.",
  icon = <SearchX size={28} className="text-slate-300" />,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      {icon}
      <div>
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
      </div>
      {action}
    </div>
  );
}
