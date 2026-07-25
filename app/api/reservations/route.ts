import { NextRequest, NextResponse } from 'next/server'
import { bookingSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingEmail, sendWhatsAppTemplate } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const parsed = bookingSchema.parse(await req.json())
    const db = createAdminClient()
    const { data, error } = await db.rpc('create_public_booking', {
      p_property_id: parsed.propertyId, p_full_name: parsed.fullName, p_email: parsed.email,
      p_phone: parsed.phone, p_document: parsed.document, p_check_in: parsed.checkIn,
      p_check_out: parsed.checkOut, p_adults: parsed.adults, p_children: parsed.children,
      p_modality: parsed.modality, p_notes: parsed.notes, p_payment_option: parsed.paymentOption
    })
    if (error) {
      const status = error.message.includes('NO_AVAILABLE') ? 409 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    await Promise.allSettled([
      sendBookingEmail({ to: parsed.email, code: data.code, property: data.property_name, total: data.total_amount, checkIn: parsed.checkIn, checkOut: parsed.checkOut }),
      sendWhatsAppTemplate(parsed.phone, `LG Properties recibió tu reserva ${data.code}. Total estimado: $${Number(data.total_amount).toLocaleString('es-CO')} COP.`)
    ])
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error.message || 'No se pudo crear la reserva' }, { status: 400 })
  }
}
