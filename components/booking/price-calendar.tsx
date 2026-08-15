"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarDay, type CalendarDayState } from "./calendar-day";
import { CalendarSummary } from "./calendar-summary";
import { DAY_LABELS_ES, getMonthGrid, monthLabelEs, nightsBetween, nightsList, toISODate, todayISO } from "@/lib/booking/date-utils";

type ApiDay = { date: string; amount: number | null; season: "low" | "weekend" | "high" | null; unavailable: boolean; isPast: boolean };
type ApiResponse = {
  property: { id: string; slug: string; name: string };
  months: { year: number; month: number }[];
  days: ApiDay[];
  hasAnyRate: boolean;
};

type Props = {
  propertyId: string;
  propertySlug?: string;
  modality: "accommodation" | "day_pass";
  guests: number;
  checkIn: string;
  checkOut: string;
  onConfirm: (checkIn: string, checkOut: string) => void;
};

export function PriceCalendar({ propertyId, propertySlug, modality, guests, checkIn, checkOut, onConfirm }: Props) {
  const now = new Date();
  const [baseYear, setBaseYear] = useState(now.getFullYear());
  const [baseMonth, setBaseMonth] = useState(now.getMonth() + 1); // 1-12
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selCheckIn, setSelCheckIn] = useState<string | null>(checkIn || null);
  const [selCheckOut, setSelCheckOut] = useState<string | null>(checkOut || null);
  const [message, setMessage] = useState("");
  const [usdRate, setUsdRate] = useState(4200);

  // Se obtiene una sola vez aquí (en vez de que cada día del calendario haga
  // su propia petición) y se pasa hacia abajo como prop.
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

  const load = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        propertyId,
        modality,
        guests: String(Math.max(1, guests || 1)),
        year: String(baseYear),
        month: String(baseMonth),
        months: "2",
      });
      const res = await fetch(`/api/booking-calendar?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el calendario");
      setData(json);
    } catch (err: any) {
      setError(err.message || "No se pudo cargar el calendario. Intenta de nuevo.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId, modality, guests, baseYear, baseMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const dayIndex = useMemo(() => {
    const map = new Map<string, ApiDay>();
    data?.days.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const unavailableSet = useMemo(() => {
    const set = new Set<string>();
    data?.days.forEach((d) => {
      if (d.unavailable) set.add(d.date);
    });
    return set;
  }, [data]);

  function goPrev() {
    const m = baseMonth - 1;
    if (m < 1) {
      setBaseMonth(12);
      setBaseYear((y) => y - 1);
    } else {
      setBaseMonth(m);
    }
  }
  function goNext() {
    const m = baseMonth + 1;
    if (m > 12) {
      setBaseMonth(1);
      setBaseYear((y) => y + 1);
    } else {
      setBaseMonth(m);
    }
  }

  function handleSelect(iso: string) {
    setMessage("");
    if (!selCheckIn || (selCheckIn && selCheckOut)) {
      // Empezamos una selección nueva.
      setSelCheckIn(iso);
      setSelCheckOut(null);
      return;
    }
    // Ya hay check-in, este es el segundo clic.
    if (iso <= selCheckIn) {
      setSelCheckIn(iso);
      setSelCheckOut(null);
      return;
    }
    const nights = nightsList(selCheckIn, iso);
    const blocked = nights.some((n) => unavailableSet.has(n));
    if (blocked) {
      setMessage("Ese rango incluye fechas ocupadas o bloqueadas. Elige otro rango.");
      setSelCheckIn(iso);
      setSelCheckOut(null);
      return;
    }
    setSelCheckOut(iso);
  }

  function handleClear() {
    setSelCheckIn(null);
    setSelCheckOut(null);
    setMessage("");
  }

  const nights = selCheckIn && selCheckOut ? nightsBetween(selCheckIn, selCheckOut) : 0;
  const nightList = selCheckIn && selCheckOut ? nightsList(selCheckIn, selCheckOut) : [];
  const nightlyAmounts = nightList.map((n) => dayIndex.get(n)?.amount ?? null);
  const fullyConfigured = nightlyAmounts.length > 0 && nightlyAmounts.every((a) => a !== null);
  const subtotal = nightlyAmounts.reduce((sum: number, a) => sum + (a ?? 0), 0);
  let discount = 0;
  if (propertySlug === "villa-ernesta" && modality === "accommodation" && nights >= 3) {
    discount = (nightlyAmounts[nightlyAmounts.length - 1] ?? 0) * 0.5;
  }
  const total = fullyConfigured ? subtotal - discount : null;
  const pricePerNight = nightlyAmounts.length ? nightlyAmounts[0] : null;
  const rangeAvailable = nightList.length === 0 || nightList.every((n) => !unavailableSet.has(n));

  function confirm() {
    if (!selCheckIn || !selCheckOut || !rangeAvailable || !fullyConfigured) return;
    onConfirm(selCheckIn, selCheckOut);
  }

  const today = todayISO();

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-luxury sm:p-7">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Disponibilidad en tiempo real</p>
        <h3 className="text-3xl">Encuentra el mejor precio</h3>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-black/60">
        <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#DCEFDD]" /> Temporada baja</span>
        <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#FBE3C2]" /> Fin de semana</span>
        <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#FBD4D4]" /> Temporada alta</span>
        <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-black/10" /> Ocupado</span>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={goPrev} aria-label="Mes anterior" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-lg hover:bg-black/[.03]">
          ‹
        </button>
        <p className="text-sm font-medium text-black/70">Navega los próximos meses</p>
        <button type="button" onClick={goNext} aria-label="Mes siguiente" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-lg hover:bg-black/[.03]">
          ›
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button type="button" onClick={load} className="ml-3 underline">
            Reintentar
          </button>
        </div>
      )}

      {message && <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}

      {loading && !data && <div className="mt-8 py-10 text-center text-sm text-black/45">Cargando disponibilidad…</div>}

      {data && !data.hasAnyRate && (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Esta propiedad todavía no tiene tarifas configuradas para esta modalidad.
        </div>
      )}

      {data && (
        <div className={`mt-6 grid grid-cols-1 gap-8 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          {data.months.map(({ year, month }) => {
            const grid = getMonthGrid(year, month - 1);
            return (
              <div key={`${year}-${month}`}>
                <p className="mb-3 text-center text-base font-semibold capitalize">{monthLabelEs(year, month - 1)}</p>
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-semibold text-black/40">
                  {DAY_LABELS_ES.map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {grid.map(({ date, inMonth }) => {
                    const iso = toISODate(date);
                    const apiDay = dayIndex.get(iso);
                    const isCheckIn = selCheckIn === iso;
                    const isCheckOut = selCheckOut === iso;
                    const inRange = Boolean(selCheckIn && selCheckOut && iso > selCheckIn && iso < selCheckOut);
                    const state: CalendarDayState = {
                      day: date.getDate(),
                      iso,
                      inMonth,
                      isPast: apiDay?.isPast ?? iso < today,
                      isToday: iso === today,
                      unavailable: apiDay?.unavailable ?? false,
                      season: apiDay?.season ?? null,
                      amount: apiDay?.amount ?? null,
                      isCheckIn,
                      isCheckOut,
                      inRange,
                    };
                    return <CalendarDay key={iso} state={state} usdRate={usdRate} onSelect={handleSelect} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CalendarSummary
        checkIn={selCheckIn}
        checkOut={selCheckOut}
        nights={nights}
        pricePerNight={pricePerNight}
        discount={discount}
        total={total}
        fullyConfigured={fullyConfigured}
        rangeAvailable={rangeAvailable}
        loading={loading}
        usdRate={usdRate}
        onConfirm={confirm}
        onClear={handleClear}
      />
    </div>
  );
}
