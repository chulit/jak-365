/** Format angka & Rupiah mengikuti locale id-ID. */

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('id-ID')
}

export function formatRupiah(value: number): string {
  return `Rp ${formatNumber(value)}`
}

/** 9.6 -> "9,6%" */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')}%`
}

/** +0.18 -> "+18%", -0.05 -> "-5%" (dibulatkan ke persen utuh, seperti screenshot) */
export function formatDelta(rate: number): string {
  const pct = Math.round(rate * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}
