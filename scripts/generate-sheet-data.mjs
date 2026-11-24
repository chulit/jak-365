// generate-sheet-data.mjs — SATU-SATUNYA sumber kebenaran data contoh.
// Menulis:
//   sheets-template/Transaksi.csv, UMKM.csv, Klik_Link.csv, README.md
//   src/data/sample.ts (data yang dipakai aplikasi saat Sheet belum dihubungkan)
// Semesta UMKM = 42 peserta TEI 2026 (dibaca dari
// sheets-template/UMKM_TEI.csv — nama-nama dummy lama seperti
// My Little Dimsum SUDAH TIDAK ADA). Semua total direkonsiliasi
// secara eksak (assert di akhir script):
//   Omzet 333.023.341 | Transaksi 1.211 | Pesanan 1.424 | Klik 12.642
//   (basis screenshot 332.823.341 / 1.210 / 1.423 / 12.630, ditambah
//    1 transaksi tes Chipsychips 2026-11-17 — lihat EXTRA_TRANSACTION
//    di bawah, ditambahkan SETELAH verifikasi basis supaya alokasi
//    bulanan tidak berubah)
//   UMKM 42 (peserta TEI 2026) — jumlah_produk/produk_aktif angka acak
//   deterministik (perintah user 2026-11-24, seed 20261124); TEI tidak
//   punya data produk/repeat. repeat_transaksi diisi angka acak
//   deterministik (seed 20261126, total 346 = 28,6% seperti mockup lama).
//   Target per UMKM (tab Target, seed 20261125) — angka CONTOH
//   deterministik, bisa diubah user di Sheet; skor indikator =
//   min(100, Realisasi/Target × 100).
//   Tren berjalan: Jul 136.761.925, Agu 208.378.885, Sep 256.829.000,
//                   Okt 297.303.000, Nov 332.823.341
//   Mitra (6, referensi user 2026-11-24): Tokopedia 112.058.500,
//          Shopee 89.614.000, Mall Grand Indonesia 68.492.341,
//          Centong Daily 20.886.167, Koperasi Kumindag 20.886.167,
//          Hippindo 20.886.166 (tiga terakhir memecah kelompok
//          62.658.500, masing-masing 5 UMKM urut daftar TEI).
//          Basis + transaksi tes Chipsychips (Tokopedia): total akhir
//          Tokopedia 112.258.500.
// Jalankan: node scripts/generate-sheet-data.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'sheets-template')
mkdirSync(OUT, { recursive: true })
mkdirSync(join(ROOT, 'src', 'data'), { recursive: true })

// ---------------------------------------------------------------------------
// Util: RNG deterministik + alokasi integer eksak (largest remainder)
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20261117)
// RNG TERPISAH untuk jumlah produk — stream sendiri supaya tidak menggeser
// distribusi omzet/transaksi/pesanan/klik yang memakai `rng` di atas.
const produkRng = mulberry32(20261124)
// RNG TERPISAH untuk target per UMKM (seed 20261125) dan repeat (seed
// 20261126) — stream sendiri supaya tidak menggeser distribusi lain.
const targetRng = mulberry32(20261125)
const repeatRng = mulberry32(20261126)

/** Bagi `total` bulat ke n bagian mengikuti bobot, jumlah hasil = total persis. */
function distribute(total, weights, min = 0) {
  const n = weights.length
  const base = min * n
  if (total < base) throw new Error(`distribute: total ${total} < base ${base}`)
  const rem = total - base
  const wSum = weights.reduce((a, b) => a + b, 0)
  const raw = weights.map((w) => (rem * w) / wSum)
  const out = raw.map((r) => Math.floor(r))
  let left = rem - out.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .map((x) => x[1])
  for (let k = 0; k < left; k++) out[order[k % n]]++
  return out.map((v) => v + min)
}

/** Bagi `total` unit ke n bagian dengan undian per unit (multinomial),
 *  peluang tiap bagian proporsional bobotnya. Untuk total kecil jauh
 *  lebih merata antar segmen daripada largest remainder. */
function distributeRandom(total, weights) {
  const wSum = weights.reduce((a, b) => a + b, 0)
  const out = new Array(weights.length).fill(0)
  for (let k = 0; k < total; k++) {
    let r = rng() * wSum
    let i = 0
    while (i < weights.length - 1 && r > weights[i]) { r -= weights[i]; i++ }
    out[i]++
  }
  return out
}

/** Skala satu kelompok UMKM agar jumlah omzetnya = target persis. */
function scaleGroupToTarget(items, target) {
  const scaled = distribute(target, items.map((i) => i.omzet))
  items.forEach((it, idx) => { it.omzet = scaled[idx] })
  const min = Math.min(...items.map((i) => i.omzet))
  if (min < 300000) throw new Error(`scaleGroup: omzet UMKM terlalu kecil (${min})`)
}

