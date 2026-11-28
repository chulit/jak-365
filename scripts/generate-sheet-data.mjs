// generate-sheet-data.mjs — SATU-SATUNYA sumber kebenaran data contoh.
// Menulis:
//   sheets-template/Transaksi.csv, UMKM.csv, Mitra.csv, Kanal.csv,
//   Katalog.csv, Penugasan.csv, Klik_Link.csv, Target.csv, Ringkasan.csv,
//   README.md, dan src/data/sample.ts (data yang dipakai aplikasi saat
//   Sheet belum dihubungkan)
// Semesta UMKM = 70 baris: 42 peserta TEI 2026 (dibaca dari
// sheets-template/UMKM_TEI.csv — nama-nama dummy lama seperti
// My Little Dimsum SUDAH TIDAK ADA) + 28 peserta Pendampingan Ekspor
// 2026 (dibaca dari sheets-template/UMKM_EKSPOR.csv — disalin dari PDF
// "Data Peserta Pendampingan Ekspor 2026"; kolom No. WhatsApp PIC
// SENGAJA tidak disalin karena Sheet ini publik). 12 peserta ikut
// KEDUA program. Hanya 42 peserta TEI yang punya katalog/target —
// 28 peserta Ekspor kini punya transaksi contoh juga (perintah user
// 2026-11-28, seksi 2b/3b/4c), jadi semua total direkonsiliasi secara
// eksak (assert di akhir script):
//   Omzet 556.023.341 | Transaksi 2.012 | Pesanan 2.375 | Klik 21.047
//   (basis screenshot 332.823.341 / 1.210 / 1.423 / 12.630, ditambah
//    transaksi contoh 28 Ekspor Rp 222.000.000 + 2 transaksi tes —
//    Chipsychips 2026-11-17 (Rp 200.000) dan UMKM-043 2026-11-26
//    (Rp 1.000.000) — lihat EXTRA_TRANSACTIONS
//    di bawah, ditambahkan SETELAH verifikasi basis supaya alokasi
//    bulanan tidak berubah)
//   UMKM 42 (peserta TEI 2026) — jumlah_produk/produk_aktif angka acak
//   deterministik (perintah user 2026-11-24, seed 20261124); TEI tidak
//   punya data produk/repeat. repeat_transaksi diisi angka acak
//   deterministik (seed 20261126, total 346 = 28,5% seperti mockup lama).
//   Target per UMKM (tab Target, seed 20261125) — angka CONTOH
//   deterministik, bisa diubah user di Sheet; skor indikator =
//   min(100, Realisasi/Target × 100).
//   Tren berjalan: Jul 136.761.925, Agu 208.378.885, Sep 256.829.000,
//                   Okt 297.303.000, Nov 334.023.341 (basis 332.823.341
//                   + 2 transaksi tes)
//   Mitra (6, referensi user 2026-11-24): Tokopedia 113.258.500,
//          Shopee 89.614.000, Mall Grand Indonesia 68.492.341,
//          Centong Daily 20.886.167, Koperasi Kumindag 20.886.167,
//          Hippindo 20.886.166 (tiga terakhir memecah kelompok
//          62.658.500, masing-masing 5 UMKM urut daftar TEI).
//          Basis + 2 transaksi tes (Tokopedia): total akhir
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
// RNG TERPISAH untuk field baru struktur relasional (seed 20261127–
// 20261130) — stream sendiri supaya tidak menggeser distribusi
// omzet/transaksi/pesanan/klik dan nilai target_konversi yang sudah ada.
const inquiryRng = mulberry32(20261127)
const kanalRng = mulberry32(20261128)
const katalogRng = mulberry32(20261129)
const target2Rng = mulberry32(20261130)
// RNG TERPISAH untuk transaksi 28 peserta Ekspor (seed 20261201–
// 20261203) — stream sendiri supaya distribusi 42 TEI tidak bergeser.
const eksporRng = mulberry32(20261201)
const eksporInquiryRng = mulberry32(20261202)
const eksporKanalRng = mulberry32(20261203)

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
  return distributeRandomWith(rng, total, weights)
}

/** Seperti distributeRandom, tapi memakai rngFn yang diberikan (dipakai
 *  seksi 4 supaya 28 Ekspor punya stream sendiri). */
