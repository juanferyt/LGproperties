"use client";

import type { SeasonType } from "@/lib/booking/pricing";
import { formatCop, formatUsd } from "@/lib/currency";

export type CalendarDayState = {
  day: number;
  iso: string;
  inMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  unavailable: boolean;
  season: SeasonType | null;
  amount: number | null;
  isCheckIn: boolean;
  isCheckOut: boolean;
  inRange: boolean;
};

// Verde = temporada baja, naranja = fin de semana, rojo = temporada alta.
const seasonClasses: Record<SeasonType, string> = {
  low: "bg-[#DCEFDD] text-[#1F4D30] hover:bg-[#c9e8cc]",
  weekend: "bg-[#FBE3C2] text-[#7A4A16] hover:bg-[#f6d5a3]",
  high: "bg-[#FBD4D4] text-[#7A2020] hover:bg-[#f8b9b9]",
};

// Gris para los días ocupados (reservados o bloqueados), a petición explícita.
const unavailableClasses = "bg-black/10 text-black/40 line-through decoration-black/40";

export function CalendarDay({ state, usdRate, onSelect }: { state: CalendarDayState; usdRate: number; onSelect: (iso: string) => void }) {
  const { day, iso, inMonth, isPast, isToday, unavailable, season, amount, isCheckIn, isCheckOut, inRange } = state;

  const disabled = !inMonth || isPast || unavailable;
  const selected = isCheckIn || isCheckOut;

  let circleClasses = "bg-transparent text-black/30";
  if (inMonth && !isPast && !unavailable) {
    circleClasses = season ? seasonClasses[season] : "bg-black/[.03] text-black/70 hover:bg-black/[.06]";
  }
  if (unavailable && inMonth && !isPast) {
    circleClasses = unavailableClasses;
  }
  if (isPast && inMonth) {
    circleClasses = "bg-transparent text-black/30";
  }
  if (isCheckIn) {
    circleClasses = "bg-black text-white shadow-md";
  } else if (isCheckOut) {
    circleClasses = "bg-white text-black border-[3px] border-black";
  }

  const seasonLabel = season === "low" ? "temporada baja" : season === "weekend" ? "fin de semana" : season === "high" ? "temporada alta" : "";
  const statusLabel = unavailable ? "ocupado" : isPast ? "fecha pasada" : "disponible";
  const priceLabel = amount ? `${formatCop(amount)} / ${formatUsd(amount / usdRate)}` : "";
  const ariaLabel = `${day}, ${statusLabel}${seasonLabel ? `, ${seasonLabel}` : ""}${priceLabel ? `, ${priceLabel}` : ""}${isCheckIn ? ", entrada seleccionada" : ""}${isCheckOut ? ", salida seleccionada" : ""}`;

  return (
    <div className={`relative flex items-center justify-center py-0.5 ${inRange ? "bg-black/[.05]" : ""} ${isCheckIn ? "rounded-l-full" : ""} ${isCheckOut ? "rounded-r-full" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={() => !disabled && onSelect(iso)}
        className={[
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-150",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
          !inMonth ? "invisible" : "",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          circleClasses,
        ].join(" ")}
      >
        {day}
        {isToday && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" aria-hidden="true" />}
      </button>
    </div>
  );
}