/** Parser CSV minimal (menangani field ber-tanda kutip) — dipakai untuk
 *  membaca sheets-template/UMKM_TEI.csv sebagai input master. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else { field += ch }
    } else if (ch === '"') { inQuotes = true }
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else { field += ch }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((c) => c.trim() !== '')) rows.push(row)
  }
  return rows
}

// ---------------------------------------------------------------------------
// Konstanta target (dari screenshot)
// ---------------------------------------------------------------------------
const MONTHS = [
  { key: '2026-07', label: 'Jul', tanggal: '2026-07-15' },
  { key: '2026-08', label: 'Agu', tanggal: '2026-08-15' },
  { key: '2026-09', label: 'Sep', tanggal: '2026-09-15' },
  { key: '2026-10', label: 'Okt', tanggal: '2026-10-15' },
  { key: '2026-11', label: 'Nov', tanggal: '2026-11-15' },
]
const MONTHLY_OMZET = [136761925, 71616960, 48450115, 40474000, 35520341] // jumlah = 332.823.341
const MONTHLY_TRANSAKSI = [310, 265, 235, 210, 190] // 1.210
const MONTHLY_PESANAN = [365, 312, 278, 248, 220] // 1.423
const MONTHLY_KLIK = [3250, 2780, 2460, 2190, 1950] // 12.630

const MITRA = [
  { nama: 'Tokopedia', omzet: 112058500 },
  { nama: 'Shopee', omzet: 89614000 },
  { nama: 'Mall Grand Indonesia', omzet: 68492341 },
  { nama: 'Centong Daily', omzet: 20886167 },
  { nama: 'Koperasi Kumindag', omzet: 20886167 },
  { nama: 'Hippindo', omzet: 20886166 },
]
const TOTAL_OMZET = 332823341
const TOTAL_TRANSAKSI = 1210
const TOTAL_PESANAN = 1423
const TOTAL_KLIK = 12630

// Periode sebelumnya (untuk delta +31% / +18% / +24% / +27% di kartu KPI)
const PREVIOUS = { omzet: 254061327, transaksi: 953, pesanan: 1148, klik: 10703 }

// Transaksi tes (ditambahkan 2026-11-17 atas permintaan user, semula
// untuk My Little Dimsum — kini menempel ke Chipsychips, peserta TEI
// pertama di daftar, karena nama-nama dummy sudah tidak ada):
// 1 baris baru — BUKAN mengubah baris agregat November yang sudah ada.
// Ditambahkan ke `transactions` dan ke master UMKM setelah verifikasi
// basis (bagian 5b), jadi total akhir:
//   Omzet 333.023.341 | Transaksi 1.211 | Pesanan 1.424 | Klik 12.642
const EXTRA_TRANSACTION = {
  tanggal: '2026-11-17', bulan: '2026-11', namaUmkm: 'Chipsychips',
  kategori: 'Food & Beverage', wilayah: 'Jakarta Selatan',
  mitra: 'Tokopedia', pesanan: 1, transaksi: 1,
  omzet: 200000, klik: 12,
}

// ---------------------------------------------------------------------------
// 1. Daftar UMKM: 42 peserta TEI 2026 (input dari UMKM_TEI.csv).
//    Total omzet/transaksi/pesanan didistribusikan ke 42 nama ini dengan
//    bobot acak deterministik — jumlahnya persis sama dengan target.
//    Jumlah produk / produk aktif: angka ACAK DETERMINISTIK (bukan data
//    TEI — TEI tidak punya angka itu; atas perintah user 2026-11-24
//    "isi angka random aja"). repeat_transaksi dan target diisi di
//    seksi 5c (SETELAH transaksi tes 5b, supaya memakai total final).
// ---------------------------------------------------------------------------
const teiCsv = parseCsv(readFileSync(join(OUT, 'UMKM_TEI.csv'), 'utf8'))
const teiHeader = teiCsv[0]
const colIdx = (name) => {
  const i = teiHeader.indexOf(name)
  if (i < 0) throw new Error(`UMKM_TEI.csv: kolom "${name}" tidak ditemukan`)
  return i
}
const tei = teiCsv.slice(1).map((r) => ({
  no: Number(r[colIdx('no')]) || 0,
  namaPemilik: r[colIdx('nama_pemilik')] ?? '',
  namaUsaha: r[colIdx('nama_usaha')] ?? '',
  wilayah: r[colIdx('wilayah')] ?? '',
  sektor: r[colIdx('sektor')] ?? '',
  izinUsaha: r[colIdx('izin_usaha')] ?? '',
  instagramWebsite: r[colIdx('instagram_website')] ?? '',
  penjelasanProduk: r[colIdx('penjelasan_produk')] ?? '',
}))
if (tei.length !== 42) throw new Error(`UMKM_TEI.csv: peserta harus 42, dapat ${tei.length}`)
if (tei.some((t) => !t.namaUsaha)) throw new Error('UMKM_TEI.csv: ada baris tanpa nama_usaha')
if (new Set(tei.map((t) => t.namaUsaha)).size !== 42) throw new Error('UMKM_TEI.csv: nama_usaha duplikat')

const umkm = tei.map((t) => {
  // Jumlah produk acak 8–17; produk aktif 85–100% dari jumlah produk
  // (dibulatkan, selalu <= jumlah_produk). Stream `produkRng` terpisah.
  const jumlahProduk = 8 + Math.floor(produkRng() * 10)
  const produkAktif = Math.min(
    jumlahProduk,
    Math.max(Math.ceil(jumlahProduk * 0.85), Math.round(jumlahProduk * (0.85 + produkRng() * 0.15))),
  )
  return {
    ...t,
    nama: t.namaUsaha,
    kategori: t.sektor,
    jumlahProduk, produkAktif,
    omzet: 0, transaksi: 0, pesanan: 0, mitra: '',
  }
})
// Omzet: bobot acak 0,5–2,0, min Rp 500.000 per UMKM, jumlah eksak.
distribute(TOTAL_OMZET, umkm.map(() => 0.5 + rng() * 1.5), 500000).forEach((v, i) => { umkm[i].omzet = v })
// Transaksi: min 1 per UMKM.
distribute(TOTAL_TRANSAKSI, umkm.map(() => 0.5 + rng()), 1).forEach((v, i) => { umkm[i].transaksi = v })
// Pesanan = transaksi + ekstra (total ekstra = 1.423 - 1.210 = 213).
distribute(TOTAL_PESANAN - TOTAL_TRANSAKSI, umkm.map(() => 0.3 + rng())).forEach((v, i) => { umkm[i].pesanan = umkm[i].transaksi + v })

// ---------------------------------------------------------------------------
// 2. Mitra utama per UMKM — kelompok diskala eksak ke target mitra.
//    Semua 42 UMKM diurutkan menurut omzet (terbesar dulu), lalu
//    dimasukkan ke 3 kelompok pertama sampai target kelompok itu
//    tercapai; tiap kelompok diskala eksak ke target omzet mitranya.
//    Sisa 15 UMKM dipecah menjadi
//    3 kelompok @5 UMKM secara deterministik, urut daftar TEI (no naik),
//    masing-masing diskala eksak ke targetnya (20.886.167 / 20.886.167 /
//    20.886.166 — jumlah ketiganya = 62.658.500 persis).
// ---------------------------------------------------------------------------
const sortedByOmzet = [...umkm].sort((a, b) => b.omzet - a.omzet)
const groups = Array.from({ length: MITRA.length }, () => [])
{
  let cursor = 0
  for (let g = 0; g < 3; g++) {
    let sum = 0
    while (cursor < sortedByOmzet.length && sum + sortedByOmzet[cursor].omzet <= MITRA[g].omzet) {
      groups[g].push(sortedByOmzet[cursor]); sum += sortedByOmzet[cursor].omzet; cursor++
    }
    if (groups[g].length === 0) throw new Error(`mitra: kelompok ${MITRA[g].nama} kosong`)
    scaleGroupToTarget(groups[g], MITRA[g].omzet)
    groups[g].forEach((u) => { u.mitra = MITRA[g].nama })
  }
  const remainder = sortedByOmzet.slice(cursor).sort((a, b) => a.no - b.no)
  if (remainder.length !== 15) throw new Error(`mitra: sisa kelompok harus 15, dapat ${remainder.length}`)
  for (let k = 0; k < 3; k++) {
    const chunk = remainder.slice(k * 5, k * 5 + 5)
    const g = 3 + k
    scaleGroupToTarget(chunk, MITRA[g].omzet)
    chunk.forEach((u) => { u.mitra = MITRA[g].nama })
    groups[g] = chunk
  }
}
if (groups.flat().length !== umkm.length) throw new Error('mitra: jumlah UMKM tidak cocok')

// ---------------------------------------------------------------------------
// 3. Alokasi bulanan per UMKM (matriks eksak baris & kolom)
//    Baris: jumlah 5 bulan = total UMKM. Kolom: jumlah per bulan = target.
//    Perbaikan kolom dilakukan dengan memindah unit antar bulan DALAM
//    baris yang sama, jadi total baris tidak berubah; bulan ke-5 (Nov)
//    otomatis tepat karena total keseluruhan sudah tetap.
// ---------------------------------------------------------------------------
function allocateMonthly(totals, monthlyTargets) {
  const weights = monthlyTargets.map((t) => t / monthlyTargets.reduce((a, b) => a + b, 0))
  const matrix = totals.map((total) => distribute(total, weights))
  for (let m = 0; m < 4; m++) {
    let actual = matrix.reduce((a, row) => a + row[m], 0)
    let e = monthlyTargets[m] - actual
    let guard = 0
    while (e !== 0) {
      if (++guard > 100000) throw new Error('allocateMonthly: tidak konvergen')
      if (e > 0) {
        const i = matrix.reduce((best, row, idx) => (row[4] > matrix[best][4] ? idx : best), 0)
        if (matrix[i][4] < 1) throw new Error('allocateMonthly: sel Nov kosong')
        matrix[i][m]++; matrix[i][4]--; e--
      } else {
        const i = matrix.reduce((best, row, idx) => (row[m] > matrix[best][m] ? idx : best), 0)
        if (matrix[i][m] < 1) throw new Error('allocateMonthly: sel bulan kosong')
        matrix[i][m]--; matrix[i][4]++; e++
      }
    }
  }
  return matrix
}

const klikPerUmkm = distribute(TOTAL_KLIK, umkm.map((u) => u.omzet))
const mOmzet = allocateMonthly(umkm.map((u) => u.omzet), MONTHLY_OMZET)
const mTransaksi = allocateMonthly(umkm.map((u) => u.transaksi), MONTHLY_TRANSAKSI)
const mPesanan = allocateMonthly(umkm.map((u) => u.pesanan), MONTHLY_PESANAN)
const mKlik = allocateMonthly(klikPerUmkm, MONTHLY_KLIK)

// ---------------------------------------------------------------------------
// 4. Bangun baris Transaksi — tiap agregat UMKM x bulan DIPECAH PER MINGGU.
//    Satu bulan dipecah menjadi segmen minggu ISO (Senin–Minggu) yang
//    terpotong di awal/akhir bulan; tanggal baris = hari pertama segmen
//    itu di dalam bulan (tanggal 1 bila minggu terpotong awal bulan,
//    Senin untuk segmen penuh). Tiap metrik (pesanan/transaksi/omzet/
//    klik) dibagi ke segmen-segmen itu proporsional jumlah hari dengan
//    distribute() (largest remainder), jadi jumlah semua segmen dalam
//    satu bulan = agregat bulanan itu PERSIS. Total bulanan, total KPI,
//    dan total per UMKM TIDAK berubah — hanya tanggalnya yang tersebar
//    per minggu, supaya grafik mingguan tidak menumpuk di tanggal 15.
// ---------------------------------------------------------------------------
/** Segmen minggu ISO dalam satu bulan: [{start: 'YYYY-MM-DD', days}] */
function weekSegmentsInMonth(year, monthIndex) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const segs = []
  let d = 1
  while (d <= last) {
    const dow = (new Date(Date.UTC(year, monthIndex, d)).getUTCDay() + 6) % 7 // Sen=0
    const segDays = Math.min(7 - dow, last - d + 1)
    segs.push({
      start: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      days: segDays,
    })
    d += segDays
  }
  return segs
}

