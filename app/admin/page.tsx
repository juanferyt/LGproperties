import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logout, updateBookingStatus, updateUsdRate } from './actions'

export default async function Admin() {
  const db = await createClient()
  const adminDb = createAdminClient()
  const { data: { user } } = await db.auth.getUser()

  const [{ data: bookings }, { data: properties }, { data: payments }, { data: settings }] = await Promise.all([
    adminDb.from('bookings').select('id,code,check_in,check_out,total_amount,status,payment_status,properties(name),customers(full_name,email,phone)').order('created_at', { ascending: false }).limit(50),
    adminDb.from('properties').select('id,name,status'),
    adminDb.from('payments').select('booking_id,proof_path,method,status,reference,amount').order('created_at', { ascending: false }),
    adminDb.from('settings').select('key,value').eq('key', 'usd_to_cop_rate').maybeSingle()
  ])

  const income = (payments || []).filter((p: any) => p.status === 'approved').reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0)
  const usdRate = Number(settings?.value || 4200)

  const proofUrlsByBooking = new Map<string, string[]>()
  for (const payment of (payments || []) as Array<{ booking_id: string; proof_path: string | null }>) {
    if (!payment.booking_id || !payment.proof_path) continue
    const { data, error } = await adminDb.storage.from('payment-proofs').createSignedUrl(payment.proof_path, 60 * 60 * 24)
    if (!error && data?.signedUrl) {
      const existing = proofUrlsByBooking.get(payment.booking_id) || []
      existing.push(data.signedUrl)
      proofUrlsByBooking.set(payment.booking_id, existing)
    }
  }

  return (
    <main className="min-h-screen bg-ivory p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.3em] text-gold">LG Properties</p>
            <h1 className="mt-2 text-5xl">Panel administrativo</h1>
            <p className="mt-2 text-black/55">{user?.email}</p>
          </div>
          <form action={logout}>
            <button className="rounded-full border px-5 py-3">Cerrar sesión</button>
          </form>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['Reservas', bookings?.length || 0],
            ['Propiedades', properties?.length || 0],
            ['Ingresos aprobados', `$${income.toLocaleString('es-CO')}`]
          ].map(([label, value]) => (
            <div className="rounded-3xl bg-white p-6 shadow" key={String(label)}>
              <p className="text-sm text-black/50">{label}</p>
              <p className="mt-2 text-3xl">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-5 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl">Tasa del dólar</h2>
              <p className="mt-2 text-sm text-black/55">Ajusta la tasa usada para mostrar los precios en USD desde el panel.</p>
            </div>
            <form action={updateUsdRate} className="flex flex-wrap items-center gap-3">
              <input type="number" name="usdRate" defaultValue={usdRate} step="1" min="1" className="rounded-xl border p-3" />
              <button className="rounded-full bg-forest px-4 py-3 text-sm font-semibold text-white">Guardar tasa</button>
            </form>
          </div>
        </section>

        <section className="mt-8 overflow-x-auto rounded-3xl bg-white p-5 shadow">
          <h2 className="text-2xl">Reservas recientes</h2>
          <table className="mt-5 min-w-full text-sm">
            <thead>
              <tr className="text-left text-black/45">
                <th className="p-3">Código</th>
                <th>Cliente</th>
                <th>Propiedad</th>
                <th>Fechas</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Comprobante</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(bookings || []).map((b: any) => {
                const urls = proofUrlsByBooking.get(b.id) || []
                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-3 font-semibold">{b.code}</td>
                    <td>
                      {b.customers?.full_name}
                      <br />
                      <span className="text-xs text-black/45">{b.customers?.phone}</span>
                    </td>
                    <td>{b.properties?.name}</td>
                    <td>{b.check_in} — {b.check_out}</td>
                    <td>${Number(b.total_amount).toLocaleString('es-CO')}</td>
                    <td>{b.payment_status}</td>
                    <td>
                      {urls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {urls.map((url, index) => (
                            <a key={`${b.id}-${index}`} href={url} target="_blank" rel="noreferrer" className="rounded-full bg-gold px-3 py-2 text-xs font-semibold text-white">
                              Ver comprobante {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-black/45">Sin comprobante</span>
                      )}
                    </td>
                    <td>
                      <form action={updateBookingStatus} className="flex gap-2">
                        <input type="hidden" name="id" value={b.id} />
                        <select name="status" defaultValue={b.status} className="rounded-lg border p-2">
                          <option value="pending">Pendiente</option>
                          <option value="confirmed">Confirmada</option>
                          <option value="cancelled">Cancelada</option>
                          <option value="completed">Completada</option>
                        </select>
                        <button className="rounded-lg bg-ink px-3 text-white">Guardar</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
