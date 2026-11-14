import { type ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: "green" | "blue" | "amber" | "slate" | "red" | "emerald";
}

const colorClasses = {
  green: "text-emerald-700 bg-emerald-100",
  blue: "text-blue-700 bg-blue-100",
  amber: "text-amber-800 bg-amber-100",
  slate: "text-slate-700 bg-slate-100",
  red: "text-red-700 bg-red-100",
  emerald: "text-emerald-700 bg-emerald-100",
};

export function KpiCard({ title, value, subtitle, icon, color = "slate" }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] px-4 py-4 flex items-start gap-3">
      {icon && (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] text-slate-600 font-semibold">{title}</p>
        <p className="text-[26px] font-bold text-slate-900 leading-tight tracking-tight tabular-nums">{value}</p>
        {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