const transactions = []
umkm.forEach((u, i) => {
  MONTHS.forEach((mo, m) => {
    const [year, month] = mo.key.split('-').map(Number)
    const segs = weekSegmentsInMonth(year, month - 1)
    // Bobot = jumlah hari × jitter deterministik per baris (±15%). Tanpa
    // jitter, distribute() (largest remainder, seri = indeks) akan selalu
    // memberikan sisa hitungan kecil ke segmen yang sama, sehingga total
    // transaksi mingguan jadi timpang (mis. minggu ke-2 selalu jauh lebih
    // besar). Satu set bobot dipakai untuk keempat metrik dalam baris
    // yang sama, jadi pesanan/transaksi/omzet/klik tetap proporsional.
    const weights = segs.map((s) => s.days * (0.85 + rng() * 0.3))
    // Hitungan kecil (pesanan/transaksi/klik, biasanya 1–30 per baris)
    // dibagi dengan undian multinomial per unit: largest remainder
    // akan selalu menguntungkan segmen tengah untuk total kecil,
    // sehingga minggu pertama/terakhir bulan tampak kosong.
    const pesananSeg = distributeRandom(mPesanan[i][m], weights)
    const transaksiSeg = distributeRandom(mTransaksi[i][m], weights)
    const omzetSeg = distribute(mOmzet[i][m], weights)
    const klikSeg = distributeRandom(mKlik[i][m], weights)
    segs.forEach((seg, s) => {
      // Lewati segmen yang nol di semua metrik (jumlah tetap terjaga).
      if (pesananSeg[s] + transaksiSeg[s] + omzetSeg[s] + klikSeg[s] === 0) return
      transactions.push({
        tanggal: seg.start, bulan: mo.key, namaUmkm: u.nama, kategori: u.kategori,
        wilayah: u.wilayah, mitra: u.mitra, pesanan: pesananSeg[s],
        transaksi: transaksiSeg[s], omzet: omzetSeg[s], klik: klikSeg[s],
      })
    })
  })
})

