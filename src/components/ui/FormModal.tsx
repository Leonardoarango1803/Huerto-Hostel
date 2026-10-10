import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface FormModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  submitLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function FormModal({
  open,
  title,
  subtitle,
  submitLabel = "Guardar",
  loading = false,
  onClose,
  onSubmit,
  children,
  size = "md",
}: FormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
