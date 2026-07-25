// Utilidades de fecha para el calendario de reservas.
// IMPORTANTE: todas las fechas se manejan como fechas LOCALES en formato
// "YYYY-MM-DD" (sin hora). Nunca se usa `new Date(isoString)` directamente
// para strings tipo fecha, porque JS interpreta "2026-07-23" como UTC y eso
// puede mover el día al construir un objeto Date en zonas horarias con
// diferencia negativa (por ejemplo Colombia, UTC-5), mostrando el 22 en vez
// del 23. Por eso siempre construimos el Date con año/mes/día por separado.

export const DAY_LABELS_ES = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"] as const;

export const MONTH_NAMES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

const MONTH_SHORT_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

/** Convierte un string "YYYY-MM-DD" en un Date local a medianoche, sin desfase UTC. */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Convierte un Date a "YYYY-MM-DD" usando los componentes locales (no UTC). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWeekend(date: Date): boolean {
  // Para tarifas de alojamiento en Colombia, "fin de semana" = viernes y sábado (noche).
  const day = date.getDay(); // 0=domingo ... 6=sábado
  return day === 5 || day === 6;
}

/** Índice de día de semana empezando en lunes (0=lunes ... 6=domingo). */
export function mondayIndex(date: Date): number {
  const day = date.getDay(); // 0=domingo
  return day === 0 ? 6 : day - 1;
}

/** Devuelve todas las fechas ISO del mes dado, incluyendo relleno para que la
 * grilla empiece en lunes y termine en domingo (para renderizar semanas completas). */
export function getMonthGrid(year: number, month0: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month0, 1);
  const lastOfMonth = new Date(year, month0 + 1, 0);
  const leadingBlank = mondayIndex(firstOfMonth);
  const trailingBlank = 6 - mondayIndex(lastOfMonth);

  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = leadingBlank; i > 0; i--) {
    days.push({ date: addDays(firstOfMonth, -i), inMonth: false });
  }
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    days.push({ date: new Date(year, month0, d), inMonth: true });
  }
  for (let i = 1; i <= trailingBlank; i++) {
    days.push({ date: addDays(lastOfMonth, i), inMonth: false });
  }
  return days;
}

export function monthLabelEs(year: number, month0: number): string {
  return `${MONTH_NAMES_ES[month0]} ${year}`;
}

/** Formato corto tipo "23 jul" usado en el resumen inferior. */
export function formatShortEs(value: string): string {
  const date = parseISODate(value);
  return `${date.getDate()} ${MONTH_SHORT_ES[date.getMonth()]}`;
}

export function formatLongEs(value: string): string {
  const date = parseISODate(value);
  return `${date.getDate()} de ${MONTH_NAMES_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

/** Número de noches entre check-in y check-out (la fecha de salida no se cobra). */
export function nightsBetween(checkInISO: string, checkOutISO: string): number {
  const a = parseISODate(checkInISO);
  const b = parseISODate(checkOutISO);
  const diffMs = b.getTime() - a.getTime();
  return Math.max(0, Math.round(diffMs / 86400000));
}

/** Lista de fechas ISO ocupadas por una noche, desde check-in (incluido)
 * hasta check-out (excluido) — igual convención que la BD: daterange '[)'. */
export function nightsList(checkInISO: string, checkOutISO: string): string[] {
  const nights = nightsBetween(checkInISO, checkOutISO);
  const start = parseISODate(checkInISO);
  const result: string[] = [];
  for (let i = 0; i < nights; i++) result.push(toISODate(addDays(start, i)));
  return result;
}
