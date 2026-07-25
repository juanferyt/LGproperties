import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUnavailableDates } from "@/lib/booking/availability";
import { resolveRateForDate, buildTierThresholds, classifyTier, type RateRow } from "@/lib/booking/pricing";
import { getMonthGrid, toISODate, todayISO } from "@/lib/booking/date-utils";

export const dynamic = "force-dynamic";

/**
 * Devuelve, para una propiedad y un rango de meses, el precio y nivel de
 * tarifa ($ / $$ / $$$) de cada día junto con las fechas no disponibles
 * (reservas activas + bloqueos). Todo se calcula con datos reales de
 * Supabase: nunca se inventan precios ni disponibilidad.
 *
 * Query params:
 *  - propertyId (uuid, requerido)
 *  - modality: "accommodation" | "day_pass" (por defecto "accommodation")
 *  - guests: número de huéspedes (adultos+niños), por defecto 1
 *  - year, month: mes inicial a mostrar (month es 1-12). Se calculan 2 meses
 *    a partir de ahí para poder pintar el calendario sin ida y vuelta.
 */
export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("propertyId");
  const modalityParam = req.nextUrl.searchParams.get("modality");
  const modality = modalityParam === "day_pass" ? "day_pass" : "accommodation";
  const guests = Math.max(1, Number(req.nextUrl.searchParams.get("guests") || 1));
  const monthsToShow = Math.min(3, Math.max(1, Number(req.nextUrl.searchParams.get("months") || 2)));

  const now = new Date();
  const year = Number(req.nextUrl.searchParams.get("year") || now.getFullYear());
  const month = Number(req.nextUrl.searchParams.get("month") || now.getMonth() + 1); // 1-12

  if (!propertyId) {
    return NextResponse.json({ error: "Falta propertyId" }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    const { data: property, error: propertyError } = await db
      .from("properties")
      .select("id,slug,name,status")
      .eq("id", propertyId)
      .maybeSingle();
    if (propertyError) throw new Error(propertyError.message);
    if (!property || property.status !== "active") {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }

    const { data: ratesData, error: ratesError } = await db
      .from("rates")
      .select("id,property_id,modality,min_guests,max_guests,amount,start_date,end_date,weekend_only,active")
      .eq("property_id", propertyId)
      .eq("active", true);
    if (ratesError) throw new Error(ratesError.message);
    const rates = (ratesData ?? []) as RateRow[];

    // Construimos la grilla de días visibles para los `monthsToShow` meses,
    // incluyendo el relleno de semanas vecinas para no dejar huecos.
    const monthsGrid = Array.from({ length: monthsToShow }, (_, i) => {
      const m0 = month - 1 + i;
      const targetYear = year + Math.floor(m0 / 12);
      const targetMonth0 = ((m0 % 12) + 12) % 12;
      return { year: targetYear, month0: targetMonth0, days: getMonthGrid(targetYear, targetMonth0) };
    });

    const allDates = monthsGrid.flatMap((m) => m.days.map((d) => toISODate(d.date)));
    const fromISO = allDates[0];
    const toISO = allDates[allDates.length - 1];

    const unavailable = await fetchUnavailableDates(db, propertyId, fromISO, toISO);

    // Los niveles $/$$/$$$ dependen de las tarifas REALES configuradas para
    // esta propiedad (terciles de los montos activos), nunca de una
    // temporada inventada en el código.
    const thresholds = buildTierThresholds(rates.filter((r) => r.modality === modality));

    const days = allDates.map((date) => {
      const resolved = resolveRateForDate(rates, date, modality, guests);
      const amount = resolved.amount;
      return {
        date,
        amount,
        season: resolved.season,
        tier: amount !== null ? classifyTier(amount, thresholds) : null,
        unavailable: unavailable.dates.has(date),
        isPast: date < todayISO(),
      };
    });

    return NextResponse.json({
      property: { id: property.id, slug: property.slug, name: property.name },
      months: monthsGrid.map((m) => ({ year: m.year, month: m.month0 + 1 })),
      days,
      hasAnyRate: rates.some((r) => r.modality === modality),
    });
  } catch (error: any) {
    console.error("[booking-calendar] error:", error);
    return NextResponse.json({ error: "No se pudo cargar el calendario de disponibilidad" }, { status: 500 });
  }
}
