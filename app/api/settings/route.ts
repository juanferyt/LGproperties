import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db.from('settings').select('value').eq('key', 'usd_to_cop_rate').maybeSingle()
    if (error) throw error
    const parsed = Number(data?.value || 4200)
    const rate = Number.isFinite(parsed) && parsed > 0 ? parsed : 4200
    return NextResponse.json({ usdToCopRate: rate })
  } catch {
    return NextResponse.json({ usdToCopRate: 4200 })
  }
}
