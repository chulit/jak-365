// verify-formulas.mjs — menguji rumus dashboard terhadap Sheet LIVE.
//
// Pertanyaan yang dijawab skrip ini: "apakah angka yang tampil di
// dashboard benar-benar mengikuti rumusnya?" Caranya 3 lapis yang
// saling independen:
//
//   1. Ambil ke-9 tab Sheet live via gviz CSV (sumber yang sama persis
//      dengan yang dibaca dashboard di browser).
//   2. Jalankan rumus ASLI aplikasi (src/lib/compute.ts — ditranspile
//      dengan paket typescript lokal, tanpa bundler) di atas data itu.
//   3. Hitung ulang angka yang sama dengan aritmetika polos langsung
//      dari baris CSV, lalu bandingkan dengan (2) dan dengan nilai
//      harapan yang sudah terverifikasi.
//
// Jadi kalau ada rumus yang salah di compute.ts, lapis (3) akan
// menangkapnya; kalau ada data yang salah di Sheet, nilai harapan
// akan menangkapnya. Keluar kode 1 bila ada satu saja pemeriksaan
// yang gagal.
//
// Jalankan: node scripts/verify-formulas.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const SHEET_ID = '1v8velGd7wZflo82bX0oB7fcisckQve67n6jppNBdSmg'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILTERS = { startMonth: '2026-10', endMonth: '2026-11', mitra: 'semua', kategori: 'semua', wilayah: 'semua' }
const EVAL = { start: '2026-10', end: '2026-11' }

// --- 1. Muat rumus ASLI aplikasi (compute.ts) -------------------------------
const require = createRequire(import.meta.url)
const ts = require('typescript')
const src = readFileSync(join(ROOT, 'src/lib/compute.ts'), 'utf8')
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const mod = { exports: {} }
new Function('module', 'exports', 'require', outputText)(mod, mod.exports, require)
const compute = mod.exports

// --- 2. Ambil Sheet live ----------------------------------------------------
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

async function fetchTab(tab) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`Tab "${tab}" HTTP ${res.status}`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw new Error(`Tab "${tab}" tidak terbaca (Sheet belum publik?)`)
  return parseCsv(text)
}

function rowsToObjects(rows) {
  if (rows.length < 2) return []
  const header = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ''))
  return rows.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
}

