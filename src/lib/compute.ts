import type { DashboardData, UmkmTarget } from './types'

export const ALL = 'semua'

export interface MonthDef {
  key: string
  label: string
}

export const MONTHS: MonthDef[] = [
  { key: '2026-07', label: 'Jul' },
  { key: '2026-08', label: 'Agu' },
  { key: '2026-09', label: 'Sep' },
  { key: '2026-10', label: 'Okt' },
  { key: '2026-11', label: 'Nov' },
]

/**
 * Opsi periode. SEMANTIK PENTING (mengikuti mockup): angka-angka dashboard
 * dihitung sejak Jul 2026 sampai akhir periode terpilih.
 * Setiap opsi adalah JENDELA bulan (start–end) — itulah kenapa
 * "Okt – Nov 2026" menampilkan total Rp 333.023.341, bukan hanya
 * omzet Okt+Nov. Grafik Tren Omzet hanya menampilkan bulan-bulan di dalam
 * jendela ini (nilainya tetap dihitung sejak Jul 2026).
 */
export interface PeriodeOption {
  value: string
  label: string
  /** Bulan awal jendela (YYYY-MM). */
  start: string
  /** Bulan akhir jendela = bulan akhir hitungan (YYYY-MM). */
  end: string
}

export const PERIODE_OPTIONS: PeriodeOption[] = [
  { value: '2026-10_2026-11', label: 'Okt – Nov 2026', start: '2026-10', end: '2026-11' },
  { value: '2026-07_2026-11', label: 'Jul – Nov 2026', start: '2026-07', end: '2026-11' },
  { value: '2026-09_2026-10', label: 'Sep – Okt 2026', start: '2026-09', end: '2026-10' },
  { value: '2026-08_2026-09', label: 'Agu – Sep 2026', start: '2026-08', end: '2026-09' },
  { value: '2026-07_2026-08', label: 'Jul – Agu 2026', start: '2026-07', end: '2026-08' },
  { value: '2026-07_2026-07', label: 'Jul 2026', start: '2026-07', end: '2026-07' },
]

export function periodeById(value: string): PeriodeOption {
  return PERIODE_OPTIONS.find((o) => o.value === value) ?? PERIODE_OPTIONS[0]
}

export function periodeId(start: string, end: string): string {
  return PERIODE_OPTIONS.find((o) => o.start === start && o.end === end)?.value ?? `${start}_${end}`
}

/** Label periode ("Okt – Nov 2026") dari jendela bulan awal–akhir. */
export function periodeLabel(start: string, end: string): string {
  const found = PERIODE_OPTIONS.find((o) => o.start === start && o.end === end)
  if (found) return found.label
  const startLabel = MONTHS.find((m) => m.key === start)?.label ?? start
  const endLabel = MONTHS.find((m) => m.key === end)?.label ?? end
  return start === end ? `${startLabel} 2026` : `${startLabel} – ${endLabel} 2026`
}

export interface Filters {
  /** Bulan awal jendela periode (YYYY-MM) — membatasi grafik Tren Omzet dan dialog detail UMKM. */
  startMonth: string
  /** Bulan akhir periode (YYYY-MM) — batas akhir semua angka dashboard. */
  endMonth: string
  mitra: string
  kategori: string
  wilayah: string
}

export interface Kpi {
  id: string
  title: string
  value: string
  /** Laju perubahan vs periode sebelumnya (null = tidak ada delta). */
  delta: number | null
}

export interface MonthlyPoint {
  label: string
  value: number
}

/** Granularitas grafik Tren Omzet: 'bulanan' atau 'mingguan'. */
export type Granularity = 'bulanan' | 'mingguan'

