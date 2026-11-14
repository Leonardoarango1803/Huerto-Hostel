interface LogoHuertoProps {
  subtitulo?: string;
  /** "claro" para fondos oscuros o fotos. */
  tono?: "normal" | "claro";
}

/** Marca de El Huerto: hoja en un cuadrado verde + nombre en Playfair. */
export function LogoHuerto({ subtitulo = "Hostel · Ica", tono = "normal" }: LogoHuertoProps) {
  const claro = tono === "claro";
  return (
    <span className="flex items-center gap-2.5">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${claro ? "bg-white" : "bg-huerto"}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={claro ? "#2D5A27" : "#FFFFFF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 19c0-8 6-13 14-14-1 8-6 14-14 14z" />
          <path d="M5 19l7-7" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`font-display text-[21px] font-semibold ${claro ? "text-white" : "text-tinta"}`}>El Huerto</span>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${claro ? "text-emerald-100" : "text-slate-600"}`}>{subtitulo}</span>
      </span>
    </span>
  );
}
