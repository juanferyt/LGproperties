export type PropertySlug = "santa-marina" | "villa-ernesta";
export type BookingMode = "stay" | "day";
export type Season = "low" | "weekend" | "high";

export function calculatePrice(input: {property: PropertySlug; guests: number; nights: number; mode?: BookingMode; season?: Season}) {
  const guests = Math.max(1, input.guests);
  const nights = Math.max(1, input.nights);
  if (input.property === "santa-marina") {
    const rate = input.season === "weekend" ? 320000 : input.season === "high" ? 450000 : 240000;
    return { rate, discount: 0, total: rate * nights };
  }
  const tier = guests <= 6 ? 0 : guests <= 12 ? 1 : 2;
  const rates = input.mode === "day" ? [300000, 380000, 480000] : [380000, 480000, 580000];
  const rate = rates[tier];
  const discount = input.mode !== "day" && nights >= 3 ? rate * 0.5 : 0;
  return { rate, discount, total: rate * nights - discount };
}
