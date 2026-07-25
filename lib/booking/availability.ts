import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, parseISODate, toISODate } from "./date-utils";

export type DateRange = { start_date: string; end_date: string };

/**
 * Estados de reserva que efectivamente bloquean disponibilidad. Se toman de
 * los mismos estados usados por `check_property_availability` en Supabase
 * (pending y confirmed). Las reservas canceladas o completadas no bloquean.
 */
export const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"] as const;

/** Expande un rango [start_date, end_date) en fechas ISO individuales (una por noche). */
export function expandRange(range: DateRange): string[] {
  const start = parseISODate(range.start_date);
  const end = parseISODate(range.end_date);
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  const out: string[] = [];
  for (let i = 0; i < nights; i++) out.push(toISODate(addDays(start, i)));
  return out;
}

export type UnavailableInfo = {
  dates: Set<string>;
};

/**
 * Consulta reservas activas y fechas bloqueadas de una propiedad que se
 * solapen con [fromISO, toISO) y devuelve el conjunto de noches ocupadas.
 * Se ejecuta siempre en el servidor (Route Handler) con el cliente admin,
 * nunca se expone la SUPABASE_SERVICE_ROLE_KEY al navegador.
 */
export async function fetchUnavailableDates(
  db: SupabaseClient,
  propertyId: string,
  fromISO: string,
  toISO: string
): Promise<UnavailableInfo> {
  const [bookingsRes, blockedRes] = await Promise.all([
    db
      .from("bookings")
      .select("check_in,check_out,status,modality")
      .eq("property_id", propertyId)
      .eq("modality", "accommodation")
      .in("status", BLOCKING_BOOKING_STATUSES as unknown as string[])
      .lt("check_in", toISO)
      .gt("check_out", fromISO),
    db
      .from("blocked_dates")
      .select("start_date,end_date")
      .eq("property_id", propertyId)
      .lt("start_date", toISO)
      .gt("end_date", fromISO),
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (blockedRes.error) throw new Error(blockedRes.error.message);

  const dates = new Set<string>();
  for (const booking of bookingsRes.data ?? []) {
    for (const d of expandRange({ start_date: booking.check_in, end_date: booking.check_out })) dates.add(d);
  }
  for (const blocked of blockedRes.data ?? []) {
    for (const d of expandRange({ start_date: blocked.start_date, end_date: blocked.end_date })) dates.add(d);
  }
  return { dates };
}

/** Verifica que ninguna noche del rango [checkIn, checkOut) esté ocupada o bloqueada. */
export function isRangeAvailable(unavailable: Set<string>, nights: string[]): boolean {
  return nights.every((d) => !unavailable.has(d));
}
