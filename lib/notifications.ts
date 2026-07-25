import { Resend } from 'resend'

export async function sendBookingEmail(input: { to: string; code: string; property: string; total: number; checkIn: string; checkOut: string }) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'LG Properties <onboarding@resend.dev>',
    to: [input.to],
    bcc: process.env.ADMIN_NOTIFICATION_EMAIL ? [process.env.ADMIN_NOTIFICATION_EMAIL] : undefined,
    subject: `Reserva recibida ${input.code}`,
    html: `<div style="font-family:Arial;max-width:600px;margin:auto"><h1>LG Properties</h1><p>Recibimos tu solicitud de reserva.</p><p><strong>Código:</strong> ${input.code}</p><p><strong>Propiedad:</strong> ${input.property}</p><p><strong>Fechas:</strong> ${input.checkIn} a ${input.checkOut}</p><p><strong>Total estimado:</strong> $${input.total.toLocaleString('es-CO')} COP</p><p>La reserva se confirmará cuando el pago sea aprobado.</p></div>`
  })
}

export async function sendWhatsAppTemplate(to: string, message: string) {
  const token = process.env.META_WHATSAPP_TOKEN
  const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) return
  await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/\D/g,''), type: 'text', text: { body: message } })
  })
}