export interface WeeklyPoint {
  /** Tanggal Senin awal minggu (YYYY-MM-DD, kunci unik). */
  key: string
  /** Label rentang tanggal, mis. "6–12 Okt" atau "26 Okt–1 Nov". */
  label: string
  start: string
  end: string
  omzet: number
  transaksi: number
  pesanan: number
}

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function parseDateUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysUTC(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

/** Label rentang tanggal dalam periode, mis. "6–12 Okt", "26 Okt–1 Nov", "30 Nov". */
export function weekRangeLabel(startIso: string, endIso: string): string {
  const s = parseDateUTC(startIso)
  const e = parseDateUTC(endIso)
  const sDay = s.getUTCDate()
  const eDay = e.getUTCDate()
  const sMon = BULAN_SINGKAT[s.getUTCMonth()]
  const eMon = BULAN_SINGKAT[e.getUTCMonth()]
  if (startIso === endIso) return `${sDay} ${sMon}`
  if (sMon === eMon) return `${sDay}–${eDay} ${sMon}`
  return `${sDay} ${sMon}–${eDay} ${eMon}`
}

/**
 * Minggu ISO (Senin–Minggu) yang bersinggungan dengan periode
 * startMonth–endMonth, dipotong di awal/akhir periode. Minggu sebagian
 * di ujung tetap ditampilkan dengan label rentang sebenarnya di dalam
 * periode (mis. Okt–Nov 2026 → "1–4 Okt" … "30 Nov", total 10 minggu).
 */
export function weekBuckets(startMonth: string, endMonth: string): { key: string; start: string; end: string; label: string }[] {
  const [sy, sm] = startMonth.split('-').map(Number)
  const [ey, em] = endMonth.split('-').map(Number)
  const periodStart = new Date(Date.UTC(sy, sm - 1, 1))
  const periodEnd = new Date(Date.UTC(ey, em, 0))
  // Senin pada/ sebelum hari pertama periode.
  const firstMonday = addDaysUTC(periodStart, -((periodStart.getUTCDay() + 6) % 7))
  const buckets = []
  for (let mon = firstMonday; mon <= periodEnd; mon = addDaysUTC(mon, 7)) {
    const start = mon < periodStart ? periodStart : mon
    const sunday = addDaysUTC(mon, 6)
    const end = sunday > periodEnd ? periodEnd : sunday
    buckets.push({ key: isoOf(mon), start: isoOf(start), end: isoOf(end), label: weekRangeLabel(isoOf(start), isoOf(end)) })
  }
  return buckets
}

/** Titik mingguan dari baris transaksi yang sudah terfilter ke periode. */
function weeklyPointsFromTx(
  tx: DashboardData['transactions'],
  startMonth: string,
  endMonth: string,
): WeeklyPoint[] {
  return weekBuckets(startMonth, endMonth).map((b) => {
    const rows = tx.filter((t) => t.tanggal >= b.start && t.tanggal <= b.end)
    return {
      key: b.key,
      label: b.label,
      start: b.start,
      end: b.end,
      omzet: sum(rows.map((t) => t.omzet)),
      transaksi: sum(rows.map((t) => t.transaksi)),
      pesanan: sum(rows.map((t) => t.pesanan)),
    }
  })
}

/**
 * Omzet PER MINGGU (bukan berjalan) untuk minggu-minggu dalam periode
 * terpilih, dari transaksi mentah yang sama dengan computeDashboard.
 * Minggu di dalam periode yang tidak punya transaksi tetap tampil
 * dengan nilai 0 — bukan hilang dari grafik.
 */
export function computeWeeklyPoints(data: DashboardData, filters: Filters): WeeklyPoint[] {
  const [, em] = filters.endMonth.split('-').map(Number)
  const ey = Number(filters.endMonth.split('-')[0])
  const periodStart = `${filters.startMonth}-01`
  const periodEnd = isoOf(new Date(Date.UTC(ey, em, 0)))
  const tx = data.transactions.filter(
    (t) =>
      t.tanggal >= periodStart &&
      t.tanggal <= periodEnd &&
      (filters.mitra === ALL || t.mitra === filters.mitra) &&
      (filters.kategori === ALL || t.kategori === filters.kategori) &&
      (filters.wilayah === ALL || t.wilayah === filters.wilayah),
  )
  return weeklyPointsFromTx(tx, filters.startMonth, filters.endMonth)
}

export interface MitraRow {
  nama: string
  omzet: number
  share: number
}

export interface Indikator {
  id: string
  title: string
  sub: string
  display: string
  /** 0–100, atau null bila indikator ini berupa delta (bukan progress). */
  percent: number | null
  /** Laju perubahan, hanya untuk indikator pertumbuhan. */
  delta: number | null
  /** Skor capaian vs target = min(100, Realisasi/Target × 100),
   *  dibulatkan; null bila tidak ada data target. */
  skor: number | null
  /** Label target yang bisa dilacak, mis. "Target 525 produk". */
  targetLabel: string | null
}

/** Skor Indikator (docs/ALUR.md): min(100, Realisasi/Target × 100),
 *  dibulatkan; null bila target tidak ada / tidak > 0. */
export function skorIndikator(realisasi: number, target: number): number | null {
  if (!(target > 0) || !Number.isFinite(realisasi)) return null
  return Math.min(100, Math.round((realisasi / target) * 100))
}

/** Bobot evaluasi (docs/ALUR.md, total 100%): Katalog 20%, Kanal Aktif
 *  15%, Inquiry 15%, Transaksi 20%, Omzet 20%, Repeat Order 10%. */
export const BOBOT = {
  katalog: 0.2,
  kanal: 0.15,
  inquiry: 0.15,
  transaksi: 0.2,
  omzet: 0.2,
  repeat: 0.1,
} as const
export type SkorComponentId = keyof typeof BOBOT

/** Status Skor Kinerja dari total terbobot (contoh mockup: 88 =
 *  "Sangat Baik"). */
export function statusSkor(skor: number | null): string | null {
  if (skor === null) return null
  if (skor >= 85) return 'Sangat Baik'
  if (skor >= 70) return 'Baik'
  if (skor >= 55) return 'Cukup'
  return 'Kurang'
}

export interface SkorKinerja {
  /** Total terbobot 0–100 (null bila ada komponen yang tidak punya skor). */
  skor: number | null
  status: string | null
}

/** Skor Kinerja terbobot = Σ(bobot × skor komponen). Hanya dihitung bila
 *  KEENAM komponen punya skor — bila satu saja "—", total ikut "—"
 *  (jujur, bukan skor parsial yang menyamar jadi total). */
export function skorTerbobot(scores: Partial<Record<SkorComponentId, number | null>>): SkorKinerja {
  const entries = (Object.keys(BOBOT) as SkorComponentId[]).map(
    (k) => [BOBOT[k], scores[k]] as const,
  )
  if (entries.some(([, s]) => s === null || s === undefined)) return { skor: null, status: null }
  const skor = Math.round(entries.reduce((a, [w, s]) => a + w * (s as number), 0))
  return { skor, status: statusSkor(skor) }
}

/** Jendela evaluasi TETAP (docs/ALUR.md): target ditetapkan untuk
 *  periode Okt–Nov 2026, jadi skor capaian dihitung dari realisasi
 *  periode ini — TERLEPAS dari filter periode yang dipilih user. */
export const EVAL_START = '2026-10'
export const EVAL_END = '2026-11'
export const EVAL_LABEL = 'Periode evaluasi Okt–Nov'

export interface TopUmkmRow {
  rank: number
  nama: string
  kategori: string
  wilayah: string
  transaksi: number
  omzet: number
}

export interface UmkmMonthlyRow {
  key: string
  label: string
  omzet: number
  transaksi: number
  pesanan: number
}

export interface UmkmMitraRow {
  nama: string
  omzet: number
  /** Pangsa terhadap total omzet UMKM ini (0–1). */
  share: number
}

export interface UmkmSkorRow {
  id: string
  title: string
  /** Skor 0–100, null bila UMKM ini tidak punya target. */
  skor: number | null
  /** Label realisasi, mis. "Rp 12.913.504". */
  realisasi: string
  /** Label target, mis. "Rp 15.204.194". */
  target: string
}

export interface UmkmDetail {
  rank: number
  nama: string
  kategori: string
  wilayah: string
  /** Mitra dengan omzet terbesar untuk UMKM ini dalam jendela periode. */
  mitra: string
  omzet: number
  transaksi: number
  pesanan: number
  klik: number
  avgOmzetPerTransaksi: number
  /** Pangsa terhadap total omzet terfilter (0–1). */
  share: number
  /** null = master tidak punya data produk (tampil "—"). */
  jumlahProduk: number | null
  /** null = master tidak punya data produk (tampil "—"). */
  produkAktif: number | null
  /** null = master tidak punya data repeat (tampil "—"). */
  repeatTransaksi: number | null
  /** Data master TEI: nama pemilik usaha. */
  namaPemilik: string
  /** Data master TEI: izin usaha yang dimiliki. */
  izinUsaha: string
  /** Data master TEI: Instagram / website. */
  instagramWebsite: string
  /** Data master TEI: penjelasan produk. */
  penjelasanProduk: string
  /** Program pendampingan yang diikuti (dari master). */
  program: string
  /** Nama perusahaan (badan usaha) bila diketahui (dari master). */
  namaPerusahaan: string
  /** Rincian per bulan — HANYA bulan dalam jendela periode terpilih. */
  monthly: UmkmMonthlyRow[]
  /** Rincian per minggu (omzet per minggu) dalam jendela periode terpilih. */
  weekly: WeeklyPoint[]
  /** Label periode jendela, mis. "Okt – Nov 2026". */
  periodeLabel: string
  mitraRows: UmkmMitraRow[]
  /** Total inquiry pada jendela evaluasi Okt–Nov yang tetap. */
  inquiry: number
  /** Jumlah kanal berbeda pada jendela evaluasi Okt–Nov yang tetap. */
  kanalAktif: number
  /** Skor Kinerja terbobot (6 bobot mockup) untuk UMKM ini. */
  skorKinerja: SkorKinerja
  /** Skor capaian per UMKM vs target individualnya
   *  (Omzet, Transaksi, Katalog, Repeat, Inquiry, Kanal) — realisasi
   *  Omzet/Transaksi/Repeat/Inquiry/Kanal berjangkar ke jendela evaluasi
   *  Okt–Nov yang tetap (bukan jendela filter dialog); Katalog memakai
   *  total master. */
  skorRows: UmkmSkorRow[]
}

/**
 * Detail penjualan satu UMKM, dihitung dari transaksi mentah yang sama
 * dengan computeDashboard (bukan angka hardcode).
 *
 * PENTING — cakupan dialog ini adalah JENDELA periode terpilih
 * (filters.startMonth–filters.endMonth), BUKAN sejak Jul 2026 seperti
 * KPI/dashboard. Jadi saat periode Okt–Nov 2026 terpilih, dialog
 * menampilkan omzet Okt+Nov saja, bukan total Jul–Nov. Filter
 * Mitra/Kategori/Wilayah yang sama seperti dashboard tetap dipakai.
 * "Mitra utama" diturunkan dari transaksi (mitra dengan omzet terbesar
 * dalam jendela), karena master baru tidak punya kolom mitra.
 * Mengembalikan null bila UMKM tidak punya transaksi dalam jendela
 * tersebut (pemanggil menampilkan pesan sopan, bukan angka 0).
 */
export function computeUmkmDetail(data: DashboardData, filters: Filters, nama: string): UmkmDetail | null {
  const rawEndIdx = MONTHS.findIndex((m) => m.key === filters.endMonth)
  const endIdx = Math.max(0, rawEndIdx < 0 ? MONTHS.length - 1 : rawEndIdx)
  const rawStartIdx = MONTHS.findIndex((m) => m.key === filters.startMonth)
  const startIdx = rawStartIdx < 0 ? 0 : Math.min(rawStartIdx, endIdx)
  const monthsShown = MONTHS.slice(startIdx, endIdx + 1)
  const master = data.umkm.find((u) => u.namaUmkm === nama)
  if (!master) return null

  const inWindow = (t: { bulan: string }): boolean =>
    t.bulan >= filters.startMonth && t.bulan <= filters.endMonth
  const matchesOtherFilters = (t: { mitra: string; kategori: string; wilayah: string }): boolean =>
    (filters.mitra === ALL || t.mitra === filters.mitra) &&
    (filters.kategori === ALL || t.kategori === filters.kategori) &&
    (filters.wilayah === ALL || t.wilayah === filters.wilayah)

  const tx = data.transactions.filter(
    (t) => t.namaUmkm === nama && inWindow(t) && matchesOtherFilters(t),
  )
  if (tx.length === 0) return null

  // Penyebut pangsa = total omzet SEMUA UMKM dalam jendela yang sama
  // (dengan filter mitra/kategori/wilayah yang sama).
  const totalOmzetFiltered = sum(
    data.transactions
      .filter((t) => inWindow(t) && matchesOtherFilters(t))
      .map((t) => t.omzet),
  )
  const omzet = sum(tx.map((t) => t.omzet))
  const transaksi = sum(tx.map((t) => t.transaksi))
  const pesanan = sum(tx.map((t) => t.pesanan))
  const klik = sum(tx.map((t) => t.klik))

  const monthly: UmkmMonthlyRow[] = monthsShown.map((m) => {
    const rows = tx.filter((t) => t.bulan === m.key)
    return {
      key: m.key,
      label: m.label,
      omzet: sum(rows.map((t) => t.omzet)),
      transaksi: sum(rows.map((t) => t.transaksi)),
      pesanan: sum(rows.map((t) => t.pesanan)),
    }
  })

  const mitraMap = new Map<string, number>()
  tx.forEach((t) => mitraMap.set(t.mitra, (mitraMap.get(t.mitra) ?? 0) + t.omzet))
  const mitraRows: UmkmMitraRow[] = [...mitraMap.entries()]
    .map(([mitra, omzetMitra]) => ({ nama: mitra, omzet: omzetMitra, share: omzet > 0 ? omzetMitra / omzet : 0 }))
    .sort((a, b) => b.omzet - a.omzet)

  // Peringkat dalam urutan omzet JENDELA periode (bukan sejak Jul).
  const omzetByUmkm = new Map<string, number>()
  data.transactions
    .filter((t) => inWindow(t) && matchesOtherFilters(t))
    .forEach((t) => omzetByUmkm.set(t.namaUmkm, (omzetByUmkm.get(t.namaUmkm) ?? 0) + t.omzet))
  const rank = [...omzetByUmkm.entries()].sort((a, b) => b[1] - a[1]).findIndex(([n]) => n === nama) + 1

  // Skor capaian per UMKM vs target individualnya (tab Target) —
  // berjangkar ke JENDELA EVALUASI Okt–Nov yang tetap (bukan jendela
  // filter dialog): Omzet/Transaksi/Inquiry/Kanal memakai realisasi
  // Okt–Nov; Katalog memakai total master (produkAktif /
  // targetProdukAktif); Repeat memakai total master, diskalakan ke
  // Okt–Nov dengan pangsa transaksi (sama seperti repeat agregat di
  // computeDashboard). Target dicari lewat id_umkm dulu, nama sebagai
  // cadangan (Sheet lama / baris tanpa ID).
  const fmtInt = (n: number): string => Math.round(n).toLocaleString('id-ID')
  const fmtRp = (n: number): string => `Rp ${fmtInt(n)}`
  const txEval = data.transactions.filter(
    (t) => t.namaUmkm === nama && t.bulan >= EVAL_START && t.bulan <= EVAL_END && matchesOtherFilters(t),
  )
  const omzetEval = sum(txEval.map((t) => t.omzet))
  const transaksiEval = sum(txEval.map((t) => t.transaksi))
  const inquiryEval = sum(txEval.map((t) => t.inquiry))
  const kanalAktif = new Set(txEval.map((t) => t.idKanal || t.kanal)).size
  const target = (master.idUmkm ? data.targets.find((t) => t.idUmkm === master.idUmkm) : undefined)
    ?? data.targets.find((t) => t.namaUmkm === nama)
  const repeatWindow =
    master.repeatTransaksi !== null && master.transaksi > 0 && transaksiEval > 0
      ? Math.round(master.repeatTransaksi * (transaksiEval / master.transaksi))
      : null
  const skorRows: UmkmSkorRow[] = [
    {
      id: 'omzet', title: 'Omzet',
      skor: target ? skorIndikator(omzetEval, target.targetOmzet) : null,
      realisasi: fmtRp(omzetEval), target: target ? fmtRp(target.targetOmzet) : '—',
    },
    {
      id: 'transaksi', title: 'Transaksi',
      skor: target ? skorIndikator(transaksiEval, target.targetTransaksi) : null,
      realisasi: `${fmtInt(transaksiEval)} transaksi`, target: target ? `${fmtInt(target.targetTransaksi)} transaksi` : '—',
    },
    {
      id: 'katalog', title: 'Katalog',
      skor: target && master.produkAktif !== null ? skorIndikator(master.produkAktif, target.targetProdukAktif) : null,
      realisasi: master.produkAktif !== null ? `${fmtInt(master.produkAktif)} produk aktif` : '—',
      target: target ? `${fmtInt(target.targetProdukAktif)} produk` : '—',
    },
    {
      id: 'repeat', title: 'Repeat Order',
      skor: target && repeatWindow !== null ? skorIndikator(repeatWindow, target.targetRepeat) : null,
      realisasi: repeatWindow !== null ? `${fmtInt(repeatWindow)} transaksi` : '—',
      target: target ? `${fmtInt(target.targetRepeat)} transaksi` : '—',
    },
    {
      id: 'inquiry', title: 'Inquiry',
      skor: target ? skorIndikator(inquiryEval, target.targetInquiry) : null,
      realisasi: `${fmtInt(inquiryEval)} inquiry`, target: target ? `${fmtInt(target.targetInquiry)} inquiry` : '—',
    },
    {
      id: 'kanal', title: 'Kanal Aktif',
      skor: target ? skorIndikator(kanalAktif, target.targetKanalAktif) : null,
      realisasi: `${kanalAktif} kanal`, target: target ? `${fmtInt(target.targetKanalAktif)} kanal` : '—',
    },
  ]
  const skorById = new Map(skorRows.map((r) => [r.id, r.skor]))
  const skorKinerja = skorTerbobot({
    katalog: skorById.get('katalog') ?? null,
    kanal: skorById.get('kanal') ?? null,
    inquiry: skorById.get('inquiry') ?? null,
    transaksi: skorById.get('transaksi') ?? null,
    omzet: skorById.get('omzet') ?? null,
    repeat: skorById.get('repeat') ?? null,
  })

  return {
    rank,
    nama: master.namaUmkm,
    kategori: master.kategori,
    wilayah: master.wilayah,
    // Mitra utama = mitra dengan omzet terbesar dalam jendela ini
    // (master baru tidak punya kolom mitra).
    mitra: mitraRows[0]?.nama ?? master.mitra,
    omzet,
    transaksi,
    pesanan,
    klik,
    avgOmzetPerTransaksi: transaksi > 0 ? omzet / transaksi : 0,
    share: totalOmzetFiltered > 0 ? omzet / totalOmzetFiltered : 0,
    jumlahProduk: master.jumlahProduk,
    produkAktif: master.produkAktif,
    repeatTransaksi: master.repeatTransaksi,
    namaPemilik: master.namaPemilik,
    izinUsaha: master.izinUsaha,
    instagramWebsite: master.instagramWebsite,
    penjelasanProduk: master.penjelasanProduk,
    program: master.program,
    namaPerusahaan: master.namaPerusahaan,
    monthly,
    weekly: weeklyPointsFromTx(tx, filters.startMonth, filters.endMonth),
    periodeLabel: periodeLabel(filters.startMonth, filters.endMonth),
    mitraRows,
    inquiry: inquiryEval,
    kanalAktif,
    skorKinerja,
    skorRows,
  }
}

export interface ComputedDashboard {
  kpis: Kpi[]
  totalOmzet: number
  /**
   * Titik grafik Tren Omzet — HANYA bulan di dalam jendela periode
   * terpilih (startMonth–endMonth). Nilainya tetap dihitung sejak
   * Jul 2026, jadi titik terakhir selalu sama dengan Total Omzet di KPI.
   */
  trendPoints: MonthlyPoint[]
  /** Label periode untuk subtitle grafik, mis. "Okt – Nov 2026". */
  trendLabel: string
  /** Omzet per minggu dalam periode terpilih (untuk toggle Mingguan). */
  weeklyPoints: WeeklyPoint[]
  mitra: MitraRow[]
  indikator: Indikator[]
  topUmkm: TopUmkmRow[]
  /** Label jendela evaluasi untuk seksi skor, mis. "Periode evaluasi
   *  Okt–Nov" — menjelaskan kenapa skor tidak mengikuti filter periode. */
  skorPeriodeLabel: string
  /** Skor Kinerja terbobot agregat (6 bobot mockup) + status. */
  skorKinerja: SkorKinerja
  /** Pesan error bila tab Target gagal dibaca (null = Target terbaca);
   *  diteruskan ke seksi Capaian Indikator agar skor tampil "—" dengan
   *  catatan jujur, bukan angka contoh dari sample.ts. */
  targetsError: string | null
  /** Nilai mentah untuk caption / debugging. */
  totals: { umkmAktif: number; produk: number; klik: number; pesanan: number; transaksi: number; omzet: number }
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)

/**
 * Semua KPI dihitung dari data mentah — tidak ada angka KPI yang di-hardcode.
 * Delta vs periode sebelumnya: baseline periode sebelumnya diskalakan
 * proporsional dengan pangsa filter yang aktif (asumsi pertumbuhan merata
 * antar segmen; tanpa tab Ringkasan, baseline = angka di sample.ts).
 */
export function computeDashboard(data: DashboardData, filters: Filters): ComputedDashboard {
  const endIdx = Math.max(0, MONTHS.findIndex((m) => m.key === filters.endMonth))
  const monthsShown = MONTHS.slice(0, endIdx + 1)

  const tx = data.transactions.filter(
    (t) =>
      t.bulan <= filters.endMonth &&
      (filters.mitra === ALL || t.mitra === filters.mitra) &&
      (filters.kategori === ALL || t.kategori === filters.kategori) &&
      (filters.wilayah === ALL || t.wilayah === filters.wilayah),
  )
  const master = data.umkm.filter(
    (u) =>
      (filters.mitra === ALL || u.mitra === filters.mitra) &&
      (filters.kategori === ALL || u.kategori === filters.kategori) &&
      (filters.wilayah === ALL || u.wilayah === filters.wilayah),
  )

  const umkmAktif = new Set(tx.map((t) => t.namaUmkm)).size
  // Master TEI tidak punya data produk (kolom kosong = null) — dalam hal
  // itu KPI Total Produk dan indikator katalog menampilkan "—", bukan 0.
  const hasProdukData = master.some((u) => u.jumlahProduk !== null && u.produkAktif !== null)
  const totalProduk = sum(master.map((u) => u.jumlahProduk ?? 0))
  const produkAktif = sum(master.map((u) => u.produkAktif ?? 0))
  const klik = sum(tx.map((t) => t.klik))
  const pesanan = sum(tx.map((t) => t.pesanan))
  const transaksi = sum(tx.map((t) => t.transaksi))
  const omzet = sum(tx.map((t) => t.omzet))

  // Total tanpa filter (untuk pangsa baseline delta)
  const totalOmzetAll = sum(data.transactions.filter((t) => t.bulan <= filters.endMonth).map((t) => t.omzet))
  const totalKlikAll = sum(data.transactions.filter((t) => t.bulan <= filters.endMonth).map((t) => t.klik))
  const totalPesananAll = sum(data.transactions.filter((t) => t.bulan <= filters.endMonth).map((t) => t.pesanan))
  const totalTransaksiAll = sum(data.transactions.filter((t) => t.bulan <= filters.endMonth).map((t) => t.transaksi))

  const deltaVs = (current: number, totalAll: number, prevTotal: number): number | null => {
    if (totalAll <= 0 || prevTotal <= 0 || current <= 0) return null
    const prevFiltered = prevTotal * (current / totalAll)
    return current / prevFiltered - 1
  }
  const deltaKlik = deltaVs(klik, totalKlikAll, data.previous.klik)
  const deltaPesanan = deltaVs(pesanan, totalPesananAll, data.previous.pesanan)
  const deltaTransaksi = deltaVs(transaksi, totalTransaksiAll, data.previous.transaksi)
  const deltaOmzet = deltaVs(omzet, totalOmzetAll, data.previous.omzet)

  const fmtInt = (n: number): string => Math.round(n).toLocaleString('id-ID')
  const fmtRp = (n: number): string => `Rp ${fmtInt(n)}`

  const kpis: Kpi[] = [
    { id: 'umkm', title: 'UMKM Aktif', value: fmtInt(umkmAktif), delta: null },
    { id: 'produk', title: 'Total Produk', value: hasProdukData ? fmtInt(totalProduk) : '—', delta: null },
    { id: 'klik', title: 'Total Klik Link', value: fmtInt(klik), delta: deltaKlik },
    { id: 'pesanan', title: 'Total Pesanan', value: fmtInt(pesanan), delta: deltaPesanan },
    { id: 'transaksi', title: 'Total Transaksi', value: fmtInt(transaksi), delta: deltaTransaksi },
    { id: 'omzet', title: 'Total Omzet', value: fmtRp(omzet), delta: deltaOmzet },
  ]

  // Tren omzet: nilai berjalan sejak Jul 2026 (sudah terfilter
  // mitra/kategori/wilayah), tapi hanya bulan di dalam jendela periode
  // terpilih yang dirender — mis. Okt–Nov → 2 titik, Jul–Nov → 5 titik.
  // Titik terakhir (= bulan akhir periode) selalu sama dengan Total Omzet.
  const rawStartIdx = MONTHS.findIndex((m) => m.key === filters.startMonth)
  const startIdx = rawStartIdx < 0 ? Math.max(0, endIdx - 1) : Math.min(rawStartIdx, endIdx)
  const trendPoints: MonthlyPoint[] = monthsShown.slice(startIdx).map((m) => ({
    label: m.label,
    value: sum(tx.filter((t) => t.bulan <= m.key).map((t) => t.omzet)),
  }))
  const trendLabel = periodeLabel(filters.startMonth, filters.endMonth)
  const weeklyPoints = computeWeeklyPoints(data, filters)

  // Kinerja per mitra (diurutkan omzet terbesar)
  const mitraMap = new Map<string, number>()
  tx.forEach((t) => mitraMap.set(t.mitra, (mitraMap.get(t.mitra) ?? 0) + t.omzet))
  const mitra: MitraRow[] = [...mitraMap.entries()]
    .map(([nama, omzetMitra]) => ({ nama, omzet: omzetMitra, share: omzet > 0 ? omzetMitra / omzet : 0 }))
    .sort((a, b) => b.omzet - a.omzet)

  // Jendela evaluasi TETAP Okt–Nov (lihat EVAL_START/EVAL_END): skor
  // capaian memakai realisasi periode evaluasi, bukan jendela filter —
  // karena target ditetapkan untuk periode itu. Dihitung dari data
  // mentah (bukan dari tx yang sudah terpotong bulan akhir periode),
  // supaya skor tetap sama untuk filter periode apa pun. Filter
  // mitra/kategori/wilayah tetap dipakai; hanya bulannya yang
  // berjangkar ke Okt–Nov. KPI, Tren, dan dialog tetap mengikuti
  // filter periode seperti biasa.
  const txEval = data.transactions.filter(
    (t) =>
      t.bulan >= EVAL_START && t.bulan <= EVAL_END &&
      (filters.mitra === ALL || t.mitra === filters.mitra) &&
      (filters.kategori === ALL || t.kategori === filters.kategori) &&
      (filters.wilayah === ALL || t.wilayah === filters.wilayah),
  )
  const transaksiEval = sum(txEval.map((t) => t.transaksi))
  const klikEval = sum(txEval.map((t) => t.klik))

  // Indikator UMKM — katalog & repeat menampilkan "—" bila master
  // tidak punya data produk/repeat (kolom kosong = null di master TEI).
  const katalogPct = hasProdukData && totalProduk > 0 ? (produkAktif / totalProduk) * 100 : null
  const konversiPct = klikEval > 0 ? (transaksiEval / klikEval) * 100 : 0
  // Repeat order: total repeat master yang terfilter, diskalakan dengan
  // pangsa transaksi PERIODE EVALUASI (Okt–Nov).
  const hasRepeatData = master.some((u) => u.repeatTransaksi !== null)
  const repeatMaster = sum(master.map((u) => u.repeatTransaksi ?? 0))
  const transaksiMaster = sum(master.map((u) => u.transaksi))
  const repeatFiltered = hasRepeatData && transaksiMaster > 0 ? repeatMaster * (transaksiEval / transaksiMaster) : 0
  const repeatPct = hasRepeatData && transaksiEval > 0 ? (repeatFiltered / transaksiEval) * 100 : null

  // Target agregat = jumlah target UMKM yang terfilter (konversi memakai
  // rata-rata target_konversi, karena target itu berupa persen).
  // Target dicari lewat id_umkm dulu, nama sebagai cadangan.
  const targetByUmkm = new Map<string, UmkmTarget>()
  data.targets.forEach((t) => {
    if (t.idUmkm) targetByUmkm.set(t.idUmkm, t)
    targetByUmkm.set(t.namaUmkm, t)
  })
  const targetsFiltered: UmkmTarget[] = master
    .map((u) => (u.idUmkm ? targetByUmkm.get(u.idUmkm) : undefined) ?? targetByUmkm.get(u.namaUmkm))
    .filter((t): t is UmkmTarget => t !== undefined)
  const hasTargetData = targetsFiltered.length > 0
  const targetProdukAktif = sum(targetsFiltered.map((t) => t.targetProdukAktif))
  const targetKonversiAvg = hasTargetData
    ? sum(targetsFiltered.map((t) => t.targetKonversi)) / targetsFiltered.length
    : 0
  const targetRepeat = sum(targetsFiltered.map((t) => t.targetRepeat))
  const targetOmzet = sum(targetsFiltered.map((t) => t.targetOmzet))
  const targetTransaksi = sum(targetsFiltered.map((t) => t.targetTransaksi))
  const targetInquiry = sum(targetsFiltered.map((t) => t.targetInquiry))
  const targetKanalAktifMean = hasTargetData
    ? sum(targetsFiltered.map((t) => t.targetKanalAktif)) / targetsFiltered.length
    : 0
  const fmtPct1 = (n: number): string => `${n.toFixed(1).replace('.', ',')}%`

  // Realisasi jendela evaluasi: omzet + inquiry + kanal aktif per UMKM
  // (rata-rata kanal berbeda per UMKM dalam jendela Okt–Nov).
  const omzetEval = sum(txEval.map((t) => t.omzet))
  const inquiryEval = sum(txEval.map((t) => t.inquiry))
  const kanalPerUmkmEval = new Map<string, Set<string>>()
  txEval.forEach((t) => {
    const key = t.idUmkm || t.namaUmkm
    const s = kanalPerUmkmEval.get(key) ?? new Set<string>()
    s.add(t.idKanal || t.kanal)
    kanalPerUmkmEval.set(key, s)
  })
  const kanalAktifValues = [...kanalPerUmkmEval.values()].map((s) => s.size)
  const kanalAktifMean = kanalAktifValues.length > 0
    ? kanalAktifValues.reduce((a, b) => a + b, 0) / kanalAktifValues.length
    : 0
  const fmtMean1 = (n: number): string => n.toFixed(1).replace('.', ',')

  // Skor per komponen (6 bobot mockup) + Skor Kinerja terbobot.
  const hasEvalRows = txEval.length > 0
  const skorKatalog = hasProdukData && hasTargetData ? skorIndikator(produkAktif, targetProdukAktif) : null
  const skorKanal = hasTargetData && hasEvalRows ? skorIndikator(kanalAktifMean, targetKanalAktifMean) : null
  const skorInquiry = hasTargetData && hasEvalRows ? skorIndikator(inquiryEval, targetInquiry) : null
  const skorTransaksi = hasTargetData && hasEvalRows ? skorIndikator(transaksiEval, targetTransaksi) : null
  const skorOmzet = hasTargetData && hasEvalRows ? skorIndikator(omzetEval, targetOmzet) : null
  const skorRepeat = hasRepeatData && hasTargetData ? skorIndikator(repeatFiltered, targetRepeat) : null
  const skorKonversi = hasTargetData && klikEval > 0 ? skorIndikator(konversiPct, targetKonversiAvg) : null
  const skorKinerja = skorTerbobot({
    katalog: skorKatalog, kanal: skorKanal, inquiry: skorInquiry,
    transaksi: skorTransaksi, omzet: skorOmzet, repeat: skorRepeat,
  })

  // Pertumbuhan Omzet (docs/ALUR.md): (T2 − T0) / T0 × 100%, dengan
  // T0 = omzet BULANAN bulan sebelum periode (mis. Okt–Nov → T0 = Sep),
  // T1 = bulan awal periode, T2 = omzet BULANAN bulan akhir periode.
  // Guard: T0 = 0 (mis. periode mulai Jul — tidak ada bulan sebelumnya)
  // → tampil "—", jangan bagi nol. Nilai BOLEH negatif — data bulanan
  // memang menurun (Jul 136,8 jt → Nov 35,7 jt), tampilkan jujur.
  const monthlyOmzet = (key: string): number => sum(tx.filter((t) => t.bulan === key).map((t) => t.omzet))
  const startMonthIdx = MONTHS.findIndex((m) => m.key === filters.startMonth)
  const t0Key = startMonthIdx > 0 ? MONTHS[startMonthIdx - 1].key : null
  const t0Omzet = t0Key ? monthlyOmzet(t0Key) : 0
  const t2Omzet = monthlyOmzet(filters.endMonth)
  const pertumbuhan = t0Omzet > 0 ? (t2Omzet - t0Omzet) / t0Omzet : null
  const t0Label = t0Key ? (MONTHS.find((m) => m.key === t0Key)?.label ?? t0Key) : '—'
  const t2Label = MONTHS.find((m) => m.key === filters.endMonth)?.label ?? filters.endMonth

  const indikator: Indikator[] = [
    {
      id: 'katalog', title: 'Produktivitas Katalog', sub: '(Produk Aktif)',
      display: hasProdukData ? `${fmtInt(produkAktif)} / ${fmtInt(totalProduk)}` : '—', percent: katalogPct, delta: null,
      skor: skorKatalog,
      targetLabel: hasTargetData ? `Target ${fmtInt(targetProdukAktif)} produk` : null,
    },
    {
      id: 'kanal', title: 'Kanal Aktif', sub: '(Kanal Pemasaran)',
      display: hasEvalRows ? `${fmtMean1(kanalAktifMean)} kanal/UMKM` : '—', percent: null, delta: null,
      skor: skorKanal,
      targetLabel: hasTargetData ? `Target ${fmtMean1(targetKanalAktifMean)} kanal/UMKM` : null,
    },
    {
      id: 'inquiry', title: 'Inquiry', sub: '(Permintaan Masuk)',
      display: hasEvalRows ? `${fmtInt(inquiryEval)} inquiry` : '—', percent: null, delta: null,
      skor: skorInquiry,
      targetLabel: hasTargetData ? `Target ${fmtInt(targetInquiry)} inquiry` : null,
    },
    {
      id: 'transaksi', title: 'Transaksi', sub: '(Periode Evaluasi)',
      display: hasEvalRows ? `${fmtInt(transaksiEval)} transaksi` : '—', percent: null, delta: null,
      skor: skorTransaksi,
      targetLabel: hasTargetData ? `Target ${fmtInt(targetTransaksi)} transaksi` : null,
    },
    {
      id: 'omzet', title: 'Omzet', sub: '(Periode Evaluasi)',
      display: hasEvalRows ? fmtRp(omzetEval) : '—', percent: null, delta: null,
      skor: skorOmzet,
      targetLabel: hasTargetData ? `Target ${fmtRp(targetOmzet)}` : null,
    },
    {
      id: 'konversi', title: 'Konversi', sub: '(Klik → Transaksi)',
      display: `${fmtInt(transaksiEval)} / ${fmtInt(klikEval)}`, percent: konversiPct, delta: null,
      skor: skorKonversi,
      targetLabel: hasTargetData ? `Target ${fmtPct1(targetKonversiAvg)}` : null,
    },
    {
      id: 'repeat', title: 'Repeat Order', sub: '',
      display: hasRepeatData ? `${fmtInt(repeatFiltered)} transaksi` : '—', percent: repeatPct, delta: null,
      skor: skorRepeat,
      targetLabel: hasTargetData ? `Target ${fmtInt(targetRepeat)} transaksi` : null,
    },
    {
      id: 'pertumbuhan', title: 'Pertumbuhan Omzet',
      sub: pertumbuhan === null
        ? '(T0 tidak tersedia — tidak ada data bulan sebelumnya)'
        : `T0 ${t0Label} Rp ${fmtInt(t0Omzet)} → T2 ${t2Label} Rp ${fmtInt(t2Omzet)}`,
      display: pertumbuhan === null ? '—' : '', percent: null, delta: pertumbuhan,
      skor: null, targetLabel: null,
    },
  ]

  // Top UMKM berdasarkan omzet (terfilter)
  const byUmkm = new Map<string, TopUmkmRow>()
  tx.forEach((t) => {
    const row = byUmkm.get(t.namaUmkm) ?? {
      rank: 0, nama: t.namaUmkm, kategori: t.kategori, wilayah: t.wilayah, transaksi: 0, omzet: 0,
    }
    row.transaksi += t.transaksi
    row.omzet += t.omzet
    byUmkm.set(t.namaUmkm, row)
  })
  const topUmkm = [...byUmkm.values()]
    .sort((a, b) => b.omzet - a.omzet)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  return {
    kpis,
    totalOmzet: omzet,
    trendPoints,
    trendLabel,
    weeklyPoints,
    mitra,
    indikator,
    topUmkm,
    skorPeriodeLabel: EVAL_LABEL,
    skorKinerja,
    targetsError: data.targetsError ?? null,
    totals: { umkmAktif, produk: totalProduk, klik, pesanan, transaksi, omzet },
  }
}

/**
 * Daftar nilai unik untuk opsi filter, diambil dari data (bukan hardcode).
 * Gabungan transaksi + master: master baru tidak punya kolom mitra, jadi
 * opsi Mitra harus datang dari transaksi (kalau hanya dari master,
 * dropdown Mitra akan kosong).
 */
export function filterOptions(data: DashboardData): { mitra: string[]; kategori: string[]; wilayah: string[] } {
  // '—' tidak pernah jadi opsi filter (muncul dari master yang belum
  // punya mitra/wilayah — mis. 28 baris Pendampingan Ekspor tanpa wilayah).
  const uniq = (values: string[]): string[] => [...new Set(values)].filter((v) => v && v !== '—').sort((a, b) => a.localeCompare(b, 'id'))
  return {
    mitra: uniq([...data.transactions.map((t) => t.mitra), ...data.umkm.map((u) => u.mitra)]),
    kategori: uniq([...data.transactions.map((t) => t.kategori), ...data.umkm.map((u) => u.kategori)]),
    wilayah: uniq([...data.transactions.map((t) => t.wilayah), ...data.umkm.map((u) => u.wilayah)]),
  }
}
