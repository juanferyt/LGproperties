import type { BookingMode, PropertySlug, Season } from "./pricing";
export type ReservationStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "verification";
export type Reservation = {
 id: string; code: string; createdAt: string; property: PropertySlug; checkIn: string; checkOut: string;
 guests: number; nights: number; mode: BookingMode; season: Season; name: string; email: string; phone: string;
 notes: string; total: number; reservationStatus: ReservationStatus; paymentStatus: PaymentStatus;
};
