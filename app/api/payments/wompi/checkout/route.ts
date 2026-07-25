import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { wompiIntegritySignature } from '@/lib/wompi'

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json()
  const db = createAdminClient()
  const { data: booking, error } = await db.from('bookings').select('id,code,total_amount,deposit_amount,status').eq('id', bookingId).single()
  if (error || !booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  const amount = Number(booking.deposit_amount || booking.total_amount)
  if (!amount || amount <= 0) return NextResponse.json({ error: 'El monto a pagar no es válido' }, { status: 400 })
  const amountInCents = Math.round(amount * 100)
  const reference = `${booking.code}-${Date.now()}`
  const signature = wompiIntegritySignature(reference, amountInCents)
  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reserva/${booking.code}`
  await db.from('payments').insert({ booking_id: booking.id, reference, amount, method: 'wompi', status: 'pending' })
  const checkoutUrl = new URL('https://checkout.wompi.co/p/')
  checkoutUrl.searchParams.set('public-key', process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '')
  checkoutUrl.searchParams.set('currency', 'COP')
  checkoutUrl.searchParams.set('amount-in-cents', String(amountInCents))
  checkoutUrl.searchParams.set('reference', reference)
  checkoutUrl.searchParams.set('signature:integrity', signature)
  checkoutUrl.searchParams.set('redirect-url', redirectUrl)
  return NextResponse.json({
    checkoutUrl: checkoutUrl.toString(), publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
    currency: 'COP', amountInCents, reference, signature,
    redirectUrl
  })
}
