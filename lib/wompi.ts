import crypto from 'crypto'

export function wompiIntegritySignature(reference: string, amountInCents: number, currency = 'COP') {
  const secret = process.env.WOMPI_INTEGRITY_SECRET
  if (!secret) throw new Error('Falta WOMPI_INTEGRITY_SECRET')
  return crypto.createHash('sha256').update(`${reference}${amountInCents}${currency}${secret}`).digest('hex')
}

export function verifyWompiEvent(payload: any) {
  const secret = process.env.WOMPI_EVENTS_SECRET
  if (!secret || !payload?.signature?.properties || !payload?.timestamp || !payload?.signature?.checksum) return false
  const values = payload.signature.properties.map((path: string) => path.split('.').reduce((obj: any, key: string) => obj?.[key], payload.data))
  const raw = `${values.join('')}${payload.timestamp}${secret}`
  return crypto.createHash('sha256').update(raw).digest('hex') === payload.signature.checksum
}
