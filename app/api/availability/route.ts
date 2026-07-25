import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('propertyId')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  if (!propertyId || !from || !to) return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 })
  const db = createAdminClient()
  const { data, error } = await db.rpc('check_property_availability', { p_property_id: propertyId, p_check_in: from, p_check_out: to })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ available: Boolean(data) })
}
