import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Buscar...", className = "" }: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 min-h-[40px] text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-huerto/30 focus:border-huerto placeholder-slate-400"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 w-7 h-7 flex items-center justify-center"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
