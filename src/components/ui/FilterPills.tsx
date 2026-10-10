interface FilterOption {
  label: string;
  value: string;
}

interface FilterPillsProps {
  options: FilterOption[];
  // Single-select (existing)
  active?: string;
  onSelect?: (value: string) => void;
  // Multi-select (new)
  activeValues?: string[];
  onSelectMulti?: (values: string[]) => void;
  className?: string;
}

export function FilterPills({
  options,
  active,
  onSelect,
  activeValues,
  onSelectMulti,
  className = "",
}: FilterPillsProps) {
  const isMulti = activeValues !== undefined && onSelectMulti !== undefined;

  function handleClick(value: string) {
    if (isMulti) {
      if (value === "TODAS") {
        onSelectMulti([]);
      } else {
        const current = activeValues ?? [];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        onSelectMulti(next);
      }
    } else {
      onSelect?.(value);
    }
  }

  function isActive(value: string): boolean {
    if (isMulti) {
      if (value === "TODAS") return (activeValues ?? []).length === 0;
      return (activeValues ?? []).includes(value);
    }
    return active === value;
  }

  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleClick(opt.value)}
          className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${
            isActive(opt.value)
              ? "bg-[#1b4332] text-white border-[#1b4332]"
              : "bg-white text-slate-600 border-slate-300 hover:border-[#1b4332] hover:text-[#1b4332]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