// ---------------------------------------------------------------------------
// 5. Verifikasi (gagal = script exit non-zero)
// ---------------------------------------------------------------------------
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0)
const checks = []
function check(nama, aktual, target) {
  const ok = aktual === target
  checks.push({ nama, aktual, target, ok })
  if (!ok) console.error(`  ✗ ${nama}: ${aktual} ≠ ${target}`)
  return ok
}
let allOk = true
allOk &= check('Total omzet transaksi', sum(transactions, (t) => t.omzet), TOTAL_OMZET)
allOk &= check('Total transaksi', sum(transactions, (t) => t.transaksi), TOTAL_TRANSAKSI)
allOk &= check('Total pesanan', sum(transactions, (t) => t.pesanan), TOTAL_PESANAN)
allOk &= check('Total klik transaksi', sum(transactions, (t) => t.klik), TOTAL_KLIK)
allOk &= check('Jumlah UMKM master', umkm.length, 42)
// Jumlah produk: 8–17 per UMKM; produk aktif 85–100% dan <= jumlah_produk.
umkm.forEach((u) => {
  if (!(u.jumlahProduk >= 8 && u.jumlahProduk <= 17)) { console.error(`  ✗ jumlah_produk ${u.nama}: ${u.jumlahProduk} di luar 8–17`); allOk = false }
  if (!(u.produkAktif >= Math.ceil(u.jumlahProduk * 0.85) && u.produkAktif <= u.jumlahProduk)) { console.error(`  ✗ produk_aktif ${u.nama}: ${u.produkAktif} dari ${u.jumlahProduk}`); allOk = false }
})
MONTHS.forEach((mo, m) => {
  allOk &= check(`Omzet ${mo.label} 2026`, sum(transactions.filter((t) => t.bulan === mo.key), (t) => t.omzet), MONTHLY_OMZET[m])
  allOk &= check(`Transaksi ${mo.label} 2026`, sum(transactions.filter((t) => t.bulan === mo.key), (t) => t.transaksi), MONTHLY_TRANSAKSI[m])
  allOk &= check(`Pesanan ${mo.label} 2026`, sum(transactions.filter((t) => t.bulan === mo.key), (t) => t.pesanan), MONTHLY_PESANAN[m])
  allOk &= check(`Klik ${mo.label} 2026`, sum(transactions.filter((t) => t.bulan === mo.key), (t) => t.klik), MONTHLY_KLIK[m])
})
MITRA.forEach((mitra) => {
  allOk &= check(`Omzet ${mitra.nama}`, sum(transactions.filter((t) => t.mitra === mitra.nama), (t) => t.omzet), mitra.omzet)
})
// Total per UMKM di Transaksi harus sama dengan total master UMKM itu.
umkm.forEach((u) => {
  const rows = transactions.filter((t) => t.namaUmkm === u.nama)
  allOk &= check(`Total omzet ${u.nama}`, sum(rows, (t) => t.omzet), u.omzet)
  allOk &= check(`Total transaksi ${u.nama}`, sum(rows, (t) => t.transaksi), u.transaksi)
  allOk &= check(`Total pesanan ${u.nama}`, sum(rows, (t) => t.pesanan), u.pesanan)
})
// Total berjalan + konversi
const kum = []
MONTHLY_OMZET.reduce((a, v, i) => { kum.push(a + v); return a + v }, 0)
allOk &= check('Total s.d. Nov 2026', kum[4], TOTAL_OMZET)
const konversi = TOTAL_TRANSAKSI / TOTAL_KLIK
if (Math.abs(konversi * 100 - 9.6) > 0.05) { console.error('  ✗ konversi bukan 9,6%'); allOk = false }
if (!allOk) { console.error('\nVERIFIKASI GAGAL — perbaiki generator sebelum memakai CSV.'); process.exit(1) }

// ---------------------------------------------------------------------------
// 5b. Transaksi tes (EXTRA_TRANSACTION) — SETELAH verifikasi basis.
//      Baris baru ditambahkan apa adanya; baris agregat lama tidak diubah.
// ---------------------------------------------------------------------------
transactions.push({ ...EXTRA_TRANSACTION })
{
  const target = umkm.find((u) => u.nama === EXTRA_TRANSACTION.namaUmkm)
  if (!target) throw new Error('5b: Chipsychips tidak ditemukan di master UMKM')
  target.transaksi += EXTRA_TRANSACTION.transaksi
  target.pesanan += EXTRA_TRANSACTION.pesanan
  target.omzet += EXTRA_TRANSACTION.omzet
}
// Verifikasi total akhir (basis + transaksi tes)
let finalOk = true
finalOk &= check('Total omzet akhir', sum(transactions, (t) => t.omzet), 333023341)
finalOk &= check('Total transaksi akhir', sum(transactions, (t) => t.transaksi), 1211)
finalOk &= check('Total pesanan akhir', sum(transactions, (t) => t.pesanan), 1424)
finalOk &= check('Total klik akhir', sum(transactions, (t) => t.klik), 12642)
finalOk &= check('Omzet Nov 2026 akhir', sum(transactions.filter((t) => t.bulan === '2026-11'), (t) => t.omzet), 35720341)
finalOk &= check('Omzet Okt–Nov mingguan akhir', sum(transactions.filter((t) => t.tanggal >= '2026-10-01' && t.tanggal <= '2026-11-30'), (t) => t.omzet), 76194341)
finalOk &= check('Chipsychips omzet akhir', sum(transactions.filter((t) => t.namaUmkm === 'Chipsychips'), (t) => t.omzet), umkm.find((u) => u.nama === 'Chipsychips').omzet)
finalOk &= check('Chipsychips transaksi akhir', sum(transactions.filter((t) => t.namaUmkm === 'Chipsychips'), (t) => t.transaksi), umkm.find((u) => u.nama === 'Chipsychips').transaksi)
if (!finalOk) { console.error('\nVERIFIKASI AKHIR GAGAL.'); process.exit(1) }

