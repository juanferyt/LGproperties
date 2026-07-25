import { parseISODate, isWeekend, nightsList } from "./date-utils";

export type SeasonType = "low" | "weekend" | "high";

export type RateRow = {
  id: string;
  property_id: string;
  modality: "accommodation" | "day_pass";
  min_guests: number;
  max_guests: number;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  weekend_only: boolean;
  active: boolean;
};

export type PriceTier = "low" | "mid" | "high";

export function getSeasonForDate(date: Date): SeasonType {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const isHighSeason = (month === 12 && day >= 15) || (month === 1 && day <= 15) || (month === 6 && day >= 15) || month === 7 || (month === 8 && day <= 15);
  if (isHighSeason) return "high";
  return isWeekend(date) ? "weekend" : "low";
}

/**
 * Selecciona la tarifa aplicable a una fecha puntual para una modalidad y un
 * número de huéspedes. Replica exactamente el criterio de la función SQL
 * `create_public_booking`: activa, misma modalidad, huéspedes dentro del
 * rango, fecha dentro de start_date/end_date cuando existan, y en caso de
 * varias coincidencias se prefiere la de start_date más reciente
 * (`order by start_date desc nulls last limit 1`).
 *
 * No inventa tarifas: si no hay ninguna fila que aplique, devuelve null y el
 * día se debe tratar como "sin tarifa configurada".
 */
export function getRateForDate(
  rates: RateRow[],
  dateISO: string,
  modality: "accommodation" | "day_pass",
  guests: number
): RateRow | null {
  const date = parseISODate(dateISO);
  const weekend = isWeekend(date);

  const candidates = rates.filter((rate) => {
    if (!rate.active || rate.modality !== modality) return false;
    if (guests < rate.min_guests || guests > rate.max_guests) return false;
    if (rate.start_date && dateISO < rate.start_date) return false;
    if (rate.end_date && dateISO > rate.end_date) return false;
    if (rate.weekend_only && !weekend) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.start_date === b.start_date) return 0;
    if (!a.start_date) return 1; // nulls last
    if (!b.start_date) return -1;
    return a.start_date < b.start_date ? 1 : -1; // desc
  });

  return candidates[0];
}

export type NightlyPrice = { date: string; amount: number | null };

export function resolveRateForDate(
  rates: RateRow[],
  dateISO: string,
  modality: "accommodation" | "day_pass",
  guests: number
): { rate: RateRow | null; season: SeasonType; amount: number | null } {
  const rate = getRateForDate(rates, dateISO, modality, guests);
  const season = getSeasonForDate(parseISODate(dateISO));
  if (!rate) return { rate: null, season, amount: null };

  // IMPORTANTE: el monto es siempre el de la tarifa REAL configurada en Supabase
  // (`rates.amount`), sin multiplicadores inventados. `season` se conserva solo
  // como dato informativo (por ejemplo para mostrar "fin de semana" en el
  // aria-label); si se quiere cobrar distinto en fin de semana o temporada alta,
  // eso ya es posible y correcto usando filas reales en `rates` con
  // `weekend_only`/`start_date`/`end_date`, que `getRateForDate` ya respeta.
  return {
    rate,
    season,
    amount: rate.amount,
  };
}

export function computeNightlyPrices(
  rates: RateRow[],
  checkInISO: string,
  checkOutISO: string,
  modality: "accommodation" | "day_pass",
  guests: number
): NightlyPrice[] {
  return nightsList(checkInISO, checkOutISO).map((date) => ({
    date,
    amount: getRateForDate(rates, date, modality, guests)?.amount ?? null,
  }));
}

/**
 * Calcula los umbrales de terciles ($/$$/$$$) a partir del conjunto de
 * montos reales configurados en `rates` para una propiedad (sin mezclar
 * propiedades entre sí, ya que `rates` ya viene filtrado por property_id).
 */
export function buildTierThresholds(rates: RateRow[]): { low: number; high: number } {
  const amounts = Array.from(new Set(rates.filter((r) => r.active).map((r) => r.amount))).sort((a, b) => a - b);
  if (amounts.length === 0) return { low: 0, high: 0 };
  if (amounts.length === 1) return { low: amounts[0], high: amounts[0] };
  const q = (p: number) => {
    const idx = (amounts.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return amounts[lo];
    return amounts[lo] + (amounts[hi] - amounts[lo]) * (idx - lo);
  };
  return { low: q(1 / 3), high: q(2 / 3) };
}

export function classifyTier(amount: number, thresholds: { low: number; high: number }): PriceTier {
  if (amount <= thresholds.low) return "low";
  if (amount > thresholds.high) return "high";
  return "mid";
}

export function computeStayTotal(nightly: NightlyPrice[], propertySlug: string, modality: "accommodation" | "day_pass") {
  const configured = nightly.every((n) => n.amount !== null);
  const subtotal = nightly.reduce((sum, n) => sum + (n.amount ?? 0), 0);
  let discount = 0;
  // Regla real y ya existente en create_public_booking(): en Villa Ernesta,
  // alojamiento de 3 noches o más, la última tarifa nocturna tiene 50% de descuento.
  if (propertySlug === "villa-ernesta" && modality === "accommodation" && nightly.length >= 3) {
    const lastAmount = nightly[nightly.length - 1]?.amount ?? 0;
    discount = lastAmount * 0.5;
  }
  return { subtotal, discount, total: subtotal - discount, fullyConfigured: configured };
}