const num = (v) => {
  const n = Number((v ?? '').replace(/[.\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const numOrNull = (v) => {
  if ((v ?? '').trim() === '') return null
  const n = Number((v ?? '').replace(/[.\s]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const normalizeMonth = (v) => {
  const m = (v ?? '').trim().match(/^(\d{4})-(\d{1,2})$/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : (v ?? '').trim()
}

// --- 3. Bangun DashboardData dari CSV live (pemetaan yang sama dengan
//        src/lib/sheets.ts — field mapping, BUKAN rumus) ----------------------
function buildData(tabs) {
  const transactions = rowsToObjects(tabs.Transaksi)
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
  const umkm = rowsToObjects(tabs.UMKM)
    .filter((r) => r.nama_umkm)
    .map((r) => {
      const fromTx = transactions.filter((t) => t.namaUmkm === r.nama_umkm)
      return {
        idUmkm: r.id_umkm || '',
        kodePeserta: r.kode_peserta || '—',
        grade: r.grade || '—',
        namaUmkm: r.nama_umkm,
        kategori: r.kategori || 'Lainnya',
        wilayah: r.wilayah || '—',
        mitra: r.mitra_pemasaran || fromTx[0]?.mitra || '—',
        jumlahProduk: numOrNull(r.jumlah_produk),
        produkAktif: numOrNull(r.produk_aktif),
        transaksi: num(r.transaksi) || fromTx.reduce((a, t) => a + t.transaksi, 0),
        repeatTransaksi: numOrNull(r.repeat_transaksi),
        namaPemilik: r.nama_pemilik || '—',
        izinUsaha: r.izin_usaha || '—',
        instagramWebsite: r.instagram_website || '',
        penjelasanProduk: r.penjelasan_produk || '',
        program: r.program || '—',
        namaPerusahaan: r.nama_perusahaan || '',
      }
    })
  const mitra = rowsToObjects(tabs.Mitra).map((r) => ({
    idMitra: r.id_mitra || '', namaMitra: r.nama_mitra || '—', jenis: r.jenis || '—',
    kanal: (r.kanal || '').split(';').map((s) => s.trim()).filter(Boolean), status: r.status || '—',
  }))
  const kanal = rowsToObjects(tabs.Kanal).map((r) => ({ idKanal: r.id_kanal || '', namaKanal: r.nama_kanal || '—', kategori: r.kategori || '—' }))
  const katalog = rowsToObjects(tabs.Katalog).map((r) => ({
    idProduk: r.id_produk || '', idUmkm: r.id_umkm || '', namaUmkm: r.nama_umkm || '—',
    namaProduk: r.nama_produk || '—', kategori: r.kategori || 'Lainnya',
    harga: num(r.harga), stok: num(r.stok), satuan: r.satuan || 'pcs', statusVerifikasi: r.status_verifikasi || '—',
  }))
  const penugasan = rowsToObjects(tabs.Penugasan).map((r) => ({
    idPenugasan: r.id_penugasan || '', idUmkm: r.id_umkm || '', namaUmkm: r.nama_umkm || '—',
    idMitra: r.id_mitra || '', namaMitra: r.nama_mitra || '—', idKanal: r.id_kanal || '',
    kanal: r.kanal || '—', periode: r.periode || '—', status: r.status || '—',
  }))
  const umkmByName = new Map(umkm.map((u) => [u.namaUmkm, u]))
  const mitraByName = new Map(mitra.map((m) => [m.namaMitra, m]))
  const kanalByName = new Map(kanal.map((k) => [k.namaKanal, k]))
  transactions.forEach((t) => {
    if (!t.idUmkm) t.idUmkm = umkmByName.get(t.namaUmkm)?.idUmkm ?? ''
    if (!t.idMitra) t.idMitra = mitraByName.get(t.mitra)?.idMitra ?? ''
    if (!t.idKanal) t.idKanal = kanalByName.get(t.kanal)?.idKanal ?? ''
  })
  const ringkasan = rowsToObjects(tabs.Ringkasan)
  const getPrev = (metrik) => {
    const row = ringkasan.find((r) => r.metrik?.toLowerCase() === metrik)
    return row ? num(row.nilai) : 0
  }
  const previous = { omzet: getPrev('omzet'), transaksi: getPrev('transaksi'), pesanan: getPrev('pesanan'), klik: getPrev('klik') }
  const targets = rowsToObjects(tabs.Target)
    .filter((r) => r.nama_umkm)
    .map((r) => ({
      idUmkm: r.id_umkm || '', namaUmkm: r.nama_umkm,
      targetOmzet: num(r.target_omzet), targetTransaksi: num(r.target_transaksi),
      targetProdukAktif: num(r.target_produk_aktif), targetKonversi: num(r.target_konversi),
      targetRepeat: num(r.target_repeat), targetInquiry: num(r.target_inquiry),
      targetKanalAktif: num(r.target_kanal_aktif),
    }))
    .filter((t) => t.targetOmzet > 0 || t.targetTransaksi > 0 || t.targetRepeat > 0)
  return { transactions, umkm, previous, targets, targetsError: targets.length ? null : 'Target kosong', mitra, kanal, katalog, penugasan }
}

// --- 4. Pemeriksaan ----------------------------------------------------------
const fmt = (n) => typeof n === 'number' ? Math.round(n).toLocaleString('id-ID') : String(n)
const rp = (n) => `Rp ${fmt(n)}`
let passed = 0
let failed = 0
function check(nama, aktual, harapan, toleransi = 0) {
  const ok = typeof harapan === 'number'
    ? typeof aktual === 'number' && Math.abs(aktual - harapan) <= toleransi
    : aktual === harapan
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nama}: ${typeof aktual === 'number' && Math.abs(aktual) >= 1000 ? fmt(aktual) : aktual} (harapan: ${typeof harapan === 'number' && Math.abs(harapan) >= 1000 ? fmt(harapan) : harapan}${toleransi ? ` ±${toleransi}` : ''})`)
  if (ok) passed++; else failed++
}
function section(nama) { console.log(`\n== ${nama} ==`) }

const tabs = {}
for (const tab of ['Transaksi', 'UMKM', 'Mitra', 'Kanal', 'Katalog', 'Penugasan', 'Klik_Link', 'Target', 'Ringkasan']) {
  tabs[tab] = await fetchTab(tab)
}
const data = buildData(tabs)
const app = compute.computeDashboard(data, FILTERS)
const sum = (a) => a.reduce((x, y) => x + y, 0)
const tx = data.transactions
const inEval = (t) => t.bulan >= EVAL.start && t.bulan <= EVAL.end
const evalTx = tx.filter(inEval)

// A. Jumlah baris per tab
section('A. Jumlah baris per tab')
check('Transaksi (data)', tabs.Transaksi.length - 1, 1135)
check('UMKM (data)', tabs.UMKM.length - 1, 70)
check('UMKM program TEI 2026', data.umkm.filter((u) => u.program.includes('TEI 2026')).length, 42)
check('UMKM program Pendampingan Ekspor 2026', data.umkm.filter((u) => u.program.includes('Pendampingan Ekspor 2026')).length, 40)
check('UMKM ikut kedua program', data.umkm.filter((u) => u.program.includes(';')).length, 12)
check('UMKM Ekspor tanpa transaksi', data.umkm.filter((u) => u.program === 'Pendampingan Ekspor 2026' && u.transaksi === 0).length, 28)
check('Mitra (data)', tabs.Mitra.length - 1, 6)
check('Kanal (data)', tabs.Kanal.length - 1, 26)
check('Katalog (data)', tabs.Katalog.length - 1, 525)
check('Penugasan (data)', tabs.Penugasan.length - 1, 42)
check('Klik_Link (data)', tabs.Klik_Link.length - 1, 30)
check('Target (data)', tabs.Target.length - 1, 42)
check('Ringkasan (data)', tabs.Ringkasan.length - 1, 4)

// B. Total (aplikasi vs hitung ulang vs harapan)
section('B. Total sejak Jul 2026 (aplikasi vs hitung ulang)')
const indTotal = {
  omzet: sum(tx.map((t) => t.omzet)), transaksi: sum(tx.map((t) => t.transaksi)),
  pesanan: sum(tx.map((t) => t.pesanan)), klik: sum(tx.map((t) => t.klik)),
  inquiry: sum(tx.map((t) => t.inquiry)),
}
check('Total Omzet (aplikasi)', app.totals.omzet, indTotal.omzet)
check('Total Omzet = 333.023.341', indTotal.omzet, 333023341)
check('Total Transaksi (aplikasi)', app.totals.transaksi, indTotal.transaksi)
check('Total Transaksi = 1.211', indTotal.transaksi, 1211)
check('Total Pesanan (aplikasi)', app.totals.pesanan, indTotal.pesanan)
check('Total Pesanan = 1.424', indTotal.pesanan, 1424)
check('Total Klik (aplikasi)', app.totals.klik, indTotal.klik)
check('Total Klik = 12.642', indTotal.klik, 12642)
check('Total Inquiry', indTotal.inquiry, 2136)
check('Klik_Link total = kolom klik Transaksi', sum(rowsToObjects(tabs.Klik_Link).map((r) => num(r.klik))), indTotal.klik)

// C. Omzet per bulan
section('C. Omzet per bulan')
for (const [bulan, harapan] of [['2026-07', 136761925], ['2026-08', 71616960], ['2026-09', 48450115], ['2026-10', 40474000], ['2026-11', 35720341]]) {
  check(`Omzet ${bulan}`, sum(tx.filter((t) => t.bulan === bulan).map((t) => t.omzet)), harapan)
}
check('Tren Okt–Nov (kumulatif)', app.trendPoints.map((p) => p.value).join(', '), '297303000, 333023341')

// D. Jendela evaluasi Okt–Nov
section('D. Realisasi Okt–Nov (aplikasi vs hitung ulang)')
const indEval = {
  omzet: sum(evalTx.map((t) => t.omzet)), transaksi: sum(evalTx.map((t) => t.transaksi)),
  inquiry: sum(evalTx.map((t) => t.inquiry)), klik: sum(evalTx.map((t) => t.klik)),
}
check('Omzet Okt–Nov', indEval.omzet, 76194341)
check('Transaksi Okt–Nov', indEval.transaksi, 401)
check('Inquiry Okt–Nov', indEval.inquiry, 734)
check('Klik Okt–Nov', indEval.klik, 4152)
const kanalPerUmkm = {}
evalTx.forEach((t) => { (kanalPerUmkm[t.idUmkm] ??= new Set()).add(t.idKanal) })
const kanalMean = Object.values(kanalPerUmkm).reduce((a, s) => a + s.size, 0) / Object.keys(kanalPerUmkm).length
check('Kanal aktif mean/UMKM', kanalMean, 2.98, 0.01)
const repMaster = sum(data.umkm.map((u) => u.repeatTransaksi ?? 0))
const trxMaster = sum(data.umkm.map((u) => u.transaksi))
const repeatEval = Math.round(repMaster * (indEval.transaksi / trxMaster))
check('Repeat Okt–Nov (diskalakan)', repeatEval, 115)
check('Konversi Okt–Nov', indEval.transaksi / indEval.klik * 100, 9.66, 0.05)

// E. Skor komponen + Skor Kinerja
section('E. Skor indikator (aplikasi vs rumus)')
const skor = (realisasi, target) => Math.min(100, Math.round((realisasi / target) * 100))
const indSkor = {
  katalog: skor(sum(data.umkm.map((u) => u.produkAktif ?? 0)), sum(data.targets.map((t) => t.targetProdukAktif))),
  kanal: skor(kanalMean, sum(data.targets.map((t) => t.targetKanalAktif)) / data.targets.length),
  inquiry: skor(indEval.inquiry, sum(data.targets.map((t) => t.targetInquiry))),
  transaksi: skor(indEval.transaksi, sum(data.targets.map((t) => t.targetTransaksi))),
  omzet: skor(indEval.omzet, sum(data.targets.map((t) => t.targetOmzet))),
  repeat: skor(repeatEval, sum(data.targets.map((t) => t.targetRepeat))),
  konversi: skor(indEval.transaksi / indEval.klik * 100, sum(data.targets.map((t) => t.targetKonversi)) / data.targets.length),
}
const appSkor = Object.fromEntries(app.indikator.map((i) => [i.id, i.skor]))
for (const [id, harapan] of [['katalog', 95], ['kanal', 100], ['inquiry', 83], ['transaksi', 83], ['omzet', 83], ['repeat', 82], ['konversi', 74]]) {
  check(`Skor ${id} (aplikasi)`, appSkor[id], indSkor[id])
  check(`Skor ${id} = ${harapan}`, indSkor[id], harapan)
}
const bobot = { katalog: 0.2, kanal: 0.15, inquiry: 0.15, transaksi: 0.2, omzet: 0.2, repeat: 0.1 }
const indTerbobot = Math.round(Object.entries(bobot).reduce((a, [k, w]) => a + w * indSkor[k], 0))
check('Skor Kinerja terbobot (aplikasi)', app.skorKinerja.skor, indTerbobot)
check('Skor Kinerja = 88 Sangat Baik', indTerbobot, 88)
check('Status Skor Kinerja', app.skorKinerja.status, 'Sangat Baik')
const pertumbuhan = (35720341 - 48450115) / 48450115 * 100
check('Pertumbuhan (Nov vs Sep)', pertumbuhan, -26.3, 0.1)
check('Pertumbuhan di indikator (aplikasi)', app.indikator.find((i) => i.id === 'pertumbuhan').delta * 100, pertumbuhan, 0.5)

// F. Delta KPI vs Ringkasan
section('F. Delta KPI vs periode sebelumnya')
check('Ringkasan omzet', data.previous.omzet, 254061327)
check('Ringkasan transaksi', data.previous.transaksi, 953)
check('Ringkasan pesanan', data.previous.pesanan, 1148)
check('Ringkasan klik', data.previous.klik, 10703)
const deltaVs = (current, totalAll, prevTotal) => current / (prevTotal * (current / totalAll)) - 1
for (const [id, harapan] of [['omzet', 0.311], ['transaksi', 0.271], ['pesanan', 0.24], ['klik', 0.181]]) {
  const kpi = app.kpis.find((k) => k.id === id)
  check(`Delta ${id} (aplikasi)`, kpi.delta, deltaVs(indTotal[id], indTotal[id], data.previous[id]), 0.002)
  check(`Delta ${id} ≈ ${Math.round(harapan * 100)}%`, kpi.delta, harapan, 0.01)
}

// G. Top 5 + Mitra
section('G. Top 5 UMKM + pangsa Mitra')
const top5 = [['PT Antara Vita Global', 13943377], ['Benita & Co | PT Benita Karya Kreasi', 13157896], ['Introvert Identity', 13099851], ['Chipsychips', 12913504], ['TEPA SELIRA', 12038871]]
top5.forEach(([nama, omzet], i) => {
  check(`Top ${i + 1} nama`, app.topUmkm[i].nama, nama)
  check(`Top ${i + 1} omzet`, app.topUmkm[i].omzet, omzet)
})
for (const [nama, omzet] of [['Tokopedia', 112258500], ['Shopee', 89614000], ['Mall Grand Indonesia', 68492341], ['Centong Daily', 20886167], ['Koperasi Kumindag', 20886167], ['Hippindo', 20886166]]) {
  check(`Mitra ${nama}`, app.mitra.find((m) => m.nama === nama)?.omzet, omzet)
}

// H. Dialog detail satu UMKM (Chipsychips) — aplikasi vs hitung ulang
section('H. Dialog detail Chipsychips (Okt–Nov)')
const detail = compute.computeUmkmDetail(data, FILTERS, 'Chipsychips')
const chipTx = evalTx.filter((t) => t.namaUmkm === 'Chipsychips')
const chipMaster = data.umkm.find((u) => u.namaUmkm === 'Chipsychips')
const chipTarget = data.targets.find((t) => t.namaUmkm === 'Chipsychips')
const chipEval = {
  omzet: sum(chipTx.map((t) => t.omzet)), transaksi: sum(chipTx.map((t) => t.transaksi)),
  inquiry: sum(chipTx.map((t) => t.inquiry)),
  kanal: new Set(chipTx.map((t) => t.idKanal || t.kanal)).size,
  repeat: Math.round(chipMaster.repeatTransaksi * (sum(chipTx.map((t) => t.transaksi)) / chipMaster.transaksi)),
}
const chipSkor = {
  omzet: skor(chipEval.omzet, chipTarget.targetOmzet),
  transaksi: skor(chipEval.transaksi, chipTarget.targetTransaksi),
  katalog: skor(chipMaster.produkAktif, chipTarget.targetProdukAktif),
  repeat: skor(chipEval.repeat, chipTarget.targetRepeat),
  inquiry: skor(chipEval.inquiry, chipTarget.targetInquiry),
  kanal: skor(chipEval.kanal, chipTarget.targetKanalAktif),
}
check('Dialog omzet jendela', detail.omzet, chipEval.omzet)
check('Dialog transaksi jendela', detail.transaksi, chipEval.transaksi)
for (const row of detail.skorRows) check(`Dialog skor ${row.id}`, row.skor, chipSkor[row.id])
const chipTerbobot = Math.round(Object.entries(bobot).reduce((a, [k, w]) => a + w * chipSkor[k], 0))
check('Dialog Skor Kinerja', detail.skorKinerja.skor, chipTerbobot)

// I. Mode Mingguan + integritas ID
section('I. Mode Mingguan + integritas ID')
const weekly = compute.computeWeeklyPoints(data, FILTERS)
check('Jumlah minggu Okt–Nov', weekly.length, 10)
check('Jumlah omzet mingguan = 76.194.341', sum(weekly.map((w) => w.omzet)), 76194341)
const umkmIds = new Set(data.umkm.map((u) => u.idUmkm))
const mitraIds = new Set(data.mitra.map((m) => m.idMitra))
const kanalIds = new Set(data.kanal.map((k) => k.idKanal))
check('Transaksi id_umkm tak dikenal', tx.filter((t) => t.idUmkm && !umkmIds.has(t.idUmkm)).length, 0)
check('Transaksi id_mitra tak dikenal', tx.filter((t) => t.idMitra && !mitraIds.has(t.idMitra)).length, 0)
check('Transaksi id_kanal tak dikenal', tx.filter((t) => t.idKanal && !kanalIds.has(t.idKanal)).length, 0)
check('Katalog id_umkm tak dikenal', data.katalog.filter((p) => p.idUmkm && !umkmIds.has(p.idUmkm)).length, 0)
check('Baris inquiry < pesanan', tx.filter((t) => t.inquiry < t.pesanan).length, 0)
check('Tab Target terbaca (targetsError null)', data.targetsError, null)
check('Jumlah target', data.targets.length, 42)

console.log(`\n${passed} lolos, ${failed} gagal.`)
if (failed > 0) { console.log('ADA RUMUS/DATA YANG TIDAK COCOK — lihat baris FAIL di atas.'); process.exit(1) }
console.log('Semua rumus cocok dengan Sheet live.')