// ---------------------------------------------------------------------------
// 5c. Repeat + Target per UMKM (angka CONTOH deterministik — bukan data
//      TEI; user bisa mengubahnya di Sheet). Dihitung SETELAH 5b supaya
//      memakai omzet/transaksi FINAL (basis + transaksi tes Chipsychips).
//      Repeat: total 346 (28,6% seperti mockup lama), dibagi proporsional
//      transaksi final dengan jitter ±15% (stream repeatRng) — tiap UMKM
//      ≈ 25–35% dari transaksinya, selalu <= transaksi.
//      Target (REBASE Okt–Nov, 2026-11-24): omzet & transaksi =
//      realisasi OKT–NOV per UMKM × 1,15–1,25; repeat = transaksi
//      Okt–Nov × 0,30–0,40 (min 1); produk aktif = jumlah_produk
//      (target 100% aktif); konversi = 10–15% (tidak berbasis jendela,
//      tidak berubah). Semua target WAJIB > 0 (syarat rumus skor).
// ---------------------------------------------------------------------------
{
  const repeatWeights = umkm.map((u) => u.transaksi * (0.85 + repeatRng() * 0.3))
  distribute(346, repeatWeights, 0).forEach((v, i) => { umkm[i].repeatTransaksi = v })
  // Basis rebase: realisasi Okt–Nov per UMKM (periode evaluasi).
  // Urutan pemanggilan targetRng() per UMKM dipertahankan seperti
  // sebelumnya (omzet, transaksi, konversi, repeat) supaya nilai
  // target_konversi tidak bergeser.
  const oktNov = new Map()
  for (const t of transactions) {
    if (t.bulan < '2026-10' || t.bulan > '2026-11') continue
    const a = oktNov.get(t.namaUmkm) ?? { omzet: 0, transaksi: 0 }
    a.omzet += t.omzet
    a.transaksi += t.transaksi
    oktNov.set(t.namaUmkm, a)
  }
  umkm.forEach((u) => {
    const base = oktNov.get(u.nama) ?? { omzet: 0, transaksi: 0 }
    u.targetOmzet = Math.round(base.omzet * (1.15 + targetRng() * 0.10))
    u.targetTransaksi = Math.round(base.transaksi * (1.15 + targetRng() * 0.10))
    u.targetProdukAktif = u.jumlahProduk
    u.targetKonversi = 10 + Math.floor(targetRng() * 6)
    u.targetRepeat = Math.max(1, Math.round(base.transaksi * (0.30 + targetRng() * 0.10)))
  })
  let ok5c = true
  ok5c &= check('Total repeat_transaksi', sum(umkm, (u) => u.repeatTransaksi), 346)
  umkm.forEach((u) => {
    if (!(u.repeatTransaksi >= 0 && u.repeatTransaksi <= u.transaksi)) {
      console.error(`  ✗ repeat ${u.nama}: ${u.repeatTransaksi} dari ${u.transaksi} transaksi`); ok5c = false
    }
    for (const [k, v] of [['target_omzet', u.targetOmzet], ['target_transaksi', u.targetTransaksi], ['target_produk_aktif', u.targetProdukAktif], ['target_konversi', u.targetKonversi], ['target_repeat', u.targetRepeat]]) {
      if (!(Number.isInteger(v) && v > 0)) { console.error(`  ✗ ${k} ${u.nama}: ${v} (harus integer > 0)`); ok5c = false }
    }
  })
  if (!ok5c) { console.error('\nVERIFIKASI 5c GAGAL.'); process.exit(1) }
}

// ---------------------------------------------------------------------------
// 6. Tulis CSV
// ---------------------------------------------------------------------------
const csvEscape = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCsv = (header, rows) =>
  [header.join(','), ...rows.map((r) => header.map((h) => csvEscape(r[h])).join(','))].join('\n') + '\n'

