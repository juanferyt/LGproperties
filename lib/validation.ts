import { z } from 'zod'

export const bookingSchema = z.object({
  propertyId: z.string().uuid(),
  fullName: z.string().min(3).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(30),
  document: z.string().max(40).optional().default(''),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  adults: z.coerce.number().int().min(1).max(30),
  children: z.coerce.number().int().min(0).max(20),
  modality: z.enum(['accommodation','day_pass']),
  notes: z.string().max(1000).optional().default(''),
  paymentOption: z.enum(['full','deposit']).default('deposit'),
  acceptedTerms: z.literal(true),
}).refine(v => new Date(v.checkOut) > new Date(v.checkIn), { message: 'La salida debe ser posterior a la entrada', path: ['checkOut'] })

// Usados por /mi-reserva: el huésped se identifica con el código de su
// reserva + el correo con el que reservó (mismos dos datos que ya tiene en
// su correo/WhatsApp de confirmación). No se expone nada por RLS pública:
// la verificación ocurre en el servidor antes de responder.
export const bookingLookupSchema = z.object({
  code: z.string().trim().min(3).max(60),
  email: z.string().trim().email(),
})
export const bookingCancelSchema = bookingLookupSchema
