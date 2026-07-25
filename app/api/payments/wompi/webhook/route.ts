import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWompiEvent } from '@/lib/wompi'

export async function POST(req: NextRequest) {
  const payload = await req.json()
  if (!verifyWompiEvent(payload)) return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  if (payload.event === 'transaction.updated') {
    const tx = payload.data.transaction
    const statusMap: Record<string,string> = { APPROVED:'approved', DECLINED:'declined', VOIDED:'refunded', ERROR:'failed', PENDING:'pending' }
    const db = createAdminClient()
    const { data: payment } = await db.from('payments').update({ status: statusMap[tx.status] || 'pending', provider_id: tx.id, provider_payload: payload, paid_at: tx.status === 'APPROVED' ? new Date().toISOString() : null }).eq('reference', tx.reference).select('booking_id').single()
    if (payment?.booking_id && tx.status === 'APPROVED') await db.from('bookings').update({ payment_status:'paid', status:'confirmed' }).eq('id', payment.booking_id)
  }
  return NextResponse.json({ received: true })
}
