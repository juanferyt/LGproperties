"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCop, formatUsd } from "@/lib/currency";

type Props = { property: "santa-marina" | "villa-ernesta" };

export function BookingCalculator({ property }: Props) {
  const [guests, setGuests] = useState(2);
  const [nights, setNights] = useState(1);
  const [mode, setMode] = useState<"stay" | "day">("stay");
  const [season, setSeason] = useState<"low" | "weekend" | "high">("low");
  const [usdRate, setUsdRate] = useState(4200);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { getUsdToCopRate } = await import("@/lib/currency");
        const rate = await getUsdToCopRate();
        if (active) setUsdRate(rate);
      } catch {
        if (active) setUsdRate(4200);
      }
    })();
    return () => { active = false; };
  }, []);

  // Misma fórmula que getFormulaPrice() en lib/booking/pricing.ts (y que
  // calculate_stay_price() en Supabase, que es la que realmente cobra la
  // reserva): base para 2 huéspedes + recargo por cada huésped adicional.
  const total = useMemo(() => {
    const extraGuests = Math.max(0, guests - 2);
    if (property === "santa-marina") {
      const base = season === "high" ? 450000 : season === "weekend" ? 320000 : 200000;
      return (base + extraGuests * 20000) * nights;
    }
    const dayRate = 200000 + extraGuests * 20000;
    const stayRate = 300000 + extraGuests * 25000;
    let amount = (mode === "day" ? dayRate : stayRate) * nights;
    if (mode === "stay" && nights >= 3) amount -= stayRate * 0.5;
    return amount;
  }, [property, guests, nights, mode, season]);

  const label = property === "santa-marina" ? "Santa Marina" : "Villa Ernesta";
  const usdAmount = total / usdRate;
  const message = encodeURIComponent(`Hola, quiero reservar ${label}. Somos ${guests} huéspedes, por ${nights} ${nights === 1 ? "noche/día" : "noches/días"}. Cotización estimada: ${formatCop(total)} COP / ${formatUsd(usdAmount)} USD.`);

  return (
    <div className="rounded-[2rem] bg-white p-7 shadow-luxury">
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Cotizador inmediato</p>
      <h3 className="mt-3 text-3xl">Calcula tu experiencia</h3>
      <div className="mt-6 grid gap-4">
        {property === "villa-ernesta" && (
          <label className="grid gap-2 text-sm">Modalidad
            <select value={mode} onChange={(e) => setMode(e.target.value as "stay" | "day")} className="rounded-xl border border-black/15 p-3">
              <option value="stay">Con alojamiento</option><option value="day">Pasadía</option>
            </select>
          </label>
        )}
        {property === "santa-marina" && (
          <label className="grid gap-2 text-sm">Temporada
            <select value={season} onChange={(e) => setSeason(e.target.value as typeof season)} className="rounded-xl border border-black/15 p-3">
              <option value="low">Temporada baja</option><option value="weekend">Fin de semana</option><option value="high">Temporada alta</option>
            </select>
          </label>
        )}
        <label className="grid gap-2 text-sm">Huéspedes
          <input type="number" min="1" max={property === "santa-marina" ? 3 : 20} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="rounded-xl border border-black/15 p-3" />
        </label>
        <label className="grid gap-2 text-sm">{mode === "day" ? "Días" : "Noches"}
          <input type="number" min="1" value={nights} onChange={(e) => setNights(Number(e.target.value))} className="rounded-xl border border-black/15 p-3" />
        </label>
      </div>
      <div className="mt-6 border-t border-black/10 pt-5">
        <p className="text-sm text-black/50">Total estimado</p>
        <p className="mt-1 text-3xl font-semibold">{formatCop(total)} COP</p>
        <p className="mt-1 text-lg text-black/70">{formatUsd(usdAmount)} USD</p>
        <p className="mt-2 text-xs text-black/45">Sujeto a disponibilidad, temporada, actividad y requerimientos adicionales.</p>
      </div>
      <a href={`https://wa.me/573122823625?text=${message}`} className="mt-6 block rounded-full bg-gold px-6 py-4 text-center font-semibold text-white">Solicitar reserva por WhatsApp</a>
    </div>
  );
}
