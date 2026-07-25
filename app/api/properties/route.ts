import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(){
 const db=createAdminClient()
 const {data,error}=await db.from('properties').select('id,name,slug,capacity,deposit_percentage').eq('status','active').order('name')
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json(data)
}
