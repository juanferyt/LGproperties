import { parseISODate, isWeekend, nightsList } from "./date-utils";

export type SeasonType = "low" | "weekend" | "high";

/**
 * Temporada de una fecha puntual:
 *  - Alta: 15 dic–15 ene, 15 jun–15 ago (vacaciones escolares + fin de año).
 *  - Fin de semana: viernes/sábado (noche) cuando no es temporada alta
 *    (ver `isWeekend` en date-utils.ts: así se define "fin de semana" para
 *    tarifas de alojamiento en Colombia).
 *  - Baja: el resto.
 * Se calcula por mes/día, no por rango de fechas absolutas, así que aplica
 * automáticamente todos los años.
 */
export function getSeasonForDate(date: Date): SeasonType {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const isHighSeason = (month === 12 && day >= 15) || (month === 1 && day <= 15) || (month === 6 && day >= 15) || month === 7 || (month === 8 && day <= 15);
  if (isHighSeason) return "high";
  return isWeekend(date) ? "weekend" : "low";
}

export type Modality = "accommodation" | "day_pass";

/**
 * Precio por noche (alojamiento) o por día (pasadía) para una fecha puntual.
 *
 * ES LA MISMA FÓRMULA que la función SQL `calculate_stay_price`
 * (supabase/migrations/20260814_formula_pricing.sql), que es la que de
 * verdad cobra cada reserva vía `create_public_booking`. Si cambias un
 * número aquí, cámbialo también allá — esto solo alimenta la vista previa
 * del calendario y el cotizador rápido, nunca el cobro real.
 *
 * Reglas:
 *  - Santa Marina (solo alojamiento, capacidad 3): base 2 huéspedes según
 *    temporada (baja 200.000 / fin de semana 320.000 / alta 450.000),
 *    +20.000 por el 3er huésped.
 *  - Villa Ernesta: pasadía, base 2 huéspedes 200.000/día, +20.000 por cada
 *    huésped adicional. Alojamiento, base 2 huéspedes 300.000/noche, +25.000
 *    por cada huésped adicional. No varía por temporada.
 *
 * Devuelve `null` si la combinación propiedad/modalidad no existe (ej.
 * pasadía en Santa Marina): nunca se inventa un precio.
 */
export function getFormulaPrice(propertySlug: string, modality: Modality, guests: number, dateISO: string): number | null {
  const extraGuests = Math.max(0, guests - 2);
  if (propertySlug === "santa-marina") {
    if (modality !== "accommodation") return null;
    const season = getSeasonForDate(parseISODate(dateISO));
    const base = season === "high" ? 450000 : season === "weekend" ? 320000 : 200000;
    return base + extraGuests * 20000;
  }
  if (propertySlug === "villa-ernesta") {
    if (modality === "day_pass") return 200000 + extraGuests * 20000;
    if (modality === "accommodation") return 300000 + extraGuests * 25000;
    return null;
  }
  return null;
}

export type NightlyPrice = { date: string; amount: number | null; season: SeasonType };

/** Precio y temporada de cada noche (alojamiento) o día (pasadía) del rango [checkIn, checkOut). */
export function computeNightlyPrices(propertySlug: string, checkInISO: string, checkOutISO: string, modality: Modality, guests: number): NightlyPrice[] {
  return nightsList(checkInISO, checkOutISO).map((date) => ({
    date,
    amount: getFormulaPrice(propertySlug, modality, guests, date),
    season: getSeasonForDate(parseISODate(date)),
  }));
}

/** Suma las noches/días de un rango aplicando el descuento vigente (ver más abajo). */
export function computeStayTotal(nightly: NightlyPrice[], propertySlug: string, modality: Modality) {
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
