import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingCancelSchema } from "@/lib/validation";
import { findGuestBooking } from "@/lib/booking/lookup";

const NOT_FOUND_MESSAGE = "No encontramos ninguna reserva con ese código y correo. Verifica que ambos coincidan exactamente con los de tu confirmación.";

export async function POST(req: NextRequest) {
  try {
    const { code, email } = bookingCancelSchema.parse(await req.json());
    const db = createAdminClient();
    const booking = await findGuestBooking(db, code, email);
    if (!booking) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });

    if (!booking.canCancel) {
      const reason =
        booking.status === "cancelled" ? "Esta reserva ya estaba cancelada."
        : booking.status === "completed" ? "Esta reserva ya se completó, no se puede cancelar."
        : "Ya no se puede cancelar en línea porque la fecha de entrada ya pasó o es hoy. Escríbenos por WhatsApp.";
      return NextResponse.json({ error: reason }, { status: 409 });
    }

    const { error } = await db.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const updated = await findGuestBooking(db, code, email);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error.message || NOT_FOUND_MESSAGE }, { status: 400 });
  }
}
