import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(req:NextRequest){
 if(req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401})
 const db=createAdminClient();const {data:feeds}=await db.from('ical_feeds').select('*').eq('active',true)
 // La importación iCal necesita las URL privadas reales. Este endpoint deja registrada la ejecución y el punto de extensión.
 for(const feed of feeds||[])await db.from('ical_feeds').update({last_sync_at:new Date().toISOString()}).eq('id',feed.id)
 return NextResponse.json({ok:true,feeds:(feeds||[]).length,note:'Añade el parser iCal cuando cargues las URL privadas de Airbnb.'})
}