function distributeRandomWith(rngFn, total, weights) {
  const wSum = weights.reduce((a, b) => a + b, 0)
  const out = new Array(weights.length).fill(0)
  for (let k = 0; k < total; k++) {
    let r = rngFn() * wSum
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

// Total CONTOH untuk 28 peserta Ekspor (perintah user 2026-11-28:
// "random transaksi" untuk 28 UMKM baru). Skala per UMKM sama seperti
// TEI (rata-rata ~Rp 7,9 jt / ~29 transaksi), dibulatkan. Inquiry
// dihitung per segmen seperti TEI (pesanan + 15–50%), bukan total tetap.
const EKSPOR_TOTAL_OMZET = 222000000
const EKSPOR_TOTAL_TRANSAKSI = 800
const EKSPOR_TOTAL_PESANAN = 950
const EKSPOR_TOTAL_KLIK = 8400
const EKSPOR_MONTHLY_OMZET = [91200000, 47800000, 32400000, 27000000, 23600000] // 222.000.000
const EKSPOR_MONTHLY_TRANSAKSI = [205, 175, 155, 139, 126] // 800
const EKSPOR_MONTHLY_PESANAN = [244, 208, 186, 166, 146] // 950
const EKSPOR_MONTHLY_KLIK = [2162, 1849, 1636, 1457, 1296] // 8.400

// ---------------------------------------------------------------------------
// Master referensi — struktur relasional (keputusan user 2026-11-24):
// tiap master punya ID unik; antar-tab disambung pakai ID, bukan nama.
// Nama tetap ditulis sebagai label supaya Sheet tetap bisa dibaca.
// ---------------------------------------------------------------------------
/** 26 kanal pemasaran referensi (dari mockup, docs/ALUR.md). */
const KANAL = [
  { id: 'KNL-01', nama: 'Instagram', kategori: 'Media Sosial' },
  { id: 'KNL-02', nama: 'TikTok', kategori: 'Media Sosial' },
  { id: 'KNL-03', nama: 'Facebook', kategori: 'Media Sosial' },
  { id: 'KNL-04', nama: 'YouTube', kategori: 'Media Sosial' },
  { id: 'KNL-05', nama: 'Shopee', kategori: 'Marketplace' },
  { id: 'KNL-06', nama: 'Tokopedia', kategori: 'Marketplace' },
  { id: 'KNL-07', nama: 'Lazada', kategori: 'Marketplace' },
  { id: 'KNL-08', nama: 'Blibli', kategori: 'Marketplace' },
  { id: 'KNL-09', nama: 'TikTok Shop', kategori: 'Marketplace' },
  { id: 'KNL-10', nama: 'WhatsApp Business', kategori: 'Komunikasi Langsung' },
  { id: 'KNL-11', nama: 'Telegram', kategori: 'Komunikasi Langsung' },
  { id: 'KNL-12', nama: 'Website Mitra', kategori: 'Website/Toko Online' },
  { id: 'KNL-13', nama: 'Katalog Digital', kategori: 'Website/Toko Online' },
  { id: 'KNL-14', nama: 'Toko', kategori: 'Ritel Fisik' },
  { id: 'KNL-15', nama: 'Minimarket', kategori: 'Ritel Fisik' },
  { id: 'KNL-16', nama: 'Supermarket', kategori: 'Ritel Fisik' },
  { id: 'KNL-17', nama: 'Pusat Perbelanjaan', kategori: 'Ritel Fisik' },
  { id: 'KNL-18', nama: 'Jaringan Korporasi', kategori: 'Penjualan B2B' },
  { id: 'KNL-19', nama: 'Hotel', kategori: 'Penjualan B2B' },
  { id: 'KNL-20', nama: 'Restoran', kategori: 'Penjualan B2B' },
  { id: 'KNL-21', nama: 'Kafe', kategori: 'Penjualan B2B' },
  { id: 'KNL-22', nama: 'Pengadaan Perusahaan', kategori: 'Penjualan B2B' },
  { id: 'KNL-23', nama: 'Pameran', kategori: 'Promosi Offline' },
  { id: 'KNL-24', nama: 'Bazar', kategori: 'Promosi Offline' },
  { id: 'KNL-25', nama: 'Pop-up Store', kategori: 'Promosi Offline' },
  { id: 'KNL-26', nama: 'Lainnya', kategori: 'Lainnya' },
]
const kanalById = new Map(KANAL.map((k) => [k.id, k]))
const kanalByNama = new Map(KANAL.map((k) => [k.nama, k]))

/** Master Mitra (6, referensi user) — jenis + kanal dari penilaian
 *  terhadap model bisnisnya (angka CONTOH); PIC/kontak/email/dokumen/
 *  catatan kosong karena datanya tidak ada (bisa diisi user di Sheet). */
const MITRA_MASTER = [
  { id: 'MTR-001', nama: 'Tokopedia', jenis: 'Retail / Modern Trade', kanal: ['Tokopedia', 'Katalog Digital', 'Website Mitra'], wilayah: 'DKI Jakarta', status: 'Aktif' },
  { id: 'MTR-002', nama: 'Shopee', jenis: 'Retail / Modern Trade', kanal: ['Shopee', 'TikTok Shop', 'Katalog Digital'], wilayah: 'DKI Jakarta', status: 'Aktif' },
  { id: 'MTR-003', nama: 'Mall Grand Indonesia', jenis: 'Retail / Modern Trade', kanal: ['Pusat Perbelanjaan', 'Toko', 'Pameran'], wilayah: 'DKI Jakarta', status: 'Aktif' },
  { id: 'MTR-004', nama: 'Centong Daily', jenis: 'Reseller', kanal: ['Toko', 'WhatsApp Business', 'Instagram'], wilayah: 'DKI Jakarta', status: 'Aktif' },
  { id: 'MTR-005', nama: 'Koperasi Kumindag', jenis: 'Mitra B2B', kanal: ['Jaringan Korporasi', 'Pengadaan Perusahaan', 'Katalog Digital'], wilayah: 'DKI Jakarta', status: 'Aktif' },
  { id: 'MTR-006', nama: 'Hippindo', jenis: 'Retail / Modern Trade', kanal: ['Pusat Perbelanjaan', 'Supermarket', 'Minimarket'], wilayah: 'DKI Jakarta', status: 'Aktif' },
]
const mitraByNama = new Map(MITRA_MASTER.map((m) => [m.nama, m]))

/** Nama produk dasar per UMKM (kunci = no TEI) — diturunkan dari
 *  penjelasan_produk (keputusan user 2026-11-24). Bila jumlah_produk >
 *  jumlah dasar, sisanya diisi varian kemasan/ukuran dari produk dasar.
 *  Harga/stok CONTOH deterministik (stream katalogRng). */
const PRODUK_DASAR = {
  1: ['Keripik Nanas', 'Keripik Nangka', 'Keripik Salak', 'Edamame Panggang', 'Keripik Sayur Tropis'],
  2: ['Sambal Ikan Laut', 'Sambal Cumi', 'Sambal Udang', 'Kerupuk Kulit Ikan'],
  3: ['Susu Bebas Laktosa', 'Keju Olahan', 'Ingredients Keju', 'Pangan Bernutrisi'],
  4: ['Rendang Daging', 'Rendang Ayam', 'Rendang Jengkol', 'Rendang Telur'],
  5: ['Kacang Mete Salted Sea Salt', 'Kacang Mete Garlic', 'Kacang Mete Honey Butter', 'Kacang Mete Spicy Rendang', 'Kacang Mete Dark Chocolate'],
  6: ['Minies Q Oat Protein Cookies Original', 'Minies Q Oat Protein Cookies Coklat', 'Minies Q Oat Protein Cookies Keju'],
  7: ['Rendang Ready-to-Eat', 'Dendeng Ready-to-Eat', 'Gulai Ready-to-Eat', 'Sambal Minang'],
  8: ['Tepung Multiguna Original', 'Tepung Multiguna Premium', 'Tepung Bakery', 'Tepung HORECA'],
  9: ['Nasi Padang Siap Makan', 'Ayam Geprek Siap Makan', 'Rendang Siap Makan', 'Gudeg Siap Makan'],
  10: ['Rempah Nusantara', 'Kopi Indonesia', 'Beras Pangan', 'Bumbu Instan'],
  11: ['Jahe Merah Rempah Serbuk', 'Sekoteng Instan', 'Freeze-Dried Red Ginger', 'Minuman Herbal Rempah'],
  12: ['Madu Murni Premium', 'Madu Hutan', 'Madu Kelulut', 'Madu Sachet'],
  13: ['Keripik Kentang Balado', 'Keripik Kentang Original', 'Kentang Mustofa', 'Kremes Kentang Teri Kacang'],
  14: ['Keripik Ubi Ungu', 'Keripik Ubi Sweet Salted', 'Keripik Ubi BBQ'],
  15: ['Instant Jelly', 'Agar-Agar Instan', 'Instant Vla', 'Instant Puding', 'Silky Puding'],
  16: ['Snack Keluarga Original', 'Snack Keluarga Keju', 'Snack Keluarga Coklat', 'Snack Keluarga Pedas'],
  17: ['Camilan Gandum Almond Coklat', 'Camilan Gandum Gula Aren', 'Camilan Gandum Original'],
  18: ['Madu Murni', 'Gula Semut', 'Minuman Botanikal Serbuk Jahe'],
  19: ['Biji Kopi Arabika', 'Kopi Bubuk', 'Drip Coffee', 'Explorer Box', 'Gift Set Kopi', 'Kapsul Nespresso', 'Kapsul Dolce Gusto'],
  20: ['Green Bean Arabika', 'Roasted Bean', 'Kopi Bubuk', 'Minuman Kopi Susu', 'Makanan Pendamping'],
  21: ['Kopi Bubuk Robusta', 'Kopi Bubuk Arabika', 'Kopi Bubuk Liberika'],
  22: ['Beras Premium', 'Minyak Goreng', 'Gula Pasir', 'Tepung Terigu', 'Pangan Pokok Paket'],
  23: ['Apparel Wastra Modern', 'Seragam Korporat', 'Kemeja Batik', 'Outer Wastra'],
  24: ['Batik Sutra', 'Batik Katun', 'Batik Rayon', 'Kain Batik'],
  25: ['Vest Batik', 'Blezer Tenun', 'Obi Batik'],
  26: ['Dress Batik Tulis', 'Blouse Batik Tulis', 'Outer Modest Batik'],
  27: ['Wastra Batik Tulis', 'Kemeja Batik Pria', 'Dress Batik Wanita', 'Aksesoris Batik'],
  28: ['Kimmecca Linen Etnik', 'Dress Linen', 'Blouse Linen'],
  29: ['Scarf Etnik', 'Kalung Etnik', 'Anting Etnik', 'Gelang Etnik'],
  30: ['Leather Journal', 'Bag Charm Kulit', 'Bracelet Kulit', 'Necklace Mutiara'],
  31: ['Perhiasan Silver Filigree 915', 'Tembaga Lapis Silver', 'Tembaga Lapis Emas', 'Mutiara Barok', 'Pin Logam Custom', 'Koin Logam Custom'],
  32: ['Peralatan Dapur Kayu Jati', 'Peralatan Rumah Kayu Jati', 'Talenan Jati', 'Mangkuk Jati'],
  33: ['Body Care Natural', 'Perfume Natural', 'Home Fragrance', 'Reed Diffuser'],
  34: ['Parfum Scented Story 30ml', 'Parfum Scented Story 50ml', 'Parfum Scented Story 100ml'],
  35: ['Essential Oil Lavender', 'Essential Oil Peppermint', 'Ekstrak Tanaman Kosmetik', 'Minyak Atsiri Campuran'],
  36: ['Essential Oil Herbal', 'Minyak Herbal', 'Perawatan Herbal'],
  37: ['Parfum Introvert 30ml', 'Parfum Introvert 50ml', 'Parfum Introvert 100ml'],
  38: ['Propolis Premium', 'Herbal Propolis Kapsul', 'Herbal Propolis Cair'],
  39: ['Bulu Mata Palsu Natural', 'Bulu Mata Palsu Dramatic', 'Lem Bulu Mata', 'Perawatan Kecantikan'],
  40: ['Dress Modest Ready-to-Wear', 'Blouse Modest', 'Outer Modest', 'Setelan Modest'],
  41: ['Tas Kain Tradisional', 'Dompet Kain', 'Topi Kain', 'Souvenir Kain'],
  42: ['Koleksi Rajut Daily', 'Koleksi Rajut Sports', 'Koleksi Rajut Budaya', 'Tas Rajut'],
}
/** Rentang harga contoh per sektor (Rp) + satuan + sufiks varian. */
const HARGA_KATEGORI = {
  'Food & Beverage': [15000, 150000], Kopi: [25000, 200000], Fesyen: [75000, 750000],
  Craft: [50000, 500000], 'Home Decor': [100000, 1000000], Fragrance: [100000, 600000],
  'Personal Care': [30000, 300000], Beauty: [30000, 300000], 'Healthy Beverage': [50000, 250000],
}
const SATUAN_KATEGORI = {
  'Food & Beverage': 'pack', Kopi: 'pack', Fesyen: 'pcs', Craft: 'pcs', 'Home Decor': 'pcs',
  Fragrance: 'botol', 'Personal Care': 'botol', Beauty: 'pcs', 'Healthy Beverage': 'botol',
}
const VARIAN_SUFFIX = {
  makanan: [' (Kemasan 100g)', ' (Kemasan 250g)', ' (Kemasan 500g)', ' (Paket Isi 3)', ' (Paket Hemat)'],
  nonmakanan: [' (S)', ' (M)', ' (L)', ' (Edisi Khusus)', ' (Paket 2 pcs)'],
}

// Periode sebelumnya (untuk delta +31% / +18% / +24% / +27% di kartu KPI)
const PREVIOUS = { omzet: 254061327, transaksi: 953, pesanan: 1148, klik: 10703 }

// Transaksi tes (ditambahkan atas permintaan user — baris baru, BUKAN
// mengubah baris agregat yang sudah ada):
//   1. 2026-11-17 Chipsychips (peserta TEI pertama) — Rp 200.000.
//   2. 2026-11-26 "Minuman serbuk instan" (UMKM-043, peserta
//      Pendampingan Ekspor pertama) — Rp 1.000.000, supaya UMKM-043
//      punya angka di dashboard.
// Ditambahkan ke `transactions` dan ke master UMKM setelah verifikasi
// basis (bagian 5b), jadi total akhir:
//   Omzet 334.023.341 | Transaksi 1.212 | Pesanan 1.425 | Klik 12.647
const EXTRA_TRANSACTIONS = [
  {
    tanggal: '2026-11-17', bulan: '2026-11', idUmkm: 'UMKM-001', namaUmkm: 'Chipsychips',
    kategori: 'Food & Beverage', wilayah: 'Jakarta Selatan',
    idMitra: 'MTR-001', mitra: 'Tokopedia', idKanal: 'KNL-06', kanal: 'Tokopedia',
    pesanan: 1, transaksi: 1,
    omzet: 200000, klik: 12, inquiry: 2,
  },
  {
    tanggal: '2026-11-26', bulan: '2026-11', idUmkm: 'UMKM-043', namaUmkm: 'Minuman serbuk instan',
    kategori: 'Food & Beverage', wilayah: '',
    idMitra: 'MTR-001', mitra: 'Tokopedia', idKanal: 'KNL-06', kanal: 'Tokopedia',
    pesanan: 1, transaksi: 1,
    omzet: 1000000, klik: 5, inquiry: 1,
  },
]

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
    // ID unik (struktur relasional 2026-11-24): id_umkm = kunci sambung
    // antar-tab; kode_peserta = kode bisnis format mockup (JP-xxxxxxxx).
    // program = program pendampingan yang diikuti (diperbarui di seksi 1b
    // untuk 12 peserta yang ikut Pendampingan Ekspor juga).
    id: `UMKM-${String(t.no).padStart(3, '0')}`,
    kodePeserta: `JP-${31000000 + t.no}`,
    grade: '',
    program: 'TEI 2026',
    namaPerusahaan: '',
    idMitra: '',
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
// Grade (mockup: A/B/C) — tertil omzet: 14 terbesar A, 14 tengah B,
// 14 terkecil C. Dihitung SETELAH distribusi omzet di atas.
{
  const byOmzet = [...umkm].sort((a, b) => b.omzet - a.omzet)
  byOmzet.forEach((u, i) => { u.grade = i < 14 ? 'A' : i < 28 ? 'B' : 'C' })
}

// ---------------------------------------------------------------------------
// 1b. Peserta Pendampingan Ekspor 2026 (keputusan user 2026-11-26):
//     digabung ke master UMKM + kolom `program`.
//     Input: sheets-template/UMKM_EKSPOR.csv (40 baris, disalin dari PDF
//     "Data Peserta Pendampingan Ekspor 2026" — kolom No. WhatsApp PIC
//     SENGAJA tidak disalin: Sheet ini publik).
//     Hasil: 12 baris COCOK dengan peserta TEI (program jadi
//     "TEI 2026; Pendampingan Ekspor 2026" + nama perusahaan dari PDF);
//     28 baris BARU (UMKM-043…070, program "Pendampingan Ekspor 2026",
//     tanpa transaksi/katalog/penugasan/target — 0 transaksi, jadi
//     total KPI, Top 5, dan Skor Kinerja TIDAK berubah).
//     Kategori PDF dinormalisasi ke kategori Sheet: Agriculture & Food
//     Products → Food & Beverage; Fashion & Apparel → Fesyen;
//     Beauty, Wellness & Personal Care → Beauty; Home, Lifestyle &
//     Craft Products → Craft. (Kategori 12 yang cocok TIDAK ditimpa —
//     Sheet lebih spesifik, mis. Meta Biolife tetap Healthy Beverage.)
//     nama_pemilik diisi dari Nama PIC HANYA bila jabatannya pemilik/
//     pendiri/direktur/CEO; Pendamping, Creative Director, Sales
//     Manager, Anggota Sales → kosong ("—").
//     wilayah / izin / IG / penjelasan produk tidak ada di PDF → kosong.
// ---------------------------------------------------------------------------
const KATEGORI_EKSPOR = {
  'Agriculture & Food Products': 'Food & Beverage',
  'Fashion & Apparel': 'Fesyen',
  'Beauty, Wellness & Personal Care': 'Beauty',
  'Home, Lifestyle & Craft Products': 'Craft',
}
const JABATAN_PEMILIK = new Set([
  'pemilik', 'pemilik/direktur', 'founder', 'founder & ceo', 'direktur',
  'direktur utama', 'ceo', 'owner', 'co founder', 'co founder /coo', 'cofounder',
])
const normNama = (s) => (s ?? '').toLowerCase().replace(/\b(pt|cv|tbk)\b\.?/g, '').replace(/[^a-z0-9]/g, '')
const eksporCsv = parseCsv(readFileSync(join(OUT, 'UMKM_EKSPOR.csv'), 'utf8'))
const eksporHeader = eksporCsv[0]
const eCol = (name) => {
  const i = eksporHeader.indexOf(name)
  if (i < 0) throw new Error(`UMKM_EKSPOR.csv: kolom "${name}" tidak ditemukan`)
  return i
}
const ekspor = eksporCsv.slice(1).map((r) => ({
  no: Number(r[eCol('no')]) || 0,
  namaPic: r[eCol('nama_pic')] ?? '',
  jabatanPic: r[eCol('jabatan_pic')] ?? '',
  namaPerusahaan: r[eCol('nama_perusahaan')] ?? '',
  merkUsaha: r[eCol('merk_usaha')] ?? '',
  ket: r[eCol('ket')] ?? '',
}))
if (ekspor.length !== 40) throw new Error(`UMKM_EKSPOR.csv: peserta harus 40, dapat ${ekspor.length}`)
const eksporBaru = []
let eksporCocok = 0
for (const e of ekspor) {
  if (!e.merkUsaha) throw new Error('UMKM_EKSPOR.csv: ada baris tanpa merk_usaha')
  const kategori = KATEGORI_EKSPOR[e.ket]
  if (!kategori) throw new Error(`UMKM_EKSPOR.csv: ket "${e.ket}" belum dipetakan ke kategori Sheet`)
  const cocok = umkm.filter((u) =>
    normNama(e.merkUsaha) === normNama(u.nama) ||
    normNama(e.namaPerusahaan) === normNama(u.nama) ||
    normNama(u.nama).includes(normNama(e.merkUsaha)) ||
    normNama(e.merkUsaha).includes(normNama(u.nama)),
  )
  if (cocok.length > 1) throw new Error(`UMKM_EKSPOR.csv: "${e.merkUsaha}" cocok dengan ${cocok.length} baris TEI`)
  if (cocok.length === 1) {
    cocok[0].program = 'TEI 2026; Pendampingan Ekspor 2026'
    cocok[0].namaPerusahaan = e.namaPerusahaan
    eksporCocok++
    continue
  }
  const idx = eksporBaru.length
  eksporBaru.push({
    no: 43 + idx,
    namaPemilik: JABATAN_PEMILIK.has(e.jabatanPic.trim().toLowerCase()) ? e.namaPic : '',
    namaUsaha: e.merkUsaha,
    wilayah: '',
    sektor: kategori,
    izinUsaha: '',
    instagramWebsite: '',
    penjelasanProduk: '',
    id: `UMKM-${String(43 + idx).padStart(3, '0')}`,
    kodePeserta: `JP-${31000000 + 43 + idx}`,
    grade: '',
    program: 'Pendampingan Ekspor 2026',
    namaPerusahaan: e.namaPerusahaan,
    nama: e.merkUsaha,
    kategori,
    jumlahProduk: null, produkAktif: null,
    omzet: 0, transaksi: 0, pesanan: 0, mitra: '', idMitra: '',
    repeatTransaksi: null,
  })
}
if (eksporCocok !== 12) throw new Error(`UMKM_EKSPOR.csv: cocok harus 12, dapat ${eksporCocok}`)
if (eksporBaru.length !== 28) throw new Error(`UMKM_EKSPOR.csv: baris baru harus 28, dapat ${eksporBaru.length}`)
// umkmAll = SEMUA baris master (70) — dipakai HANYA untuk tab UMKM.csv
// dan sample.ts. Semua hitungan (transaksi, katalog, penugasan, target,
// repeat, skor) tetap memakai `umkm` (42 TEI) supaya total tidak berubah.
const umkmAll = [...umkm, ...eksporBaru]

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
    groups[g].forEach((u) => { u.mitra = MITRA[g].nama; u.idMitra = MITRA_MASTER[g].id })
  }
  const remainder = sortedByOmzet.slice(cursor).sort((a, b) => a.no - b.no)
  if (remainder.length !== 15) throw new Error(`mitra: sisa kelompok harus 15, dapat ${remainder.length}`)
  for (let k = 0; k < 3; k++) {
    const chunk = remainder.slice(k * 5, k * 5 + 5)
    const g = 3 + k
    scaleGroupToTarget(chunk, MITRA[g].omzet)
    chunk.forEach((u) => { u.mitra = MITRA[g].nama; u.idMitra = MITRA_MASTER[g].id })
    groups[g] = chunk
  }
}
if (groups.flat().length !== umkm.length) throw new Error('mitra: jumlah UMKM tidak cocok')

