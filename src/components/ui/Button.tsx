import React, { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[#1b4332] hover:bg-[#143427] text-white shadow-sm",
  secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  ghost: "text-slate-600 hover:bg-slate-100",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[11px] px-2.5 py-1 gap-1",
  md: "text-xs px-3 py-1.5 gap-1.5",
  lg: "text-sm px-4 py-2 gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  disabled,
  type = "button",
  className = "",
  title,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      title={title}
      onClick={onClick}
      className={`inline-flex items-center font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}
