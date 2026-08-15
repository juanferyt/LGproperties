import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingLookupSchema } from "@/lib/validation";
import { findGuestBooking } from "@/lib/booking/lookup";

const NOT_FOUND_MESSAGE = "No encontramos ninguna reserva con ese código y correo. Verifica que ambos coincidan exactamente con los de tu confirmación.";

export async function POST(req: NextRequest) {
  try {
    const { code, email } = bookingLookupSchema.parse(await req.json());
    const db = createAdminClient();
    const booking = await findGuestBooking(db, code, email);
    if (!booking) return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error.message || NOT_FOUND_MESSAGE }, { status: 400 });
  }
}
