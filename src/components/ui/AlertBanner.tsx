import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";
import { useState } from "react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertBannerProps {
  type: AlertType;
  message: string;
  dismissible?: boolean;
}

const config: Record<AlertType, { icon: typeof CheckCircle; classes: string }> = {
  success: { icon: CheckCircle, classes: "bg-emerald-50 border-emerald-300 text-emerald-800" },
  error: { icon: XCircle, classes: "bg-red-50 border-red-300 text-red-800" },
  warning: { icon: AlertCircle, classes: "bg-amber-50 border-amber-300 text-amber-800" },
  info: { icon: Info, classes: "bg-blue-50 border-blue-300 text-blue-800" },
};

export function AlertBanner({ type, message, dismissible = true }: AlertBannerProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const { icon: Icon, classes } = config[type];

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${classes}`}>
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {dismissible && (
        <button onClick={() => setVisible(false)} className="flex-shrink-0 opacity-60 hover:opacity-100">
          <X size={13} />
        </button>
      )}
    </div>
  );
}