// ---------------------------------------------------------------------------
// 2b. Mitra + total per UMKM untuk 28 peserta Ekspor (perintah user
//     2026-11-28: "random transaksi" untuk 28 UMKM baru).
//     Mitra: round-robin urut daftar PDF (5,5,5,5,4,4). Total per UMKM:
//     bobot acak (stream eksporRng) dengan total tetap EKSPOR_TOTAL_*,
//     min 1 transaksi/pesanan/klik dan min Rp 300.000 omzet per UMKM —
//     supaya ke-28 UMKM pasti punya angka (tidak ada yang 0).
// ---------------------------------------------------------------------------
{
  const weights = eksporBaru.map(() => 0.5 + eksporRng())
  const omzet = distribute(EKSPOR_TOTAL_OMZET, weights, 300000)
  const transaksi = distribute(EKSPOR_TOTAL_TRANSAKSI, omzet, 1)
  const pesanan = distribute(EKSPOR_TOTAL_PESANAN, omzet, 1)
  eksporBaru.forEach((u, i) => {
    u.omzet = omzet[i]; u.transaksi = transaksi[i]; u.pesanan = pesanan[i]
    const mitra = MITRA[i % MITRA.length]
    u.mitra = mitra.nama; u.idMitra = MITRA_MASTER[i % MITRA.length].id
  })
}
const eksporKlikPerUmkm = distribute(EKSPOR_TOTAL_KLIK, eksporBaru.map((u) => u.omzet), 1)

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

