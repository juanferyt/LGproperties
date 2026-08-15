import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "./date-utils";

export type GuestBooking = {
  id: string;
  code: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  modality: "accommodation" | "day_pass";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: string;
  totalAmount: number;
  depositAmount: number;
  createdAt: string;
  canCancel: boolean;
};

/**
 * Busca una reserva por código + correo del huésped. No hay lectura pública
 * por RLS sobre `bookings` (solo admins) a propósito: esta función corre
 * siempre en el servidor con el cliente admin, y es ELLA quien exige que el
 * correo coincida con el de la reserva antes de devolver cualquier dato —
 * así alguien no puede ver una reserva ajena solo adivinando el código.
 *
 * Devuelve null tanto si el código no existe como si el correo no coincide
 * (mismo mensaje genérico en la API para no filtrar cuál de los dos falló).
 */
export async function findGuestBooking(db: SupabaseClient, code: string, email: string): Promise<GuestBooking | null> {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await db
    .from("bookings")
    .select("id,code,check_in,check_out,adults,children,modality,status,payment_status,total_amount,deposit_amount,created_at,properties(name),customers!inner(email)")
    .eq("code", normalizedCode)
    .eq("customers.email", normalizedEmail)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const canCancel = (data.status === "pending" || data.status === "confirmed") && data.check_in > todayISO();

  return {
    id: data.id,
    code: data.code,
    propertyName: (data.properties as any)?.name ?? "",
    checkIn: data.check_in,
    checkOut: data.check_out,
    adults: data.adults,
    children: data.children,
    modality: data.modality,
    status: data.status,
    paymentStatus: data.payment_status,
    totalAmount: Number(data.total_amount),
    depositAmount: Number(data.deposit_amount),
    createdAt: data.created_at,
    canCancel,
  };
}
