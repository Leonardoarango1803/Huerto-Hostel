import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface FormModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  submitLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
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
  submitDisabled = false,
  onClose,
  onSubmit,
  children,
  size = "md",
}: FormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/45" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-500 hover:text-slate-800 ml-4 w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} disabled={submitDisabled} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
