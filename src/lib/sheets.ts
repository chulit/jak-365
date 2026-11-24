import { sampleData } from '../data/sample'
import type { DashboardData, PreviousTotals, Transaction, UmkmMaster, UmkmTarget } from './types'

export const SHEET_TABS = {
  transaksi: 'Transaksi',
  umkm: 'UMKM',
  klikLink: 'Klik_Link',
  ringkasan: 'Ringkasan',
  target: 'Target',
} as const

/** ID Sheet dari .env (VITE_SHEET_ID) — kosong = pakai data contoh. */
export function sheetIdFromEnv(): string {
  return (import.meta.env.VITE_SHEET_ID as string | undefined)?.trim() ?? ''
}

/** Parser CSV minimal yang benar menangani field ber-tanda kutip. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((c) => c.trim() !== '')) rows.push(row)
  }
  return rows
}

const num = (v: string | undefined): number => {
  const n = Number((v ?? '').replace(/[.\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Seperti num(), tapi sel kosong = null (data tidak tersedia, bukan 0). */
const numOrNull = (v: string | undefined): number | null => {
  if ((v ?? '').trim() === '') return null
  const n = Number((v ?? '').replace(/[.\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Normalisasi kolom bulan ke "YYYY-MM". Google Sheets kadang menafsirkan
 * "2026-07" sebagai tanggal dan menampilkannya sebagai "2026-7" (tanpa
 * nol di depan) — tanpa normalisasi, perbandingan string "2026-7" <=
 * "2026-11" salah dan baris itu hilang dari hitungan. Dipakai untuk
 * tab Transaksi dan Klik_Link.
 */
export function normalizeMonth(v: string | undefined): string {
  const m = (v ?? '').trim().match(/^(\d{4})-(\d{1,2})$/)
  if (!m) return (v ?? '').trim()
  return `${m[1]}-${m[2].padStart(2, '0')}`
}

async function fetchTabCsv(sheetId: string, tab: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Tab "${tab}" tidak bisa dibaca (HTTP ${res.status}). Pastikan Sheet dibagikan "Siapa saja yang memiliki link dapat melihat".`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error(`Tab "${tab}" tidak bisa dibaca — Sheet belum dibagikan untuk publik atau ID salah.`)
  }
  return parseCsv(text)
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ''))
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
}

/**
 * Muat data dari Google Sheet via endpoint gviz CSV (tanpa API key).
 * Syarat: Sheet dibagikan "Siapa saja yang memiliki link dapat melihat"
 * dan punya tab Transaksi + UMKM (lihat sheets-template/README.md).
 * Tab Klik_Link dipakai sebagai cek silang; tab Ringkasan (opsional)
 * berisi total periode sebelumnya untuk delta KPI; tab Target (opsional)
 * berisi target individual per UMKM untuk Skor Indikator.
 * Lempar Error bila Sheet tidak terbaca — pemanggil menampilkan pesan
 * dan tetap memakai data contoh.
 */
export async function loadFromGoogleSheet(sheetId: string): Promise<DashboardData> {
  const id = sheetId.trim()
  if (!id) throw new Error('ID Google Sheet kosong.')

  const [txRows, umkmRows] = await Promise.all([
    fetchTabCsv(id, SHEET_TABS.transaksi),
    fetchTabCsv(id, SHEET_TABS.umkm),
  ])
  const transactions: Transaction[] = rowsToObjects(txRows)
    .filter((r) => r.nama_umkm && r.bulan)
    .map((r) => ({
      tanggal: r.tanggal || `${normalizeMonth(r.bulan)}-15`,
      bulan: normalizeMonth(r.bulan),
      namaUmkm: r.nama_umkm,
      kategori: r.kategori || 'Lainnya',
      wilayah: r.wilayah || '—',
      mitra: r.mitra_pemasaran || '—',
      pesanan: num(r.pesanan),
      transaksi: num(r.transaksi),
      omzet: num(r.omzet),
      klik: num(r.klik),
    }))
  if (transactions.length === 0) throw new Error('Tab "Transaksi" kosong atau format kolomnya tidak dikenali.')

  const umkm: UmkmMaster[] = rowsToObjects(umkmRows)
    .filter((r) => r.nama_umkm)
    .map((r) => {
      const transaksi = num(r.transaksi)
      const pesanan = num(r.pesanan)
      const omzet = num(r.omzet)
      // Bila tab UMKM tidak membawa total transaksi/omzet, hitung dari Transaksi.
      const fromTx = transactions.filter((t) => t.namaUmkm === r.nama_umkm)
      return {
        namaUmkm: r.nama_umkm,
        kategori: r.kategori || 'Lainnya',
        wilayah: r.wilayah || '—',
        // Tab UMKM baru tidak punya kolom mitra — mitra utama diturunkan
        // dari transaksi (baris pertama = mitra yang muncul di transaksi).
        mitra: r.mitra_pemasaran || fromTx[0]?.mitra || '—',
        // Kolom produk/repeat kosong di master TEI → null (bukan 0):
        // dashboard menampilkan "—" untuk indikator terkait.
        jumlahProduk: numOrNull(r.jumlah_produk),
        produkAktif: numOrNull(r.produk_aktif),
        transaksi: transaksi || fromTx.reduce((a, t) => a + t.transaksi, 0),
        pesanan: pesanan || fromTx.reduce((a, t) => a + t.pesanan, 0),
        omzet: omzet || fromTx.reduce((a, t) => a + t.omzet, 0),
        repeatTransaksi: numOrNull(r.repeat_transaksi),
        namaPemilik: r.nama_pemilik || '—',
        izinUsaha: r.izin_usaha || '—',
        instagramWebsite: r.instagram_website || '',
        penjelasanProduk: r.penjelasan_produk || '',
      }
    })

  // Cek silang Klik_Link (opsional): hanya peringatan bila tidak cocok.
  try {
    const klikRows = rowsToObjects(await fetchTabCsv(id, SHEET_TABS.klikLink))
    const klikLinkTotal = klikRows.reduce((a, r) => a + num(r.klik), 0)
    const klikTxTotal = transactions.reduce((a, t) => a + t.klik, 0)
    if (klikRows.length > 0 && klikLinkTotal !== klikTxTotal) {
      console.warn(`[monev] Klik_Link total (${klikLinkTotal}) ≠ kolom klik Transaksi (${klikTxTotal}); memakai kolom klik Transaksi.`)
    }
  } catch {
    // Tab Klik_Link opsional — abaikan bila tidak ada.
  }

  // Ringkasan (opsional): total periode sebelumnya.
  let previous: PreviousTotals = sampleData.previous
  try {
    const ringkasan = rowsToObjects(await fetchTabCsv(id, SHEET_TABS.ringkasan))
    const get = (metrik: string): number => {
      const row = ringkasan.find((r) => r.metrik?.toLowerCase() === metrik)
      return row ? num(row.nilai) : 0
    }
    const parsed: PreviousTotals = {
      omzet: get('omzet'), transaksi: get('transaksi'), pesanan: get('pesanan'), klik: get('klik'),
    }
    if (parsed.omzet > 0) previous = parsed
  } catch {
    // Tanpa Ringkasan, pakai default dari data contoh.
  }

  // Target (opsional, load independen seperti Ringkasan): target
  // individual per UMKM untuk Skor Indikator. ATURAN NO-FALLBACK
  // (perintah user 2026-11-18, berlaku juga untuk tab Target):
  // bila tab belum ada / gagal dibaca / kosong, targets = [] dan
  // targetsError diisi pesan jujur — skor tampil "—" di seksi Capaian
  // Indikator. JANGAN pakai target contoh dari sample.ts.
  let targets: UmkmTarget[] = []
  let targetsError: string | null = null
  try {
    const targetRows = rowsToObjects(await fetchTabCsv(id, SHEET_TABS.target))
    const parsed: UmkmTarget[] = targetRows
      .filter((r) => r.nama_umkm)
      .map((r) => ({
        namaUmkm: r.nama_umkm,
        targetOmzet: num(r.target_omzet),
        targetTransaksi: num(r.target_transaksi),
        targetProdukAktif: num(r.target_produk_aktif),
        targetKonversi: num(r.target_konversi),
        targetRepeat: num(r.target_repeat),
      }))
      .filter((t) => t.targetOmzet > 0 || t.targetTransaksi > 0 || t.targetRepeat > 0)
    if (parsed.length > 0) {
      targets = parsed
    } else {
      targetsError = 'Tab "Target" kosong — belum ada baris target per UMKM.'
    }
  } catch (err) {
    targetsError = err instanceof Error ? err.message : 'Tab "Target" tidak bisa dibaca.'
  }

  return { transactions, umkm, previous, targets, targetsError }
}