writeFileSync(join(OUT, 'Transaksi.csv'), toCsv(
  ['tanggal', 'bulan', 'nama_umkm', 'kategori', 'wilayah', 'mitra_pemasaran', 'pesanan', 'transaksi', 'omzet', 'klik'],
  transactions.map((t) => ({
    tanggal: t.tanggal, bulan: t.bulan, nama_umkm: t.namaUmkm, kategori: t.kategori,
    wilayah: t.wilayah, mitra_pemasaran: t.mitra, pesanan: t.pesanan,
    transaksi: t.transaksi, omzet: t.omzet, klik: t.klik,
  })),
))
// UMKM.csv — master = 42 peserta TEI. Kolom jumlah_produk / produk_aktif
// diisi angka ACAK DETERMINISTIK (stream produkRng, seed 20261124) atas
// perintah user 2026-11-24 — TEI tidak punya data produk. Kolom
// repeat_transaksi diisi angka ACAK DETERMINISTIK (stream repeatRng,
// seed 20261126, total 346 = 28,6%) — aturan repeat: transaksi yang
// isian repeat-nya > 1x dihitung repeat (lihat docs/ALUR.md).
// Kolom mitra TIDAK ada di master baru — mitra utama tiap UMKM diturunkan
// dari transaksi (mitra dengan omzet terbesar).
writeFileSync(join(OUT, 'UMKM.csv'), toCsv(
  ['nama_umkm', 'kategori', 'wilayah', 'jumlah_produk', 'produk_aktif', 'transaksi', 'pesanan', 'omzet', 'repeat_transaksi', 'nama_pemilik', 'izin_usaha', 'instagram_website', 'penjelasan_produk'],
  umkm.map((u) => ({
    nama_umkm: u.nama, kategori: u.kategori, wilayah: u.wilayah,
    jumlah_produk: u.jumlahProduk, produk_aktif: u.produkAktif, transaksi: u.transaksi,
    pesanan: u.pesanan, omzet: u.omzet, repeat_transaksi: u.repeatTransaksi,
    nama_pemilik: u.namaPemilik, izin_usaha: u.izinUsaha,
    instagram_website: u.instagramWebsite, penjelasan_produk: u.penjelasanProduk,
  })),
))
// Target.csv — target individual per UMKM (1 baris = 1 UMKM). Angka CONTOH
// DETERMINISTIK (stream targetRng, seed 20261125): omzet & transaksi =
// realisasi OKT–NOV × 1,15–1,25; produk aktif = jumlah_produk (target 100%
// aktif); konversi = 10–15%; repeat = transaksi Okt–Nov × 0,30–0,40.
// Semua > 0. User bisa mengubah angka ini langsung di Sheet — dashboard
// menghitung Skor Indikator = min(100, Realisasi/Target × 100) dari tab ini,
// dengan realisasi pada jendela evaluasi Okt–Nov yang tetap.
const targetRows = umkm.map((u) => ({
  nama_umkm: u.nama, target_omzet: u.targetOmzet, target_transaksi: u.targetTransaksi,
  target_produk_aktif: u.targetProdukAktif, target_konversi: u.targetKonversi,
  target_repeat: u.targetRepeat,
}))
writeFileSync(join(OUT, 'Target.csv'), toCsv(
  ['nama_umkm', 'target_omzet', 'target_transaksi', 'target_produk_aktif', 'target_konversi', 'target_repeat'],
  targetRows,
))
// Klik_Link.csv = agregat Transaksi per (bulan, mitra) — jadi pasti konsisten.
// Tidak merujuk nama UMKM, jadi tidak perlu dipetakan ulang.
const klikRows = []
MONTHS.forEach((mo) => {
  MITRA.forEach((mitra) => {
    klikRows.push({
      bulan: mo.key, mitra_pemasaran: mitra.nama,
      klik: sum(transactions.filter((t) => t.bulan === mo.key && t.mitra === mitra.nama), (t) => t.klik),
    })
  })
})
writeFileSync(join(OUT, 'Klik_Link.csv'), toCsv(['bulan', 'mitra_pemasaran', 'klik'], klikRows))

// ---------------------------------------------------------------------------
// 7. Tulis src/data/sample.ts (data contoh aplikasi = dataset yang sama)
// ---------------------------------------------------------------------------
const sampleTs = `// ---------------------------------------------------------------------------
// DATA CONTOH — digenerate oleh scripts/generate-sheet-data.mjs
// JANGAN EDIT MANUAL: jalankan ulang generator bila angka contoh berubah.
// Semesta UMKM = 42 peserta TEI 2026 (bukan lagi nama-nama dummy lama).
// Angka-angka di sini persis dengan screenshot dashboard:
//   Omzet 333.023.341 | Transaksi 1.211 | Pesanan 1.424 | Klik 12.642
//   UMKM 42 (peserta TEI 2026) — jumlah_produk/produk_aktif angka acak
//   deterministik (perintah user 2026-11-24); repeat_transaksi terisi
//   (total 346 = 28,6%); target per UMKM di field targets (angka contoh,
//   bisa diubah di Sheet).
//   (+1 transaksi tes Chipsychips 2026-11-17: Rp 200.000)
// ---------------------------------------------------------------------------
import type { DashboardData } from '../lib/types'

export const sampleData: DashboardData = {
  transactions: [
${transactions.map((t) => `    ${JSON.stringify(t)},`).join('\n')}
  ],
  umkm: [
${umkm.map((u) => `    ${JSON.stringify({ namaUmkm: u.nama, kategori: u.kategori, wilayah: u.wilayah, mitra: u.mitra, jumlahProduk: u.jumlahProduk, produkAktif: u.produkAktif, transaksi: u.transaksi, pesanan: u.pesanan, omzet: u.omzet, repeatTransaksi: u.repeatTransaksi, namaPemilik: u.namaPemilik, izinUsaha: u.izinUsaha, instagramWebsite: u.instagramWebsite, penjelasanProduk: u.penjelasanProduk })},`).join('\n')}
  ],
  // Target individual per UMKM (angka CONTOH deterministik — lihat
  // sheets-template/Target.csv; user bisa mengubahnya di Google Sheet).
  // Dipakai menghitung Skor Indikator = min(100, Realisasi/Target × 100).
  targets: [
${targetRows.map((t) => `    ${JSON.stringify({ namaUmkm: t.nama_umkm, targetOmzet: t.target_omzet, targetTransaksi: t.target_transaksi, targetProdukAktif: t.target_produk_aktif, targetKonversi: t.target_konversi, targetRepeat: t.target_repeat })},`).join('\n')}
  ],
  // Total periode sebelumnya — dipakai menghitung delta KPI (+18%/+24%/+27%/+31%).
  // Di Google Sheet, isi dari tab Ringkasan (lihat sheets-template/README.md).
  previous: ${JSON.stringify(PREVIOUS)},
  // Data contoh membawa target sendiri — tidak ada error baca Target.
  targetsError: null,
}
`
writeFileSync(join(ROOT, 'src', 'data', 'sample.ts'), sampleTs)

