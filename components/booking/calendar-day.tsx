"use client";

import type { PriceTier, SeasonType } from "@/lib/booking/pricing";
import { formatCop, formatUsd } from "@/lib/currency";

export type CalendarDayState = {
  day: number;
  iso: string;
  inMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  unavailable: boolean;
  tier: PriceTier | null;
  season: SeasonType | null;
  amount: number | null;
  isCheckIn: boolean;
  isCheckOut: boolean;
  inRange: boolean;
};

const tierClasses: Record<PriceTier, string> = {
  low: "bg-[#DCEFDD] text-[#1F4D30] hover:bg-[#c9e8cc]",
  mid: "bg-[#FBEFC7] text-[#6B5416] hover:bg-[#f8e6a6]",
  high: "bg-[#FBDCD4] text-[#7A2E20] hover:bg-[#f8c7ba]",
};

export function CalendarDay({ state, usdRate, onSelect }: { state: CalendarDayState; usdRate: number; onSelect: (iso: string) => void }) {
  const { day, iso, inMonth, isPast, isToday, unavailable, tier, amount, isCheckIn, isCheckOut, inRange } = state;

  const disabled = !inMonth || isPast || unavailable;
  const selected = isCheckIn || isCheckOut;

  let circleClasses = "bg-transparent text-black/30";
  if (inMonth && !isPast && !unavailable) {
    circleClasses = tier ? tierClasses[tier] : "bg-black/[.03] text-black/70 hover:bg-black/[.06]";
  }
  if (unavailable && inMonth && !isPast) {
    circleClasses = "bg-transparent text-black/30 line-through decoration-black/30";
  }
  if (isPast && inMonth) {
    circleClasses = "bg-transparent text-black/30";
  }
  if (isCheckIn) {
    circleClasses = "bg-black text-white shadow-md";
  } else if (isCheckOut) {
    circleClasses = "bg-white text-black border-[3px] border-black";
  }

  const tierLabel = tier === "low" ? "tarifa baja" : tier === "mid" ? "tarifa media" : tier === "high" ? "tarifa alta" : "sin tarifa configurada";
  const statusLabel = unavailable ? "no disponible" : isPast ? "fecha pasada" : "disponible";
  const priceLabel = amount ? `${formatCop(amount)} / ${formatUsd(amount / usdRate)}` : "";
  const ariaLabel = `${day}, ${statusLabel}${tier ? `, ${tierLabel}` : ""}${priceLabel ? `, ${priceLabel}` : ""}${isCheckIn ? ", entrada seleccionada" : ""}${isCheckOut ? ", salida seleccionada" : ""}`;

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
