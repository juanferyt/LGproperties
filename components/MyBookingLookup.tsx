"use client";

import { useState } from "react";
import { formatCop } from "@/lib/currency";

type Booking = {
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

const RESERVATION_LABEL: Record<Booking["status"], string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pendiente",
  under_review: "En revisión",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

export function MyBookingLookup() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setBooking(null);
    try {
      const res = await fetch("/api/reservations/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo consultar la reserva");
      setBooking(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!booking) return;
    if (!confirm(`¿Seguro que quieres cancelar la reserva ${booking.code}? Esta acción no se puede deshacer.`)) return;
    setCancelling(true);
    setError("");
    try {
      const res = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: booking.code, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cancelar la reserva");
      setBooking(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-[2rem] bg-white p-7 shadow-luxury md:p-8">
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Consulta tu reserva</p>
      <h1 className="mt-3 text-4xl">Mi reserva</h1>
      <p className="mt-3 text-black/60">
        Ingresa el código de tu reserva (ej. <span className="font-mono">LGP-260814-AB12CD</span>) y el correo con el que reservaste. Ambos están en el correo y mensaje de confirmación que recibiste.
      </p>

      <form onSubmit={lookup} className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm sm:col-span-1">
          Código de reserva
          <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="LGP-260814-AB12CD" className="rounded-xl border border-black/15 p-3 font-mono uppercase" />
        </label>
        <label className="grid gap-2 text-sm sm:col-span-1">
          Correo con el que reservaste
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-black/15 p-3" />
        </label>
        <button disabled={loading} className="sm:col-span-2 rounded-full bg-gold px-6 py-4 font-semibold text-white disabled:opacity-50">
          {loading ? "Consultando…" : "Consultar reserva"}
        </button>
      </form>

      {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {booking && (
        <div className="mt-7 rounded-[1.5rem] border border-black/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-black/45">Código</p>
              <p className="font-mono text-lg font-semibold">{booking.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-black/5 px-3 py-2 text-xs font-semibold">{RESERVATION_LABEL[booking.status]}</span>
              <span className="rounded-full bg-black/5 px-3 py-2 text-xs font-semibold">{PAYMENT_LABEL[booking.paymentStatus] || booking.paymentStatus}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-black/70 sm:grid-cols-2">
            <p><span className="font-semibold text-black">Propiedad:</span> {booking.propertyName}</p>
            <p><span className="font-semibold text-black">Modalidad:</span> {booking.modality === "day_pass" ? "Pasadía" : "Alojamiento"}</p>
            <p><span className="font-semibold text-black">Entrada:</span> {booking.checkIn}</p>
            <p><span className="font-semibold text-black">Salida:</span> {booking.checkOut}</p>
            <p><span className="font-semibold text-black">Huéspedes:</span> {booking.adults} adultos{booking.children > 0 ? `, ${booking.children} niños` : ""}</p>
            <p><span className="font-semibold text-black">Total:</span> {formatCop(booking.totalAmount)}</p>
            <p><span className="font-semibold text-black">Anticipo/valor a pagar:</span> {formatCop(booking.depositAmount)}</p>
          </div>

          {booking.status === "cancelled" ? (
            <p className="mt-6 rounded-xl bg-black/5 p-4 text-sm text-black/60">Esta reserva está cancelada.</p>
          ) : booking.canCancel ? (
            <div className="mt-6">
              <button onClick={cancel} disabled={cancelling} className="rounded-full border border-red-600 px-6 py-3 text-sm font-semibold text-red-600 disabled:opacity-50">
                {cancelling ? "Cancelando…" : "Cancelar reserva"}
              </button>
              <p className="mt-3 text-xs text-black/45">
                Esto libera tus fechas de inmediato. Si ya realizaste un pago, la devolución no es automática — escríbenos por{" "}
                <a className="underline" href="https://wa.me/573113035593">WhatsApp</a> para coordinarla.
              </p>
            </div>
          ) : (
            <p className="mt-6 text-xs text-black/45">Ya no se puede cancelar en línea (la fecha de entrada ya pasó, es hoy, o la reserva ya se completó). Escríbenos por WhatsApp si necesitas ayuda.</p>
          )}
        </div>
      )}
    </div>
  );
}
