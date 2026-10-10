import { type ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: "green" | "blue" | "amber" | "slate" | "red" | "emerald";
}

const colorClasses = {
  green: "text-emerald-700 bg-emerald-50",
  blue: "text-blue-700 bg-blue-50",
  amber: "text-amber-700 bg-amber-50",
  slate: "text-slate-700 bg-slate-50",
  red: "text-red-700 bg-red-50",
  emerald: "text-emerald-700 bg-emerald-50",
};

export function KpiCard({ title, value, subtitle, icon, color = "slate" }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      {icon && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
