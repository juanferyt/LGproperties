'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logout(){const s=await createClient();await s.auth.signOut();redirect('/login')}

export async function updateBookingStatus(formData:FormData){const s=await createClient();await s.from('bookings').update({status:String(formData.get('status'))}).eq('id',String(formData.get('id')));revalidatePath('/admin')}

export async function updateUsdRate(formData:FormData){
  const s=await createClient()
  const rate = Number(formData.get('usdRate'))
  if (!Number.isFinite(rate) || rate <= 0) redirect('/admin?error=rate')
  const { error } = await s.from('settings').upsert({ key: 'usd_to_cop_rate', value: String(rate) })
  revalidatePath('/admin')
  // La tasa también se usa en el sitio público (cotizador, calendario de precios).
  revalidatePath('/')
  revalidatePath('/propiedades/[slug]', 'page')
  redirect(error ? '/admin?error=rate' : '/admin?saved=rate')
}

/**
 * Aprueba o rechaza un comprobante de transferencia bancaria subido por el
 * huésped. Antes de esto no existía ninguna acción para avanzar un pago que
 * quedaba en `under_review`: ni se confirmaba la reserva ni contaba en
 * "Ingresos aprobados".
 */
export async function reviewTransferPayment(formData:FormData){
  const s=await createClient()
  const paymentId = String(formData.get('paymentId')||'')
  const bookingId = String(formData.get('bookingId')||'')
  const decision = String(formData.get('decision')||'')
  if (!paymentId || !bookingId || (decision!=='approve' && decision!=='reject')) redirect('/admin?error=payment')

  if (decision==='approve') {
    const { error: paymentError } = await s.from('payments').update({ status:'approved', paid_at: new Date().toISOString() }).eq('id', paymentId)
    const { error: bookingError } = await s.from('bookings').update({ payment_status:'paid' }).eq('id', bookingId)
    // Solo confirma la reserva si seguía "pending" (no reactiva una ya cancelada o completada).
    await s.from('bookings').update({ status:'confirmed' }).eq('id', bookingId).eq('status','pending')
    revalidatePath('/admin')
    redirect(paymentError||bookingError ? '/admin?error=payment' : '/admin?saved=payment')
  } else {
    const { error: paymentError } = await s.from('payments').update({ status:'failed' }).eq('id', paymentId)
    // Vuelve a "pending" para que el huésped pueda intentar de nuevo (solo si seguía en revisión).
    const { error: bookingError } = await s.from('bookings').update({ payment_status:'pending' }).eq('id', bookingId).eq('payment_status','under_review')
    revalidatePath('/admin')
    redirect(paymentError||bookingError ? '/admin?error=payment' : '/admin?saved=payment')
  }
}

export async function togglePropertyStatus(formData:FormData){
  const s=await createClient()
  const id = String(formData.get('id')||'')
  const slug = String(formData.get('slug')||'')
  const nextStatus = String(formData.get('nextStatus')||'')
  if (!id || (nextStatus !== 'active' && nextStatus !== 'inactive')) redirect('/admin?error=property')
  const { error } = await s.from('properties').update({ status: nextStatus }).eq('id', id)
  revalidatePath('/admin')
  // Una propiedad desactivada debe desaparecer de inmediato del home y de su propia página.
  revalidatePath('/')
  if (slug) revalidatePath(`/propiedades/${slug}`)
  redirect(error ? '/admin?error=property' : '/admin?saved=property')
}
