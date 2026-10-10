import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export function LoadingState({ message = "Cargando...", rows = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
      ))}
      <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1.5">
        <Loader2 size={12} className="animate-spin" /> {message}
      </p>
    </div>
  );
}
