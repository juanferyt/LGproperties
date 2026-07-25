import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const bookingId = String(form.get('bookingId') || '')
  const file = form.get('file') as File | null
  if (!bookingId || !file || file.size > 8_000_000) return NextResponse.json({ error:'Archivo inválido (máximo 8 MB)' }, { status:400 })
  const allowed = ['image/jpeg','image/png','application/pdf']
  if (!allowed.includes(file.type)) return NextResponse.json({ error:'Solo JPG, PNG o PDF' }, { status:400 })
  const db = createAdminClient()
  const path = `${bookingId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
  const { error } = await db.storage.from('payment-proofs').upload(path, file, { contentType:file.type, upsert:false })
  if (error) return NextResponse.json({ error:error.message }, { status:500 })
  await db.from('payments').insert({ booking_id:bookingId, reference:`TRANSFER-${Date.now()}`, amount:0, method:'bank_transfer', status:'under_review', proof_path:path })
  await db.from('bookings').update({ payment_status:'under_review' }).eq('id', bookingId)
  return NextResponse.json({ ok:true })
}