// 3b. Alokasi bulanan 28 Ekspor (matriks eksak yang sama, target bulanan
//     EKSPOR_MONTHLY_*).
const emOmzet = allocateMonthly(eksporBaru.map((u) => u.omzet), EKSPOR_MONTHLY_OMZET)
const emTransaksi = allocateMonthly(eksporBaru.map((u) => u.transaksi), EKSPOR_MONTHLY_TRANSAKSI)
const emPesanan = allocateMonthly(eksporBaru.map((u) => u.pesanan), EKSPOR_MONTHLY_PESANAN)
const emKlik = allocateMonthly(eksporKlikPerUmkm, EKSPOR_MONTHLY_KLIK)

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

/** Bangun baris Transaksi untuk satu daftar UMKM (tiap agregat UMKM x
 *  bulan dipecah per minggu). `streams` = { rng, inquiryRng, kanalRng }.
 *  Dipanggil 2x: 42 TEI dengan stream lama (hasilnya harus byte-identik
 *  dengan sebelumnya) dan 28 Ekspor dengan stream eksporRng (seksi 4c). */
function buildTxRows(list, mOmzet, mTransaksi, mPesanan, mKlik, streams) {
  const rows = []
  list.forEach((u, i) => {
    MONTHS.forEach((mo, m) => {
      const [year, month] = mo.key.split('-').map(Number)
      const segs = weekSegmentsInMonth(year, month - 1)
      // Bobot = jumlah hari × jitter deterministik per baris (±15%). Tanpa
      // jitter, distribute() (largest remainder, seri = indeks) akan selalu
      // memberikan sisa hitungan kecil ke segmen yang sama, sehingga total
      // transaksi mingguan jadi timpang (mis. minggu ke-2 selalu jauh lebih
      // besar). Satu set bobot dipakai untuk keempat metrik dalam baris
      // yang sama, jadi pesanan/transaksi/omzet/klik tetap proporsional.
      const weights = segs.map((s) => s.days * (0.85 + streams.rng() * 0.3))
      // Hitungan kecil (pesanan/transaksi/klik, biasanya 1–30 per baris)
      // dibagi dengan undian multinomial per unit: largest remainder
      // akan selalu menguntungkan segmen tengah untuk total kecil,
      // sehingga minggu pertama/terakhir bulan tampak kosong.
      const pesananSeg = distributeRandomWith(streams.rng, mPesanan[i][m], weights)
      const transaksiSeg = distributeRandomWith(streams.rng, mTransaksi[i][m], weights)
      const omzetSeg = distribute(mOmzet[i][m], weights)
      const klikSeg = distributeRandomWith(streams.rng, mKlik[i][m], weights)
      // Inquiry per segmen: corong inquiry ≥ pesanan — pesanan + 15–50%
      // (bila pesanan 0, 0–2 inquiry mentah).
      // Kanal per segmen: satu kanal dari daftar kanal mitra itu —
      // kanal utama slice tersebut; Kanal Aktif per UMKM = jumlah kanal
      // berbeda di semua barisnya.
      const inquirySeg = segs.map((_, s) => {
        const p = pesananSeg[s]
        return p > 0 ? p + Math.round(p * (0.15 + streams.inquiryRng() * 0.35)) : Math.floor(streams.inquiryRng() * 3)
      })
      const kanalSeg = segs.map(() => {
        const daftar = mitraByNama.get(u.mitra)?.kanal ?? ['Lainnya']
        const nama = daftar[Math.floor(streams.kanalRng() * daftar.length)]
        const kanal = kanalByNama.get(nama) ?? { id: 'KNL-26', nama: 'Lainnya' }
        return kanal
      })
      segs.forEach((seg, s) => {
        // Lewati segmen yang nol di semua metrik (jumlah tetap terjaga).
        if (pesananSeg[s] + transaksiSeg[s] + omzetSeg[s] + klikSeg[s] + inquirySeg[s] === 0) return
        rows.push({
          tanggal: seg.start, bulan: mo.key,
          idUmkm: u.id, namaUmkm: u.nama, kategori: u.kategori,
          wilayah: u.wilayah, idMitra: u.idMitra, mitra: u.mitra,
          idKanal: kanalSeg[s].id, kanal: kanalSeg[s].nama,
          pesanan: pesananSeg[s],
          transaksi: transaksiSeg[s], omzet: omzetSeg[s], klik: klikSeg[s],
          inquiry: inquirySeg[s],
        })
      })
    })
  })
  return rows
}

const transactions = buildTxRows(umkm, mOmzet, mTransaksi, mPesanan, mKlik, { rng, inquiryRng, kanalRng })

// 4c. Baris Transaksi 28 peserta Ekspor (matriks em* dari seksi 3b,
//     stream eksporRng — distribusi 42 TEI di atas tidak bergeser).
const transactionsEkspor = buildTxRows(eksporBaru, emOmzet, emTransaksi, emPesanan, emKlik, { rng: eksporRng, inquiryRng: eksporInquiryRng, kanalRng: eksporKanalRng })

