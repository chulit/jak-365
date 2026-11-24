import { sampleData } from '../data/sample'
import type {
  DashboardData, KanalRef, MitraMaster, Penugasan, PreviousTotals, ProdukKatalog,
  Transaction, UmkmMaster, UmkmTarget,
} from './types'

export const SHEET_TABS = {
  transaksi: 'Transaksi',
  umkm: 'UMKM',
  mitra: 'Mitra',
  kanal: 'Kanal',
  katalog: 'Katalog',
  penugasan: 'Penugasan',
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
 * Tab Klik_Link dipakai sebagai cek silang; tab Ringkasan berisi total
 * periode sebelumnya untuk delta KPI; tab Target berisi target individual
 * per UMKM untuk Skor Indikator; tab Mitra/Kanal/Katalog/Penugasan
 * adalah master referensi struktur relasional (ID unik) — bila tidak
 * ada, dashboard tetap jalan dari Transaksi + UMKM.
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
      idUmkm: r.id_umkm || '',
      namaUmkm: r.nama_umkm,
      kategori: r.kategori || 'Lainnya',
      wilayah: r.wilayah || '—',
      idMitra: r.id_mitra || '',
      mitra: r.mitra_pemasaran || '—',
      idKanal: r.id_kanal || '',
      kanal: r.kanal_pemesanan || '—',
      pesanan: num(r.pesanan),
      transaksi: num(r.transaksi),
      omzet: num(r.omzet),
      klik: num(r.klik),
      inquiry: num(r.jumlah_inquiry),
    }))
  if (transactions.length === 0) throw new Error('Tab "Transaksi" kosong atau format kolomnya tidak dikenali.')

  const umkm: UmkmMaster[] = rowsToObjects(umkmRows)
    .filter((r) => r.nama_umkm)
    .map((r) => {
      const transaksi = num(r.transaksi)
      // Bila tab UMKM tidak membawa total transaksi, hitung dari Transaksi.
      // (Kolom pesanan/omzet dihapus dari master 2026-11-24 — redundan;
      //  semua angka pesanan/omzet dihitung dari tab Transaksi.)
      const fromTx = transactions.filter((t) => t.namaUmkm === r.nama_umkm)
      return {
        idUmkm: r.id_umkm || '',
        kodePeserta: r.kode_peserta || '—',
        grade: r.grade || '—',
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
        repeatTransaksi: numOrNull(r.repeat_transaksi),
        namaPemilik: r.nama_pemilik || '—',
        izinUsaha: r.izin_usaha || '—',
        instagramWebsite: r.instagram_website || '',
        penjelasanProduk: r.penjelasan_produk || '',
      }
    })

  // Master referensi (opsional, dibaca independen): Mitra, Kanal,
  // Katalog, Penugasan. Bila tab tidak ada / gagal dibaca, array kosong
  // — dashboard tetap jalan dari Transaksi + UMKM (nama sebagai label).
  const loadOptional = async <T>(tab: string, map: (r: Record<string, string>) => T): Promise<T[]> => {
    try {
      return rowsToObjects(await fetchTabCsv(id, tab)).filter((r) => Object.values(r).some((v) => v)).map(map)
    } catch {
      return []
    }
  }
  const [mitra, kanal, katalog, penugasan] = await Promise.all([
    loadOptional<MitraMaster>(SHEET_TABS.mitra, (r) => ({
      idMitra: r.id_mitra || '',
      namaMitra: r.nama_mitra || '—',
      jenis: r.jenis || '—',
      pic: r.pic || '',
      kontak: r.kontak || '',
      email: r.email || '',
      kategoriProduk: r.kategori_produk || '—',
      wilayah: r.wilayah || '—',
      kanal: (r.kanal || '').split(';').map((s) => s.trim()).filter(Boolean),
      status: r.status || '—',
      dokumen: r.dokumen || '',
      catatan: r.catatan || '',
    })),
    loadOptional<KanalRef>(SHEET_TABS.kanal, (r) => ({
      idKanal: r.id_kanal || '',
      namaKanal: r.nama_kanal || '—',
      kategori: r.kategori || '—',
    })),
    loadOptional<ProdukKatalog>(SHEET_TABS.katalog, (r) => ({
      idProduk: r.id_produk || '',
      idUmkm: r.id_umkm || '',
      namaUmkm: r.nama_umkm || '—',
      namaProduk: r.nama_produk || '—',
      kategori: r.kategori || 'Lainnya',
      harga: num(r.harga),
      stok: num(r.stok),
      satuan: r.satuan || 'pcs',
      statusVerifikasi: r.status_verifikasi || '—',
    })),
    loadOptional<Penugasan>(SHEET_TABS.penugasan, (r) => ({
      idPenugasan: r.id_penugasan || '',
      idUmkm: r.id_umkm || '',
      namaUmkm: r.nama_umkm || '—',
      idMitra: r.id_mitra || '',
      namaMitra: r.nama_mitra || '—',
      idKanal: r.id_kanal || '',
      kanal: r.kanal || '—',
      periode: r.periode || '—',
      status: r.status || '—',
    })),
  ])

  // Backfill ID yang kosong di Transaksi dari master (berdasarkan nama):
  // Sheet lama / baris yang diedit manual mungkin belum membawa ID —
  // sambungan tetap jalan lewat nama, bukan putus.
  const umkmByName = new Map(umkm.map((u) => [u.namaUmkm, u]))
  const mitraByName = new Map(mitra.map((m) => [m.namaMitra, m]))
  const kanalByName = new Map(kanal.map((k) => [k.namaKanal, k]))
  transactions.forEach((t) => {
    if (!t.idUmkm) t.idUmkm = umkmByName.get(t.namaUmkm)?.idUmkm ?? ''
    if (!t.idMitra) t.idMitra = mitraByName.get(t.mitra)?.idMitra ?? ''
    if (!t.idKanal) t.idKanal = kanalByName.get(t.kanal)?.idKanal ?? ''
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
        idUmkm: r.id_umkm || '',
        namaUmkm: r.nama_umkm,
        targetOmzet: num(r.target_omzet),
        targetTransaksi: num(r.target_transaksi),
        targetProdukAktif: num(r.target_produk_aktif),
        targetKonversi: num(r.target_konversi),
        targetRepeat: num(r.target_repeat),
        targetInquiry: num(r.target_inquiry),
        targetKanalAktif: num(r.target_kanal_aktif),
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

  return { transactions, umkm, previous, targets, targetsError, mitra, kanal, katalog, penugasan }
}
