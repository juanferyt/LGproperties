'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logout(){const s=await createClient();await s.auth.signOut();redirect('/login')}

export async function updateBookingStatus(formData:FormData){const s=await createClient();await s.from('bookings').update({status:String(formData.get('status'))}).eq('id',String(formData.get('id')));revalidatePath('/admin')}

export async function updateUsdRate(formData:FormData){
  const s=await createClient()
  const rate = Number(formData.get('usdRate'))
  if (!Number.isFinite(rate) || rate <= 0) return
  await s.from('settings').upsert({ key: 'usd_to_cop_rate', value: String(rate) })
  revalidatePath('/admin')
}