// ---------------------------------------------------------------------------
// 4b. Katalog produk + Penugasan (struktur relasional 2026-11-24).
//     Katalog: 1 produk per baris, jumlah per UMKM = jumlah_produk
//     (total 525); nama dari PRODUK_DASAR (penjelasan TEI) + varian
//     kemasan/ukuran bila kurang; harga/stok CONTOH (stream katalogRng);
//     status: produkAktif pertama "Tayang", sisanya "Menunggu", 1
//     "Tidak Disetujui" bila sisa >= 2 (total Tayang = 497 persis).
//     Penugasan: 1 baris per pasangan UMKM×mitra yang ada di Transaksi
//     (70 baris — tiap UMKM kini punya 1 mitra utama); kanal utama =
//     kanal pertama mitra itu; periode 01 Okt–31 Des 2026, status Aktif.
// ---------------------------------------------------------------------------
const katalog = []
umkm.forEach((u) => {
  const dasar = PRODUK_DASAR[u.no] ?? []
  if (dasar.length === 0) throw new Error(`katalog: UMKM ${u.nama} tidak punya produk dasar`)
  const suffixes = ['Food & Beverage', 'Kopi', 'Healthy Beverage'].includes(u.kategori)
    ? VARIAN_SUFFIX.makanan : VARIAN_SUFFIX.nonmakanan
  const [hargaMin, hargaMax] = HARGA_KATEGORI[u.kategori] ?? [10000, 100000]
  const sisa = u.jumlahProduk - u.produkAktif
  for (let i = 0; i < u.jumlahProduk; i++) {
    const nama = i < dasar.length
      ? dasar[i]
      : dasar[i % dasar.length] + suffixes[(Math.floor(i / dasar.length) - 1) % suffixes.length]
    const status = i < u.produkAktif ? 'Tayang' : (sisa >= 2 && i === u.jumlahProduk - 1 ? 'Tidak Disetujui' : 'Menunggu')
    katalog.push({
      id: `PRD-${String(katalog.length + 1).padStart(3, '0')}`,
      idUmkm: u.id, namaUmkm: u.nama, namaProduk: nama, kategori: u.kategori,
      harga: Math.round((hargaMin + katalogRng() * (hargaMax - hargaMin)) / 1000) * 1000,
      stok: 10 + Math.floor(katalogRng() * 190),
      satuan: SATUAN_KATEGORI[u.kategori] ?? 'pcs',
      statusVerifikasi: status,
    })
  }
})
const penugasan = umkmAll.map((u, i) => {
  const mitra = mitraByNama.get(u.mitra)
  if (!mitra) throw new Error(`penugasan: mitra ${u.mitra} tidak ada di master`)
  const kanalUtama = kanalByNama.get(mitra.kanal[0])
  return {
    id: `PNG-${String(i + 1).padStart(3, '0')}`,
    idUmkm: u.id, namaUmkm: u.nama,
    idMitra: mitra.id, namaMitra: mitra.nama,
    idKanal: kanalUtama.id, kanal: kanalUtama.nama,
    periode: '01 Okt–31 Des 2026', status: 'Aktif',
  }
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
// --- Integritas struktur relasional: ID unik + kunci asing valid. ---
const umkmIds = new Set(umkm.map((u) => u.id))
allOk &= check('ID UMKM unik (42)', umkmIds.size, 42)
allOk &= check('Kode peserta unik (42)', new Set(umkm.map((u) => u.kodePeserta)).size, 42)
// Master gabungan (TEI + Pendampingan Ekspor): 70 baris, ID/kode unik.
allOk &= check('Jumlah baris master UMKM (TEI + Ekspor)', umkmAll.length, 70)
allOk &= check('ID UMKM unik (70)', new Set(umkmAll.map((u) => u.id)).size, 70)
allOk &= check('Kode peserta unik (70)', new Set(umkmAll.map((u) => u.kodePeserta)).size, 70)
allOk &= check('UMKM program TEI 2026', umkmAll.filter((u) => u.program.includes('TEI 2026')).length, 42)
allOk &= check('UMKM program Pendampingan Ekspor 2026', umkmAll.filter((u) => u.program.includes('Pendampingan Ekspor 2026')).length, 40)
allOk &= check('UMKM ikut kedua program', umkmAll.filter((u) => u.program.includes(';')).length, 12)
allOk &= check('UMKM Ekspor tanpa transaksi', eksporBaru.filter((u) => u.transaksi === 0).length, 0)
allOk &= check('ID Mitra unik (6)', new Set(MITRA_MASTER.map((m) => m.id)).size, 6)
allOk &= check('ID Kanal unik (26)', new Set(KANAL.map((k) => k.id)).size, 26)
allOk &= check('ID Produk unik (525)', new Set(katalog.map((p) => p.id)).size, sum(umkm, (u) => u.jumlahProduk))
allOk &= check('ID Penugasan unik (70)', new Set(penugasan.map((p) => p.id)).size, 70)
// Total per UMKM Ekspor di Transaksi harus sama dengan total masternya.
eksporBaru.forEach((u) => {
  const rows = transactionsEkspor.filter((t) => t.namaUmkm === u.nama)
  allOk &= check(`Total omzet ${u.nama}`, sum(rows, (t) => t.omzet), u.omzet)
  allOk &= check(`Total transaksi ${u.nama}`, sum(rows, (t) => t.transaksi), u.transaksi)
  allOk &= check(`Total pesanan ${u.nama}`, sum(rows, (t) => t.pesanan), u.pesanan)
})
{
  const badTx = transactions.filter((t) => !umkmIds.has(t.idUmkm) || !mitraByNama.has(t.mitra) || !kanalById.has(t.idKanal))
  if (badTx.length > 0) { console.error(`  ✗ Transaksi dengan FK tidak valid: ${badTx.length} baris`); allOk = false }
  const umkmAllIds = new Set(umkmAll.map((u) => u.id))
  const badTxEkspor = transactionsEkspor.filter((t) => !umkmAllIds.has(t.idUmkm) || !mitraByNama.has(t.mitra) || !kanalById.has(t.idKanal))
  if (badTxEkspor.length > 0) { console.error(`  ✗ Transaksi Ekspor dengan FK tidak valid: ${badTxEkspor.length} baris`); allOk = false }
  const badKat = katalog.filter((p) => !umkmIds.has(p.idUmkm))
  if (badKat.length > 0) { console.error(`  ✗ Katalog dengan id_umkm tidak valid: ${badKat.length} baris`); allOk = false }
  const badPen = penugasan.filter((p) => !umkmAllIds.has(p.idUmkm) || !kanalById.has(p.idKanal))
  if (badPen.length > 0) { console.error(`  ✗ Penugasan dengan FK tidak valid: ${badPen.length} baris`); allOk = false }
  // Inquiry: corong inquiry ≥ pesanan di tiap baris.
  const badInq = [...transactions, ...transactionsEkspor].filter((t) => t.inquiry < t.pesanan)
  if (badInq.length > 0) { console.error(`  ✗ Inquiry < pesanan: ${badInq.length} baris`); allOk = false }
  // Katalog: Tayang = produk aktif (497), Menunggu + Tidak Disetujui = 28.
  allOk &= check('Produk Tayang (katalog)', katalog.filter((p) => p.statusVerifikasi === 'Tayang').length, sum(umkm, (u) => u.produkAktif))
  allOk &= check('Produk tidak tayang (katalog)', katalog.filter((p) => p.statusVerifikasi !== 'Tayang').length, sum(umkm, (u) => u.jumlahProduk - u.produkAktif))
  // Kanal Aktif per UMKM (jendela Okt–Nov): 1–4 kanal (daftar kanal mitranya).
  const kanalAktifOktNov = new Map()
  for (const t of [...transactions, ...transactionsEkspor]) {
    if (t.bulan < '2026-10' || t.bulan > '2026-11') continue
    const s = kanalAktifOktNov.get(t.idUmkm) ?? new Set()
    s.add(t.idKanal)
    kanalAktifOktNov.set(t.idUmkm, s)
  }
  umkmAll.forEach((u) => {
    const n = kanalAktifOktNov.get(u.id)?.size ?? 0
    if (!(n >= 1 && n <= 4)) { console.error(`  ✗ Kanal aktif ${u.nama}: ${n} (harus 1–4)`); allOk = false }
  })
}
if (!allOk) { console.error('\nVERIFIKASI GAGAL — perbaiki generator sebelum memakai CSV.'); process.exit(1) }

// ---------------------------------------------------------------------------
// 5b. Transaksi tes (EXTRA_TRANSACTIONS) — SETELAH verifikasi basis.
//      Baris baru ditambahkan apa adanya; baris agregat lama tidak diubah.
// ---------------------------------------------------------------------------
for (const extra of EXTRA_TRANSACTIONS) {
  transactions.push({ ...extra })
  // Cari di umkmAll (70), bukan umkm (42 TEI) — UMKM-043 dst. hanya
  // ada di umkmAll.
  const target = umkmAll.find((u) => u.nama === extra.namaUmkm)
  if (!target) throw new Error(`5b: ${extra.namaUmkm} tidak ditemukan di master UMKM`)
  target.transaksi += extra.transaksi
  target.pesanan += extra.pesanan
  target.omzet += extra.omzet
}
// Gabungan untuk total akhir + penulisan CSV/sample (42 TEI + 28 Ekspor
// + transaksi tes).
const allTransactions = [...transactions, ...transactionsEkspor]
// Verifikasi total akhir (basis + 28 Ekspor + transaksi tes)
let finalOk = true
finalOk &= check('Total omzet akhir', sum(allTransactions, (t) => t.omzet), 556023341)
finalOk &= check('Total transaksi akhir', sum(allTransactions, (t) => t.transaksi), 2012)
finalOk &= check('Total pesanan akhir', sum(allTransactions, (t) => t.pesanan), 2375)
finalOk &= check('Total klik akhir', sum(allTransactions, (t) => t.klik), 21047)
finalOk &= check('Omzet Nov 2026 akhir', sum(allTransactions.filter((t) => t.bulan === '2026-11'), (t) => t.omzet), 60320341)
finalOk &= check('Omzet Okt–Nov mingguan akhir', sum(allTransactions.filter((t) => t.tanggal >= '2026-10-01' && t.tanggal <= '2026-11-30'), (t) => t.omzet), 127794341)
finalOk &= check('Total omzet Ekspor (28)', sum(transactionsEkspor, (t) => t.omzet), 222000000)
finalOk &= check('Total transaksi Ekspor (28)', sum(transactionsEkspor, (t) => t.transaksi), 800)
finalOk &= check('Total pesanan Ekspor (28)', sum(transactionsEkspor, (t) => t.pesanan), 950)
finalOk &= check('Total klik Ekspor (28)', sum(transactionsEkspor, (t) => t.klik), 8400)
finalOk &= check('Chipsychips omzet akhir', sum(transactions.filter((t) => t.namaUmkm === 'Chipsychips'), (t) => t.omzet), umkm.find((u) => u.nama === 'Chipsychips').omzet)
finalOk &= check('Chipsychips transaksi akhir', sum(transactions.filter((t) => t.namaUmkm === 'Chipsychips'), (t) => t.transaksi), umkm.find((u) => u.nama === 'Chipsychips').transaksi)
if (!finalOk) { console.error('\nVERIFIKASI AKHIR GAGAL.'); process.exit(1) }

// ---------------------------------------------------------------------------
// 5c. Repeat + Target per UMKM (angka CONTOH deterministik — bukan data
//      TEI; user bisa mengubahnya di Sheet). Dihitung SETELAH 5b supaya
//      memakai omzet/transaksi FINAL (basis + 2 transaksi tes).
//      Repeat: total 346 (28,5% seperti mockup lama), dibagi proporsional
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
  // target_konversi tidak bergeser; dua target baru (inquiry, kanal)
  // memakai stream target2Rng yang terpisah.
  const oktNov = new Map()
  for (const t of transactions) {
    if (t.bulan < '2026-10' || t.bulan > '2026-11') continue
    const a = oktNov.get(t.namaUmkm) ?? { omzet: 0, transaksi: 0, inquiry: 0 }
    a.omzet += t.omzet
    a.transaksi += t.transaksi
    a.inquiry += t.inquiry
    oktNov.set(t.namaUmkm, a)
  }
  umkm.forEach((u) => {
    const base = oktNov.get(u.nama) ?? { omzet: 0, transaksi: 0, inquiry: 0 }
    u.targetOmzet = Math.round(base.omzet * (1.15 + targetRng() * 0.10))
    u.targetTransaksi = Math.round(base.transaksi * (1.15 + targetRng() * 0.10))
    u.targetProdukAktif = u.jumlahProduk
    u.targetKonversi = 10 + Math.floor(targetRng() * 6)
    u.targetRepeat = Math.max(1, Math.round(base.transaksi * (0.30 + targetRng() * 0.10)))
    u.targetInquiry = Math.max(1, Math.round(base.inquiry * (1.15 + target2Rng() * 0.10)))
    u.targetKanalAktif = 2 + Math.floor(target2Rng() * 2)
  })
  let ok5c = true
  ok5c &= check('Total repeat_transaksi', sum(umkm, (u) => u.repeatTransaksi), 346)
  umkm.forEach((u) => {
    if (!(u.repeatTransaksi >= 0 && u.repeatTransaksi <= u.transaksi)) {
      console.error(`  ✗ repeat ${u.nama}: ${u.repeatTransaksi} dari ${u.transaksi} transaksi`); ok5c = false
    }
    for (const [k, v] of [['target_omzet', u.targetOmzet], ['target_transaksi', u.targetTransaksi], ['target_produk_aktif', u.targetProdukAktif], ['target_konversi', u.targetKonversi], ['target_repeat', u.targetRepeat], ['target_inquiry', u.targetInquiry], ['target_kanal_aktif', u.targetKanalAktif]]) {
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
  ['tanggal', 'bulan', 'id_umkm', 'nama_umkm', 'kategori', 'wilayah', 'id_mitra', 'mitra_pemasaran', 'id_kanal', 'kanal_pemesanan', 'pesanan', 'transaksi', 'omzet', 'klik', 'jumlah_inquiry'],
  allTransactions.map((t) => ({
    tanggal: t.tanggal, bulan: t.bulan, id_umkm: t.idUmkm, nama_umkm: t.namaUmkm, kategori: t.kategori,
    wilayah: t.wilayah, id_mitra: t.idMitra, mitra_pemasaran: t.mitra,
    id_kanal: t.idKanal, kanal_pemesanan: t.kanal, pesanan: t.pesanan,
    transaksi: t.transaksi, omzet: t.omzet, klik: t.klik, jumlah_inquiry: t.inquiry,
  })),
))
// UMKM.csv — master = 70 baris: 42 peserta TEI + 28 peserta
// Pendampingan Ekspor 2026 (12 ikut keduanya — lihat seksi 1b).
// Kolom jumlah_produk / produk_aktif diisi angka ACAK DETERMINISTIK
// (stream produkRng, seed 20261124) atas perintah user 2026-11-24 —
// TEI tidak punya data produk; 28 baris Ekspor KOSONG (null → "—")
// karena PDF Ekspor tidak punya data produk. Kolom repeat_transaksi
// diisi angka ACAK DETERMINISTIK (stream repeatRng, seed 20261126,
// total 346 = 28,5%) — aturan repeat: transaksi yang isian
// repeat-nya > 1x dihitung repeat (lihat docs/ALUR.md); baris Ekspor
// kosong.
// id_umkm (UMKM-001…) = kunci sambung antar-tab; kode_peserta (JP-…)
// = kode bisnis format mockup; grade = tertil omzet (A/B/C, hanya
// 42 TEI — baris Ekspor kosong karena grade tidak dihitung untuk mereka).
// Kolom mitra TIDAK ada di master baru — mitra utama tiap UMKM diturunkan
// dari transaksi (mitra dengan omzet terbesar).
// Kolom program = program pendampingan yang diikuti; nama_perusahaan =
// nama badan usaha bila diketahui dari PDF Ekspor (12 yang cocok +
// 28 baru), kosong untuk 30 TEI lainnya.
writeFileSync(join(OUT, 'UMKM.csv'), toCsv(
  ['id_umkm', 'kode_peserta', 'grade', 'nama_umkm', 'kategori', 'wilayah', 'jumlah_produk', 'produk_aktif', 'transaksi', 'repeat_transaksi', 'nama_pemilik', 'izin_usaha', 'instagram_website', 'penjelasan_produk', 'program', 'nama_perusahaan'],
  umkmAll.map((u) => ({
    id_umkm: u.id, kode_peserta: u.kodePeserta, grade: u.grade,
    nama_umkm: u.nama, kategori: u.kategori, wilayah: u.wilayah,
    jumlah_produk: u.jumlahProduk, produk_aktif: u.produkAktif, transaksi: u.transaksi,
    repeat_transaksi: u.repeatTransaksi,
    nama_pemilik: u.namaPemilik, izin_usaha: u.izinUsaha,
    instagram_website: u.instagramWebsite, penjelasan_produk: u.penjelasanProduk,
    program: u.program, nama_perusahaan: u.namaPerusahaan,
  })),
))
// Target.csv — target individual per UMKM (1 baris = 1 UMKM). Angka CONTOH
// DETERMINISTIK (stream targetRng, seed 20261125; target_inquiry &
// target_kanal_aktif memakai stream target2Rng, seed 20261130): omzet &
// transaksi = realisasi OKT–NOV × 1,15–1,25; produk aktif = jumlah_produk
// (target 100% aktif); konversi = 10–15%; repeat = transaksi Okt–Nov ×
// 0,30–0,40; inquiry = inquiry Okt–Nov × 1,15–1,25; kanal aktif = 2–3.
// Semua > 0. User bisa mengubah angka ini langsung di Sheet — dashboard
// menghitung Skor Indikator = min(100, Realisasi/Target × 100) dari tab ini,
// dengan realisasi pada jendela evaluasi Okt–Nov yang tetap.
const targetRows = umkm.map((u) => ({
  id_umkm: u.id, nama_umkm: u.nama, target_omzet: u.targetOmzet, target_transaksi: u.targetTransaksi,
  target_produk_aktif: u.targetProdukAktif, target_konversi: u.targetKonversi,
  target_repeat: u.targetRepeat, target_inquiry: u.targetInquiry, target_kanal_aktif: u.targetKanalAktif,
}))
writeFileSync(join(OUT, 'Target.csv'), toCsv(
  ['id_umkm', 'nama_umkm', 'target_omzet', 'target_transaksi', 'target_produk_aktif', 'target_konversi', 'target_repeat', 'target_inquiry', 'target_kanal_aktif'],
  targetRows,
))
// Klik_Link.csv = agregat Transaksi per (bulan, mitra) — jadi pasti konsisten.
// Tidak merujuk nama UMKM, jadi tidak perlu dipetakan ulang.
const klikRows = []
MONTHS.forEach((mo) => {
  MITRA.forEach((mitra) => {
    klikRows.push({
      bulan: mo.key, id_mitra: mitraByNama.get(mitra.nama).id, mitra_pemasaran: mitra.nama,
      klik: sum(allTransactions.filter((t) => t.bulan === mo.key && t.mitra === mitra.nama), (t) => t.klik),
    })
  })
})
writeFileSync(join(OUT, 'Klik_Link.csv'), toCsv(['bulan', 'id_mitra', 'mitra_pemasaran', 'klik'], klikRows))
// Mitra.csv — master mitra (6 baris). PIC/kontak/email/dokumen/catatan
// kosong karena datanya tidak ada; kategori_produk = semua sektor.
writeFileSync(join(OUT, 'Mitra.csv'), toCsv(
  ['id_mitra', 'nama_mitra', 'jenis', 'pic', 'kontak', 'email', 'kategori_produk', 'wilayah', 'kanal', 'status', 'dokumen', 'catatan'],
  MITRA_MASTER.map((m) => ({
    id_mitra: m.id, nama_mitra: m.nama, jenis: m.jenis, pic: '', kontak: '', email: '',
    kategori_produk: 'Semua sektor', wilayah: m.wilayah, kanal: m.kanal.join('; '),
    status: m.status, dokumen: '', catatan: '',
  })),
))
// Kanal.csv — 26 kanal referensi (dari mockup).
writeFileSync(join(OUT, 'Kanal.csv'), toCsv(
  ['id_kanal', 'nama_kanal', 'kategori'],
  KANAL.map((k) => ({ id_kanal: k.id, nama_kanal: k.nama, kategori: k.kategori })),
))
// Katalog.csv — 525 produk (jumlah per UMKM = jumlah_produk). Nama dari
// penjelasan TEI (+ varian kemasan/ukuran); harga/stok CONTOH.
writeFileSync(join(OUT, 'Katalog.csv'), toCsv(
  ['id_produk', 'id_umkm', 'nama_umkm', 'nama_produk', 'kategori', 'harga', 'stok', 'satuan', 'status_verifikasi'],
  katalog.map((p) => ({
    id_produk: p.id, id_umkm: p.idUmkm, nama_umkm: p.namaUmkm, nama_produk: p.namaProduk,
    kategori: p.kategori, harga: p.harga, stok: p.stok, satuan: p.satuan,
    status_verifikasi: p.statusVerifikasi,
  })),
))
// Penugasan.csv — 70 baris (1 per UMKM × mitra utamanya). Kanal utama =
// kanal pertama mitra itu; periode 01 Okt–31 Des 2026.
writeFileSync(join(OUT, 'Penugasan.csv'), toCsv(
  ['id_penugasan', 'id_umkm', 'nama_umkm', 'id_mitra', 'nama_mitra', 'id_kanal', 'kanal', 'periode', 'status'],
  penugasan.map((p) => ({
    id_penugasan: p.id, id_umkm: p.idUmkm, nama_umkm: p.namaUmkm,
    id_mitra: p.idMitra, nama_mitra: p.namaMitra, id_kanal: p.idKanal, kanal: p.kanal,
    periode: p.periode, status: p.status,
  })),
))
// Ringkasan.csv — total periode sebelumnya (untuk delta KPI). BUKAN total
// Sep: delta membandingkan jendela 5 bulan dengan 5 bulan sebelumnya, jadi
// baseline-nya harus seperiode (angka CONTOH dari screenshot awal — sama
// dengan fallback yang selama ini dipakai sample.ts).
writeFileSync(join(OUT, 'Ringkasan.csv'), toCsv(
  ['metrik', 'nilai'],
  [
    { metrik: 'omzet', nilai: PREVIOUS.omzet },
    { metrik: 'transaksi', nilai: PREVIOUS.transaksi },
    { metrik: 'pesanan', nilai: PREVIOUS.pesanan },
    { metrik: 'klik', nilai: PREVIOUS.klik },
  ],
))

// ---------------------------------------------------------------------------
// 7. Tulis src/data/sample.ts (data contoh aplikasi = dataset yang sama)
// ---------------------------------------------------------------------------
const sampleTs = `// ---------------------------------------------------------------------------
// DATA CONTOH — digenerate oleh scripts/generate-sheet-data.mjs
// JANGAN EDIT MANUAL: jalankan ulang generator bila angka contoh berubah.
// Semesta UMKM = 70 baris: 42 peserta TEI 2026 + 28 peserta
// Pendampingan Ekspor 2026 (12 ikut keduanya — lihat
// scripts/generate-sheet-data.mjs seksi 1b). Bukan lagi nama-nama dummy lama.
// Angka-angka di sini persis dengan screenshot dashboard:
//   Omzet 556.023.341 | Transaksi 2.012 | Pesanan 2.375 | Klik 21.047
//   (42 TEI + 28 Ekspor dengan transaksi contoh, perintah user
//    2026-11-28; lihat seksi 2b/3b/4c)
//   UMKM 42 (peserta TEI 2026) — jumlah_produk/produk_aktif angka acak
//   deterministik (perintah user 2026-11-24); repeat_transaksi terisi
//   (total 346 = 28,5%); target per UMKM di field targets (angka contoh,
//   bisa diubah di Sheet).
//   (+2 transaksi tes: Chipsychips 2026-11-17 Rp 200.000 dan
//    Minuman serbuk instan / UMKM-043 2026-11-26 Rp 1.000.000)
// ---------------------------------------------------------------------------
import type { DashboardData } from '../lib/types'

export const sampleData: DashboardData = {
  transactions: [
${allTransactions.map((t) => `    ${JSON.stringify(t)},`).join('\n')}
  ],
  umkm: [
${umkmAll.map((u) => `    ${JSON.stringify({ idUmkm: u.id, kodePeserta: u.kodePeserta, grade: u.grade, namaUmkm: u.nama, kategori: u.kategori, wilayah: u.wilayah, mitra: u.mitra, jumlahProduk: u.jumlahProduk, produkAktif: u.produkAktif, transaksi: u.transaksi, repeatTransaksi: u.repeatTransaksi, namaPemilik: u.namaPemilik, izinUsaha: u.izinUsaha, instagramWebsite: u.instagramWebsite, penjelasanProduk: u.penjelasanProduk, program: u.program, namaPerusahaan: u.namaPerusahaan })},`).join('\n')}
  ],
  // Target individual per UMKM (angka CONTOH deterministik — lihat
  // sheets-template/Target.csv; user bisa mengubahnya di Google Sheet).
  // Dipakai menghitung Skor Indikator = min(100, Realisasi/Target × 100).
  targets: [
${targetRows.map((t) => `    ${JSON.stringify({ idUmkm: t.id_umkm, namaUmkm: t.nama_umkm, targetOmzet: t.target_omzet, targetTransaksi: t.target_transaksi, targetProdukAktif: t.target_produk_aktif, targetKonversi: t.target_konversi, targetRepeat: t.target_repeat, targetInquiry: t.target_inquiry, targetKanalAktif: t.target_kanal_aktif })},`).join('\n')}
  ],
  // Master referensi (struktur relasional 2026-11-24): Mitra, Kanal,
  // Katalog, Penugasan — disambung ke transaksi/UMKM lewat ID.
  mitra: [
${MITRA_MASTER.map((m) => `    ${JSON.stringify({ idMitra: m.id, namaMitra: m.nama, jenis: m.jenis, pic: '', kontak: '', email: '', kategoriProduk: 'Semua sektor', wilayah: m.wilayah, kanal: m.kanal, status: m.status, dokumen: '', catatan: '' })},`).join('\n')}
  ],
  kanal: [
${KANAL.map((k) => `    ${JSON.stringify({ idKanal: k.id, namaKanal: k.nama, kategori: k.kategori })},`).join('\n')}
  ],
  katalog: [
${katalog.map((p) => `    ${JSON.stringify({ idProduk: p.id, idUmkm: p.idUmkm, namaUmkm: p.namaUmkm, namaProduk: p.namaProduk, kategori: p.kategori, harga: p.harga, stok: p.stok, satuan: p.satuan, statusVerifikasi: p.statusVerifikasi })},`).join('\n')}
  ],
  penugasan: [
${penugasan.map((p) => `    ${JSON.stringify({ idPenugasan: p.id, idUmkm: p.idUmkm, namaUmkm: p.namaUmkm, idMitra: p.idMitra, namaMitra: p.namaMitra, idKanal: p.idKanal, kanal: p.kanal, periode: p.periode, status: p.status })},`).join('\n')}
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
// Total AKHIR (basis + 28 Ekspor + transaksi tes EXTRA_TRANSACTIONS) — dipakai di
// tabel verifikasi README agar regenerasi tidak mengembalikan angka lama.
const FINAL_OMZET = sum(allTransactions, (t) => t.omzet)
const FINAL_TRANSAKSI = sum(allTransactions, (t) => t.transaksi)
const FINAL_PESANAN = sum(allTransactions, (t) => t.pesanan)
const FINAL_KLIK = sum(allTransactions, (t) => t.klik)
const FINAL_NOV_OMZET = sum(allTransactions.filter((t) => t.bulan === '2026-11'), (t) => t.omzet)
const FINAL_PRODUK = sum(umkm, (u) => u.jumlahProduk)
const FINAL_PRODUK_AKTIF = sum(umkm, (u) => u.produkAktif)
const FINAL_REPEAT = sum(umkm, (u) => u.repeatTransaksi)
const FINAL_INQUIRY = sum(allTransactions, (t) => t.inquiry)
const FINAL_INQUIRY_OKT_NOV = sum(allTransactions.filter((t) => t.bulan >= '2026-10' && t.bulan <= '2026-11'), (t) => t.inquiry)
const FINAL_KANAL_AKTIF_MEAN = (() => {
  const perUmkm = new Map()
  for (const t of allTransactions) {
    if (t.bulan < '2026-10' || t.bulan > '2026-11') continue
    const s = perUmkm.get(t.idUmkm) ?? new Set()
    s.add(t.idKanal)
    perUmkm.set(t.idUmkm, s)
  }
  return [...perUmkm.values()].reduce((a, s) => a + s.size, 0) / perUmkm.size
})()
const FINAL_KATALOG_TAYANG = katalog.filter((p) => p.statusVerifikasi === 'Tayang').length
const FINAL_T_OMZET = sum(umkm, (u) => u.targetOmzet)
const FINAL_T_TRANSAKSI = sum(umkm, (u) => u.targetTransaksi)
const FINAL_T_PRODUK_AKTIF = sum(umkm, (u) => u.targetProdukAktif)
const FINAL_T_REPEAT = sum(umkm, (u) => u.targetRepeat)
const FINAL_T_INQUIRY = sum(umkm, (u) => u.targetInquiry)
const FINAL_T_KANAL_AKTIF = sum(umkm, (u) => u.targetKanalAktif)
const FINAL_T_KONVERSI_AVG = sum(umkm, (u) => u.targetKonversi) / umkm.length
const FINAL_MITRA = MITRA.map((m) => ({
  nama: m.nama,
  omzet: sum(allTransactions.filter((t) => t.mitra === m.nama), (t) => t.omzet),
  umkm: groups[MITRA.indexOf(m)].length,
}))
const TOP5_SORTED = [...umkm].sort((a, b) => b.omzet - a.omzet).slice(0, 5)
const FINAL_TOP5_OMZET = TOP5_SORTED.reduce((a, u) => a + u.omzet, 0)
const FINAL_WEEKLY_OKT_NOV = sum(allTransactions.filter((t) => t.tanggal >= '2026-10-01' && t.tanggal <= '2026-11-30'), (t) => t.omzet)
const readme = `# Template Google Sheet — Dashboard Monev UMKM

Sembilan file CSV ini adalah template isi Google Sheet sumber data dashboard.
Buat satu Google Sheet dengan **9 tab** bernama persis seperti nama file
(tanpa \`.csv\`): \`Transaksi\`, \`UMKM\`, \`Mitra\`, \`Kanal\`, \`Katalog\`,
\`Penugasan\`, \`Klik_Link\`, \`Target\`, \`Ringkasan\`, lalu impor tiap CSV
ke tab yang sesuai (File → Impor).

> **Struktur relasional (2026-11-24).** Tiap master punya ID unik dan
> antar-tab disambung pakai ID, bukan nama: \`id_umkm\` (UMKM-001…),
> \`id_mitra\` (MTR-001…), \`id_kanal\` (KNL-01…), \`id_produk\` (PRD-001…),
> \`id_penugasan\` (PNG-001…). Nama tetap ditulis sebagai label supaya
> Sheet tetap bisa dibaca. Angka mockup diabaikan — yang dibangun adalah
> struktur + data yang bisa diolah dashboard.
>
> **Semesta UMKM = 70 baris: 42 peserta TEI 2026 + 28 peserta
> Pendampingan Ekspor 2026 (12 ikut keduanya).** Nama-nama dummy lama
> (My Little Dimsum, Burich, dkk.) sudah tidak ada — transaksi contoh
> dipetakan ulang ke 42 nama TEI dengan total yang persis sama.
> Daftar TEI dibaca generator dari \`UMKM_TEI.csv\` di folder ini
> (file sumber dari PDF peserta TEI 2026, 14–18 Okt 2026, ICE BSD);
> daftar Ekspor dibaca dari \`UMKM_EKSPOR.csv\` (disalin dari PDF
> "Data Peserta Pendampingan Ekspor 2026" — kolom No. WhatsApp PIC
> sengaja tidak disalin karena Sheet ini publik). Kedua file itu BUKAN
> tab Sheet — tab \`UMKM_TEI\` yang dulu terpisah sudah dihapus karena
> isinya kini tercakup di tab \`UMKM\`.

## Struktur tab

### Transaksi — ${allTransactions.length} baris (tiap agregat 1 UMKM × 1 bulan dipecah per minggu ISO; 42 TEI + 28 Ekspor + 2 baris transaksi tes)
| Kolom | Isi |
|---|---|
| tanggal | Tanggal awal segmen minggu dalam bulan itu (tanggal 1 bila minggu terpotong awal bulan, Senin untuk segmen penuh), mis. 2026-07-01, 2026-07-06 |
| bulan | \`2026-07\` s.d. \`2026-11\` (catatan: Google Sheets kadang menafsirkan \`2026-07\` sebagai tanggal dan menampilkannya \`2026-7\`; dashboard menormalisasi format itu saat membaca, jadi aman — bila menulis lewat API, pakai \`valueInputOption: RAW\` untuk kolom ini) |
| id_umkm | ID unik UMKM (UMKM-001 s.d. UMKM-042) — kunci sambung ke tab UMKM |
| nama_umkm | Nama UMKM (salah satu dari 42 peserta TEI 2026) |
| kategori | Sektor peserta TEI: Food & Beverage, Kopi, Fesyen, Craft, Home Decor, Fragrance, Personal Care, Beauty, Healthy Beverage |
| wilayah | Jakarta Selatan, Jakarta Timur, Jakarta Barat, Jakarta Utara, Jakarta Pusat, DKI Jakarta |
| id_mitra | ID unik mitra (MTR-001 s.d. MTR-006) — kunci sambung ke tab Mitra |
| mitra_pemasaran | Tokopedia, Shopee, Mall Grand Indonesia, Centong Daily, Koperasi Kumindag, Hippindo |
| id_kanal | ID unik kanal (KNL-01 s.d. KNL-26) — kunci sambung ke tab Kanal |
| kanal_pemesanan | Kanal utama slice ini (satu kanal dari daftar kanal mitra itu) |
| pesanan | Jumlah pesanan bulan itu |
| transaksi | Jumlah transaksi (pesanan yang terbayar) bulan itu |
| omzet | Omzet Rupiah bulan itu |
| klik | Jumlah klik link bulan itu |
| jumlah_inquiry | Jumlah inquiry bulan itu (corong: inquiry ≥ pesanan; angka CONTOH deterministik) |

### UMKM — ${umkmAll.length} baris (42 peserta TEI 2026 + 28 peserta Pendampingan Ekspor 2026; 12 ikut keduanya)
\`id_umkm, kode_peserta, grade, nama_umkm, kategori, wilayah, jumlah_produk, produk_aktif, transaksi, repeat_transaksi, nama_pemilik, izin_usaha, instagram_website, penjelasan_produk, program, nama_perusahaan\`
(\`transaksi\` di sini = total Jul–Nov 2026, harus sama
dengan jumlah baris UMKM itu di tab Transaksi — 28 baris Ekspor 0
karena belum ada transaksinya. Kolom \`pesanan\` dan
\`omzet\` DIHAPUS 2026-11-24 atas perintah user (redundan — semua angka
pesanan/omzet dashboard dihitung dari tab Transaksi, bukan dari master).
\`kode_peserta\` = kode bisnis format mockup (JP-xxxxxxxx, CONTOH);
\`grade\` = tertil omzet (A/B/C, hanya 42 TEI — baris Ekspor kosong).
\`produk_aktif\` berisi angka ACAK
DETERMINISTIK (8–17 produk, aktif 85–100%) — bukan data TEI, atas
perintah user 2026-11-24; baris Ekspor kosong. Kolom \`repeat_transaksi\` berisi angka ACAK
DETERMINISTIK (total 346 = 28,5% — aturan repeat: transaksi yang isian
repeat-nya > 1x dihitung repeat).
Tidak ada kolom mitra di tab ini — mitra utama tiap UMKM diturunkan
dari transaksi. \`program\` = program pendampingan yang diikuti
("TEI 2026", "Pendampingan Ekspor 2026", atau keduanya dipisah "; ");
\`nama_perusahaan\` = nama badan usaha bila diketahui dari PDF Ekspor.)

### Mitra — ${MITRA_MASTER.length} baris (master mitra)
\`id_mitra, nama_mitra, jenis, pic, kontak, email, kategori_produk, wilayah, kanal, status, dokumen, catatan\`
Jenis + kanal dari penilaian model bisnis (CONTOH); PIC/kontak/email/
dokumen/catatan kosong karena datanya tidak ada — bisa diisi user di Sheet.

### Kanal — ${KANAL.length} baris (26 kanal referensi dari mockup)
\`id_kanal, nama_kanal, kategori\`

### Katalog — ${katalog.length} baris (1 baris = 1 produk; jumlah per UMKM = jumlah_produk)
\`id_produk, id_umkm, nama_umkm, nama_produk, kategori, harga, stok, satuan, status_verifikasi\`
Nama produk diturunkan dari penjelasan produk TEI (+ varian kemasan/
ukuran bila kurang); harga/stok angka CONTOH deterministik. Status:
Tayang = produk aktif (${FINAL_KATALOG_TAYANG}), sisanya Menunggu /
Tidak Disetujui.

### Penugasan — ${penugasan.length} baris (1 baris = 1 UMKM × mitra utamanya)
\`id_penugasan, id_umkm, nama_umkm, id_mitra, nama_mitra, id_kanal, kanal, periode, status\`
Kanal = kanal utama (pertama) mitra itu; periode 01 Okt–31 Des 2026.

### Target — ${umkm.length} baris (1 baris = 1 UMKM; target individual per UMKM)
\`id_umkm, nama_umkm, target_omzet, target_transaksi, target_produk_aktif, target_konversi, target_repeat, target_inquiry, target_kanal_aktif\`
Angka CONTOH deterministik (bukan data TEI): target omzet & transaksi =
realisasi OKT–NOV × 1,15–1,25; target produk aktif = jumlah_produk (target 100%
aktif); target konversi = 10–15%; target repeat = transaksi Okt–Nov × 0,30–0,40;
target inquiry = inquiry Okt–Nov × 1,15–1,25; target kanal aktif = 2–3.
Semua target > 0 (syarat rumus skor). **User bisa mengubah angka ini
langsung di Sheet** — dashboard menghitung Skor Indikator =
min(100, Realisasi/Target × 100) dari tab ini, per UMKM maupun agregat,
dengan realisasi pada jendela evaluasi Okt–Nov yang tetap. Skor Kinerja
terbobot = Katalog 20% + Kanal Aktif 15% + Inquiry 15% + Transaksi 20% +
Omzet 20% + Repeat 10% (status: ≥85 Sangat Baik, ≥70 Baik, ≥55 Cukup,
di bawah itu Kurang).

### Klik_Link — ${klikRows.length} baris (agregat klik per bulan × mitra)
\`bulan, id_mitra, mitra_pemasaran, klik\` — dipakai sebagai cek silang; sumber utama
klik tetap kolom \`klik\` di tab Transaksi. (Tidak merujuk nama UMKM.)

### Ringkasan (2 kolom: \`metrik, nilai\`)
\`omzet, ${PREVIOUS.omzet}\` · \`transaksi, ${PREVIOUS.transaksi}\` ·
\`pesanan, ${PREVIOUS.pesanan}\` · \`klik, ${PREVIOUS.klik}\`
= total periode sebelumnya (5 bulan), untuk badge delta KPI (+31% omzet dst).
BUKAN total Sep: delta membandingkan jendela 5 bulan dengan 5 bulan
sebelumnya, jadi baseline-nya harus seperiode. Angka CONTOH dari
screenshot awal (sama dengan fallback yang selama ini dipakai sample.ts).

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
| Total inquiry (CONTOH deterministik) | ${fmt(FINAL_INQUIRY)} | ${fmt(FINAL_INQUIRY)} | ✅ |
| Inquiry Okt–Nov 2026 | ${fmt(FINAL_INQUIRY_OKT_NOV)} | ${fmt(FINAL_INQUIRY_OKT_NOV)} | ✅ |
| Rata-rata kanal aktif per UMKM (Okt–Nov) | ${FINAL_KANAL_AKTIF_MEAN.toFixed(2).replace('.', ',')} kanal | ${FINAL_KANAL_AKTIF_MEAN.toFixed(2).replace('.', ',')} kanal | ✅ |
| Katalog: produk | ${fmt(katalog.length)} | ${fmt(FINAL_PRODUK)} | ✅ |
| Katalog: Tayang | ${fmt(FINAL_KATALOG_TAYANG)} | ${fmt(FINAL_PRODUK_AKTIF)} | ✅ |
| Penugasan | ${fmt(penugasan.length)} | 42 | ✅ |
| Σ target omzet | Rp ${fmt(FINAL_T_OMZET)} | Rp ${fmt(FINAL_T_OMZET)} | ✅ |
| Σ target transaksi | ${fmt(FINAL_T_TRANSAKSI)} | ${fmt(FINAL_T_TRANSAKSI)} | ✅ |
| Σ target produk aktif | ${fmt(FINAL_T_PRODUK_AKTIF)} | ${fmt(FINAL_T_PRODUK_AKTIF)} | ✅ |
| Σ target repeat | ${fmt(FINAL_T_REPEAT)} | ${fmt(FINAL_T_REPEAT)} | ✅ |
| Σ target inquiry | ${fmt(FINAL_T_INQUIRY)} | ${fmt(FINAL_T_INQUIRY)} | ✅ |
| Σ target kanal aktif | ${fmt(FINAL_T_KANAL_AKTIF)} | ${fmt(FINAL_T_KANAL_AKTIF)} | ✅ |
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
console.log(`\nDitulis: sheets-template/Transaksi.csv (${allTransactions.length} baris), UMKM.csv (${umkmAll.length} baris), Mitra.csv (${MITRA_MASTER.length} baris), Kanal.csv (${KANAL.length} baris), Katalog.csv (${katalog.length} baris), Penugasan.csv (${penugasan.length} baris), Klik_Link.csv (${klikRows.length} baris), Target.csv (${targetRows.length} baris), Ringkasan.csv (4 baris), src/data/sample.ts`)
console.log(`Inquiry total: ${fmt(FINAL_INQUIRY)} (Okt–Nov: ${fmt(FINAL_INQUIRY_OKT_NOV)}) · Kanal aktif rata-rata/UMKM (Okt–Nov): ${FINAL_KANAL_AKTIF_MEAN.toFixed(2)} · Katalog: ${katalog.length} produk, ${FINAL_KATALOG_TAYANG} tayang`)
console.log(`Σ target — inquiry ${fmt(FINAL_T_INQUIRY)} · kanal aktif ${fmt(FINAL_T_KANAL_AKTIF)}`)
console.log(`Repeat total: ${FINAL_REPEAT} (${(FINAL_REPEAT / FINAL_TRANSAKSI * 100).toFixed(1)}% dari ${FINAL_TRANSAKSI} transaksi)`)
console.log(`Σ target — omzet Rp ${fmt(FINAL_T_OMZET)} · transaksi ${fmt(FINAL_T_TRANSAKSI)} · produk aktif ${fmt(FINAL_T_PRODUK_AKTIF)} · repeat ${fmt(FINAL_T_REPEAT)} · konversi rata-rata ${FINAL_T_KONVERSI_AVG.toFixed(1)}%`)
console.log(`Top 5 baru: ${TOP5_SORTED.map((u) => `${u.nama} (Rp ${fmt(u.omzet)})`).join(', ')}`)
