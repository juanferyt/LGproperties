export async function getUsdToCopRate() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/settings`, { cache: 'no-store' })
  if (!res.ok) return 4200
  const data = await res.json()
  const parsed = Number(data?.usdToCopRate || 4200)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4200
}

export function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export async function copToUsd(cop: number) {
  const rate = await getUsdToCopRate()
  return cop / rate
}
