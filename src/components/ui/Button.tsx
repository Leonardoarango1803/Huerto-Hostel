import React, { type ReactNode } from "react";
import { Loader2 } from "lucide-react";

/** "accent" (terracota) se reserva para la accion principal de cara al huesped: reservar, pagar. */
type Variant = "primary" | "secondary" | "danger" | "ghost" | "success" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children?: ReactNode;
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
  primary: "bg-huerto hover:bg-huerto-oscuro text-white border border-huerto",
  secondary: "bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400",
  danger: "bg-red-700 hover:bg-red-800 text-white border border-red-700",
  ghost: "text-slate-700 hover:bg-slate-100 border border-transparent",
  success: "bg-emerald-700 hover:bg-emerald-900 text-white border border-emerald-700",
  accent: "bg-terracota hover:bg-terracota-oscuro text-white border border-terracota",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 min-h-[34px] gap-1.5 rounded-lg",
  md: "text-sm px-4 min-h-[40px] gap-2 rounded-xl",
  lg: "text-[15px] px-5 min-h-[48px] gap-2 rounded-xl",
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
      className={`inline-flex items-center justify-center font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}
