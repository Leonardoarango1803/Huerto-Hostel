import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";
import { useState } from "react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertBannerProps {
  type: AlertType;
  message: string;
  dismissible?: boolean;
}

const config: Record<AlertType, { icon: typeof CheckCircle; classes: string }> = {
  success: { icon: CheckCircle, classes: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  error: { icon: XCircle, classes: "bg-red-50 border-red-200 text-red-900" },
  warning: { icon: AlertCircle, classes: "bg-amber-50 border-amber-200 text-amber-900" },
  info: { icon: Info, classes: "bg-blue-50 border-blue-200 text-blue-900" },
};

export function AlertBanner({ type, message, dismissible = true }: AlertBannerProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const { icon: Icon, classes } = config[type];

  return (
    <div
      role={type === "error" || type === "warning" ? "alert" : "status"}
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-[13px] font-medium leading-snug ${classes}`}
    >
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {dismissible && (
        <button onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="flex-shrink-0 opacity-70 hover:opacity-100">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
