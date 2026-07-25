'use server'
import { createClient } from '@/lib/supabase/server'
export async function reset(formData:FormData){ const supabase=await createClient(); await supabase.auth.resetPasswordForEmail(String(formData.get('email')), { redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password` }) }
