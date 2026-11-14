import { type ReactNode } from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, required, error, children, hint }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-slate-800">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-slate-500">{hint}</p>}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

const base =
  "w-full text-sm px-3 min-h-[40px] border rounded-xl focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`${base} ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"} ${className}`}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = "", children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`${base} ${error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"} ${className}`}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full text-sm px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto placeholder-slate-400 resize-none ${
        error ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
      } ${className}`}
    />
  );
}
