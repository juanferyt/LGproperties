"use client";

import { formatShortEs } from "@/lib/booking/date-utils";
import { formatCop, formatUsd } from "@/lib/currency";

type Props = {
  checkIn: string | null;
  checkOut: string | null;
  nights: number;
  pricePerNight: number | null;
  discount: number;
  total: number | null;
  fullyConfigured: boolean;
  rangeAvailable: boolean;
  loading: boolean;
  usdRate: number;
  onConfirm: () => void;
  onClear: () => void;
};

export function CalendarSummary({
  checkIn,
  checkOut,
  nights,
  pricePerNight,
  discount,
  total,
  fullyConfigured,
  rangeAvailable,
  loading,
  usdRate,
  onConfirm,
  onClear,
}: Props) {
  const hasRange = Boolean(checkIn && checkOut);
  const canConfirm = hasRange && rangeAvailable && fullyConfigured && !loading;

  return (
    <div className="sticky bottom-0 z-20 -mx-1 mt-4 rounded-[1.5rem] border border-black/10 bg-white/95 p-5 shadow-luxury backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {hasRange ? (
            <>
              <p className="text-lg font-semibold text-black">
                {formatShortEs(checkIn!)} – {formatShortEs(checkOut!)}
              </p>
              <p className="text-sm text-black/55">
                {nights} {nights === 1 ? "noche" : "noches"}
                {pricePerNight ? ` · ${formatCop(pricePerNight)} COP / ${formatUsd(pricePerNight / usdRate)} USD c/noche` : ""}
              </p>
              {discount > 0 && <p className="text-sm text-forest">Descuento aplicado: -{formatCop(discount)} COP / -{formatUsd(discount / usdRate)} USD</p>}
              {!rangeAvailable && <p className="mt-1 text-sm text-red-600">Ese rango no está disponible. Elige otras fechas.</p>}
              {rangeAvailable && !fullyConfigured && <p className="mt-1 text-sm text-red-600">No hay tarifa configurada para alguna de estas noches.</p>}
            </>
          ) : (
            <p className="text-sm text-black/55">Selecciona tu fecha de entrada y salida en el calendario.</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasRange && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-black/40">Total</p>
              <p className="text-2xl font-semibold text-black">{total !== null ? `${formatCop(total)} / ${formatUsd(total / usdRate)}` : "—"}</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        {hasRange && (
          <button type="button" onClick={onClear} className="rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-black/70">
            Limpiar
          </button>
        )}
        <button
          type="button"
          disabled={!canConfirm}
          onClick={onConfirm}
          className="flex-1 rounded-full bg-black px-6 py-3.5 text-center text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Verificando disponibilidad…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