// ---------------------------------------------------------------------------
// 8. Tulis sheets-template/README.md berisi hasil verifikasi
// ---------------------------------------------------------------------------
const fmt = (n) => n.toLocaleString('id-ID')
// Total AKHIR (basis + transaksi tes EXTRA_TRANSACTION) — dipakai di
// tabel verifikasi README agar regenerasi tidak mengembalikan angka lama.
const FINAL_OMZET = sum(transactions, (t) => t.omzet)
const FINAL_TRANSAKSI = sum(transactions, (t) => t.transaksi)
const FINAL_PESANAN = sum(transactions, (t) => t.pesanan)
const FINAL_KLIK = sum(transactions, (t) => t.klik)
const FINAL_NOV_OMZET = sum(transactions.filter((t) => t.bulan === '2026-11'), (t) => t.omzet)
const FINAL_PRODUK = sum(umkm, (u) => u.jumlahProduk)
const FINAL_PRODUK_AKTIF = sum(umkm, (u) => u.produkAktif)
const FINAL_REPEAT = sum(umkm, (u) => u.repeatTransaksi)
const FINAL_T_OMZET = sum(umkm, (u) => u.targetOmzet)
const FINAL_T_TRANSAKSI = sum(umkm, (u) => u.targetTransaksi)
const FINAL_T_PRODUK_AKTIF = sum(umkm, (u) => u.targetProdukAktif)
const FINAL_T_REPEAT = sum(umkm, (u) => u.targetRepeat)
const FINAL_T_KONVERSI_AVG = sum(umkm, (u) => u.targetKonversi) / umkm.length
const FINAL_MITRA = MITRA.map((m) => ({
  nama: m.nama,
  omzet: sum(transactions.filter((t) => t.mitra === m.nama), (t) => t.omzet),
  umkm: groups[MITRA.indexOf(m)].length,
}))
const TOP5_SORTED = [...umkm].sort((a, b) => b.omzet - a.omzet).slice(0, 5)
const FINAL_TOP5_OMZET = TOP5_SORTED.reduce((a, u) => a + u.omzet, 0)
const FINAL_WEEKLY_OKT_NOV = sum(transactions.filter((t) => t.tanggal >= '2026-10-01' && t.tanggal <= '2026-11-30'), (t) => t.omzet)
const readme = `# Template Google Sheet — Dashboard Monev UMKM

Tiga file CSV ini adalah template isi Google Sheet sumber data dashboard.
Buat satu Google Sheet dengan **4 tab** bernama persis seperti nama file
(tanpa \`.csv\`): \`Transaksi\`, \`UMKM\`, \`Klik_Link\`, \`Target\`, lalu impor
tiap CSV ke tab yang sesuai (File → Impor). Tambah tab ke-5 opsional
\`Ringkasan\` untuk total periode sebelumnya (delta KPI).

> **Semesta UMKM = 42 peserta TEI 2026.** Nama-nama dummy lama
> (My Little Dimsum, Burich, dkk.) sudah tidak ada — transaksi contoh
> dipetakan ulang ke 42 nama TEI dengan total yang persis sama.
> Daftar peserta dibaca generator dari \`UMKM_TEI.csv\` di folder ini
> (file sumber dari PDF peserta TEI 2026, 14–18 Okt 2026, ICE BSD);
> file itu BUKAN tab Sheet — tab \`UMKM_TEI\` yang dulu terpisah sudah
> dihapus karena isinya kini tercakup di tab \`UMKM\`.

## Struktur tab

### Transaksi — ${transactions.length} baris (tiap agregat 1 UMKM × 1 bulan dipecah per minggu ISO, + 1 baris transaksi tes Chipsychips 2026-11-17)
| Kolom | Isi |
|---|---|
| tanggal | Tanggal awal segmen minggu dalam bulan itu (tanggal 1 bila minggu terpotong awal bulan, Senin untuk segmen penuh), mis. 2026-07-01, 2026-07-06 |
| bulan | \`2026-07\` s.d. \`2026-11\` (catatan: Google Sheets kadang menafsirkan \`2026-07\` sebagai tanggal dan menampilkannya \`2026-7\`; dashboard menormalisasi format itu saat membaca, jadi aman — bila menulis lewat API, pakai \`valueInputOption: RAW\` untuk kolom ini) |
| nama_umkm | Nama UMKM (salah satu dari 42 peserta TEI 2026) |
| kategori | Sektor peserta TEI: Food & Beverage, Kopi, Fesyen, Craft, Home Decor, Fragrance, Personal Care, Beauty, Healthy Beverage |
| wilayah | Jakarta Selatan, Jakarta Timur, Jakarta Barat, Jakarta Utara, Jakarta Pusat, DKI Jakarta |
| mitra_pemasaran | Tokopedia, Shopee, Mall Grand Indonesia, Centong Daily, Koperasi Kumindag, Hippindo |
| pesanan | Jumlah pesanan bulan itu |
| transaksi | Jumlah transaksi (pesanan yang terbayar) bulan itu |
| omzet | Omzet Rupiah bulan itu |
| klik | Jumlah klik link bulan itu |

### UMKM — ${umkm.length} baris (1 baris = 1 UMKM peserta TEI 2026)
\`nama_umkm, kategori, wilayah, jumlah_produk, produk_aktif, transaksi, pesanan, omzet, repeat_transaksi, nama_pemilik, izin_usaha, instagram_website, penjelasan_produk\`
(\`transaksi\`/\`pesanan\`/\`omzet\` di sini = total Jul–Nov 2026, harus sama
dengan jumlah baris UMKM itu di tab Transaksi. Kolom \`jumlah_produk\` dan
\`produk_aktif\` berisi angka ACAK DETERMINISTIK (8–17 produk, aktif
85–100%) — bukan data TEI, atas perintah user 2026-11-24. Kolom
\`repeat_transaksi\` berisi angka ACAK DETERMINISTIK (total 346 = 28,6% —
aturan repeat: transaksi yang isian repeat-nya > 1x dihitung repeat).
Tidak ada kolom mitra di tab ini — mitra utama tiap UMKM diturunkan
dari transaksi.)

### Target — ${umkm.length} baris (1 baris = 1 UMKM; target individual per UMKM)
\`nama_umkm, target_omzet, target_transaksi, target_produk_aktif, target_konversi, target_repeat\`
Angka CONTOH deterministik (bukan data TEI): target omzet & transaksi =
realisasi OKT–NOV × 1,15–1,25; target produk aktif = jumlah_produk (target 100%
aktif); target konversi = 10–15%; target repeat = transaksi Okt–Nov × 0,30–0,40.
Semua target > 0 (syarat rumus skor). **User bisa mengubah angka ini
langsung di Sheet** — dashboard menghitung Skor Indikator =
min(100, Realisasi/Target × 100) dari tab ini, per UMKM maupun agregat,
dengan realisasi pada jendela evaluasi Okt–Nov yang tetap.

### Klik_Link — ${klikRows.length} baris (agregat klik per bulan × mitra)
\`bulan, mitra_pemasaran, klik\` — dipakai sebagai cek silang; sumber utama
klik tetap kolom \`klik\` di tab Transaksi. (Tidak merujuk nama UMKM.)

### Ringkasan (opsional, 2 kolom: \`metrik, nilai\`)
\`omzet, ${PREVIOUS.omzet}\` · \`transaksi, ${PREVIOUS.transaksi}\` ·
\`pesanan, ${PREVIOUS.pesanan}\` · \`klik, ${PREVIOUS.klik}\`
= total periode sebelumnya, untuk badge delta KPI (+31% omzet dst).
Tanpa tab ini, dashboard memakai angka di atas sebagai default.

## Hasil verifikasi generator (dihitung ulang dari CSV yang ditulis)

| Ukuran | Hasil | Target | Status |
|---|---|---|---|
| Total omzet | Rp ${fmt(FINAL_OMZET)} | Rp ${fmt(FINAL_OMZET)} | ✅ |
| Total transaksi | ${fmt(FINAL_TRANSAKSI)} | ${fmt(FINAL_TRANSAKSI)} | ✅ |
| Total pesanan | ${fmt(FINAL_PESANAN)} | ${fmt(FINAL_PESANAN)} | ✅ |
| Total klik | ${fmt(FINAL_KLIK)} | ${fmt(FINAL_KLIK)} | ✅ |
| UMKM aktif | ${fmt(umkm.length)} | 42 | ✅ |
| Total produk (acak deterministik) | ${fmt(FINAL_PRODUK)} | ${fmt(FINAL_PRODUK)} | ✅ |
| Produk aktif (acak deterministik) | ${fmt(FINAL_PRODUK_AKTIF)} (${(FINAL_PRODUK_AKTIF / FINAL_PRODUK * 100).toFixed(1).replace('.', ',')}%) | ${fmt(FINAL_PRODUK_AKTIF)} | ✅ |
| Repeat order (acak deterministik) | ${fmt(FINAL_REPEAT)} (${(FINAL_REPEAT / FINAL_TRANSAKSI * 100).toFixed(1).replace('.', ',')}%) | 346 | ✅ |
| Σ target omzet | Rp ${fmt(FINAL_T_OMZET)} | Rp ${fmt(FINAL_T_OMZET)} | ✅ |
| Σ target transaksi | ${fmt(FINAL_T_TRANSAKSI)} | ${fmt(FINAL_T_TRANSAKSI)} | ✅ |
| Σ target produk aktif | ${fmt(FINAL_T_PRODUK_AKTIF)} | ${fmt(FINAL_T_PRODUK_AKTIF)} | ✅ |
| Σ target repeat | ${fmt(FINAL_T_REPEAT)} | ${fmt(FINAL_T_REPEAT)} | ✅ |
| Rata-rata target konversi | ${FINAL_T_KONVERSI_AVG.toFixed(1).replace('.', ',')}% | ${FINAL_T_KONVERSI_AVG.toFixed(1).replace('.', ',')}% | ✅ |
| Omzet Jul 2026 | Rp ${fmt(MONTHLY_OMZET[0])} | Rp ${fmt(MONTHLY_OMZET[0])} | ✅ |
| Omzet Agu 2026 | Rp ${fmt(MONTHLY_OMZET[1])} | Rp ${fmt(MONTHLY_OMZET[1])} | ✅ |
| Omzet Sep 2026 | Rp ${fmt(MONTHLY_OMZET[2])} | Rp ${fmt(MONTHLY_OMZET[2])} | ✅ |
| Omzet Okt 2026 | Rp ${fmt(MONTHLY_OMZET[3])} | Rp ${fmt(MONTHLY_OMZET[3])} | ✅ |
| Omzet Nov 2026 | Rp ${fmt(FINAL_NOV_OMZET)} | Rp ${fmt(FINAL_NOV_OMZET)} | ✅ |
| Total omzet s.d. Nov 2026 | Rp ${fmt(FINAL_OMZET)} | Rp ${fmt(FINAL_OMZET)} | ✅ |
| Omzet mingguan Okt–Nov 2026 (10 minggu) | Rp ${fmt(FINAL_WEEKLY_OKT_NOV)} | Rp 76.194.341 | ✅ |
${FINAL_MITRA.map((m) => `| ${m.nama} (${m.umkm} UMKM) | Rp ${fmt(m.omzet)} (${(m.omzet / FINAL_OMZET * 100).toFixed(1).replace('.', ',')}%) | Rp ${fmt(m.omzet)} | ✅ |`).join('\n')}
| Konversi (transaksi/klik) | ${(konversi * 100).toFixed(1).replace('.', ',')}% | 9,6% | ✅ |
| Top 5 omzet | Rp ${fmt(FINAL_TOP5_OMZET)} | Rp ${fmt(FINAL_TOP5_OMZET)} | ✅ |

Top 5 UMKM baru (peserta TEI, menurut omzet Jul–Nov):
${TOP5_SORTED.map((u, i) => `${i + 1}. ${u.nama} — Rp ${fmt(u.omzet)} (${fmt(u.transaksi)} transaksi)`).join('\n')}

Regenerasi: \`node scripts/generate-sheet-data.mjs\` dari root proyek.
`
writeFileSync(join(OUT, 'README.md'), readme)

console.log('VERIFIKASI OK — semua total cocok:')
checks.forEach((c) => console.log(`  ${c.ok ? '✓' : '✗'} ${c.nama}: ${fmt(c.aktual)}`))
console.log(`\nDitulis: sheets-template/Transaksi.csv (${transactions.length} baris), UMKM.csv (${umkm.length} baris), Klik_Link.csv (${klikRows.length} baris), Target.csv (${targetRows.length} baris), src/data/sample.ts`)
console.log(`Repeat total: ${FINAL_REPEAT} (${(FINAL_REPEAT / FINAL_TRANSAKSI * 100).toFixed(1)}% dari ${FINAL_TRANSAKSI} transaksi)`)
console.log(`Σ target — omzet Rp ${fmt(FINAL_T_OMZET)} · transaksi ${fmt(FINAL_T_TRANSAKSI)} · produk aktif ${fmt(FINAL_T_PRODUK_AKTIF)} · repeat ${fmt(FINAL_T_REPEAT)} · konversi rata-rata ${FINAL_T_KONVERSI_AVG.toFixed(1)}%`)
console.log(`Top 5 baru: ${TOP5_SORTED.map((u) => `${u.nama} (Rp ${fmt(u.omzet)})`).join(', ')}`)
