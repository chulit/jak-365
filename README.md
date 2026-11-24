# Dashboard Monitoring & Evaluasi UMKM

Dashboard Admin Pemasaran untuk memantau perkembangan pemasaran, kinerja UMKM,
dan efektivitas mitra pemasaran. Replika layout referensi (Step 6 dari 7),
dengan data yang dihitung dari spreadsheet — bukan angka hardcode.

**Stack:** Vue 3 + Vite + Tailwind CSS 3.4 + shadcn-vue (komponen gaya shadcn,
`radix-vue` untuk Select) + `lucide-vue-next` + Apache ECharts (`vue-echarts`).

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # vue-tsc + vite build -> dist/
npm run preview  # sajikan hasil build
```

## Menghubungkan Google Sheet (data asli)

1. Buat Google Sheet baru dengan **3 tab** bernama persis: `Transaksi`,
   `UMKM`, `Klik_Link`. Isi tiap tab dari CSV di `sheets-template/`
   (File → Impor). Struktur kolom lengkap ada di
   `sheets-template/README.md`. Opsional: tab ke-4 `Ringkasan`
   (`metrik, nilai`) berisi total periode sebelumnya untuk badge delta KPI.
2. Bagikan Sheet: **Siapa saja yang memiliki link dapat melihat**
   (tanpa ini dashboard tidak bisa membaca datanya).
3. Salin ID dari URL Sheet: `https://docs.google.com/spreadsheets/d/<ID>/edit`
4. Tempel ID itu di kolom **ID Google Sheet** pada dashboard lalu klik
   **Muat** — tanpa rebuild. Atau isi `VITE_SHEET_ID` di `.env`
   (lihat `.env.example`); ID juga tersimpan di `localStorage` browser.

Tanpa ID Sheet, dashboard memakai **data contoh** di `src/data/sample.ts`
(angka persis screenshot). Bila Sheet gagal dibaca, dashboard menampilkan
pesan error dan tetap memakai data contoh.

> Cara kerja koneksi: `src/lib/sheets.ts` mengambil tiap tab lewat endpoint
> gviz CSV (`.../gviz/tq?tqx=out:csv&sheet=<Tab>`) — tanpa API key dan
> tanpa backend. Tab `Klik_Link` hanya dipakai sebagai cek silang terhadap
> kolom `klik` di tab `Transaksi`.

## Detail penjualan per UMKM (klik baris)

Klik baris mana pun di tabel **Top 5 UMKM** — atau di daftar **Lihat Semua**
(semua 42 UMKM, bisa dicari berdasarkan nama/kategori/wilayah dan diurutkan
berdasarkan omzet atau nama) — untuk membuka panel detail UMKM tersebut:

- Nama, kategori, wilayah, dan mitra pemasaran (badge), peringkat omzet,
  total omzet, total transaksi, total pesanan, rata-rata omzet per transaksi,
  dan pangsa terhadap total omzet.
- **Profil usaha (data master TEI 2026)**: pemilik, izin usaha,
  Instagram/website (tautan yang bisa diklik; kalau isinya bukan alamat
  web — mis. "Machili Food" — tampil sebagai teks), dan penjelasan produk.
  Nomor WhatsApp PIC sengaja **tidak** ditampilkan karena berisi nomor
  pribadi dan Sheet bersifat publik.
- **Mengikuti filter yang aktif**: semua angka di panel ini dihitung dari
  transaksi dalam **jendela periode terpilih saja** (mis. Okt–Nov 2026 →
  Chipsychips: omzet Rp 3.102.904, 12 transaksi, 13 pesanan — bukan
  total Jul–Nov Rp 12.913.504 / 35 transaksi). Filter Mitra/Kategori/
  Wilayah yang sama seperti dashboard juga dipakai; peringkat dan pangsa
  dihitung terhadap total jendela yang sama. Perhatian: angka panel ini
  memang berbeda dari tabel Top UMKM dan KPI — tabel/KPI dihitung sejak
  Jul 2026 sampai akhir periode, sedangkan panel detail hanya jendela
  periode terpilih. Kalau UMKM tidak punya transaksi dalam periode/filter
  yang dipilih, panel menampilkan pesan sopan (bukan angka 0).
- **Grafik penjualan — Bulanan atau Mingguan**, mengikuti toggle
  Bulanan/Mingguan grafik utama (state toggle yang sama): garis omzet
  (Rp, sumbu kiri) + batang transaksi (sumbu kanan), tooltip format
  Rupiah. Bulanan: satu titik per bulan dalam periode. Mingguan: omzet
  per minggu dengan label rentang tanggal ("6–12 Okt", "26 Okt–1 Nov"),
  minggu sebagian di ujung periode ikut dihitung.
- **Grafik per mitra pemasaran**: batang horizontal omzet per mitra yang
  ada datanya untuk UMKM itu — juga hanya dari transaksi dalam jendela
  periode terpilih.
- **Tabel rincian** (per bulan atau per minggu, mengikuti toggle):
  Bulan/Minggu | Omzet | Transaksi | Pesanan — angkanya sama dengan
  grafik, karena keduanya dihitung dari transaksi mentah yang sama
  (`computeUmkmDetail()` di `src/lib/compute.ts`, bukan hardcode).
- Tombol **‹ Sebelumnya / Berikutnya ›** di bawah panel (atau tombol panah
  kiri/kanan di keyboard) berpindah ke UMKM sebelum/sesudahnya dalam urutan
  omzet. Tutup panel dengan tombol X, klik di luar panel, atau tombol Esc.
  Di HP panel tampil penuh layar seperti bottom sheet.

## Master UMKM = 42 peserta TEI 2026

Tab **`UMKM`** berisi 42 peserta Trade Expo Indonesia 2026 (14–18 Oktober
2026, ICE BSD) dari DPPKUKM — bukan lagi nama-nama dummy lama (My Little
Dimsum, Burich, dkk.). Kolomnya: `nama_umkm, kategori, wilayah,
jumlah_produk, produk_aktif, transaksi, pesanan, omzet, repeat_transaksi,
nama_pemilik, izin_usaha, instagram_website, penjelasan_produk`
(file sumber daftar peserta: `sheets-template/UMKM_TEI.csv` — dipakai
generator sebagai input master; tab `UMKM_TEI` yang dulu terpisah sudah
dihapus karena isinya kini tercakup di tab `UMKM`).

- Per sektor: Food & Beverage 19, Fesyen 7, Craft 5, Kopi 3, Fragrance 3,
  Personal Care 2, Home Decor 1, Healthy Beverage 1, Beauty 1.
- **Transaksi contoh dipetakan ulang ke 42 nama ini** dengan total yang
  persis sama (Omzet Rp 333.023.341, Transaksi 1.211, Pesanan 1.424,
  Klik 12.642) — ini data contoh yang dipetakan ulang, bukan data
  penjualan asli peserta TEI.
- Kolom `jumlah_produk`, `produk_aktif`, dan `repeat_transaksi` sengaja
  **kosong** — data TEI tidak punya angka itu. Akibatnya KPI Total Produk
  dan indikator "Produktivitas Katalog" serta "Repeat Order" menampilkan
  "—" (bukan 0) sampai datanya ada. Kolom `transaksi`/`pesanan`/`omzet`
  per UMKM = total Jul–Nov 2026 dari tab Transaksi.
- Tidak ada kolom mitra di tab ini — mitra utama tiap UMKM diturunkan
  dari transaksi (mitra dengan omzet terbesar), dan opsi filter Mitra
  diambil dari gabungan transaksi + master.

## Cara hitung angka (penting)

Angka dihitung sejak Jul 2026 sampai akhir periode terpilih —
mengikuti cara hitung pada dashboard referensi. Itulah kenapa periode
"Okt – Nov 2026" menampilkan total Rp 333.023.341, bukan hanya
omzet Okt+Nov (Rp 76.194.341). Semua KPI, grafik, dan tabel dihitung ulang
oleh `src/lib/compute.ts` setiap kali filter berubah:

- **Periode** — jendela bulan (awal–akhir), mis. Okt–Nov 2026 atau
  Jul–Nov 2026; bulan akhir jendela adalah batas akhir semua angka
- **Mitra / Kategori / Wilayah** — memfilter transaksi & master UMKM
- **Delta KPI** (+18%/+24%/+27%/+31%) — vs total periode sebelumnya
  (tab `Ringkasan`); saat filter aktif, baseline diskalakan proporsional
  dengan pangsa filter (asumsi pertumbuhan merata antar segmen)
- **Tren Omzet** — garis per bulan, HANYA bulan dalam periode terpilih
  (Okt–Nov → 2 titik, Jul–Nov → 5 titik, Jul saja → 1 titik); nilainya
  dihitung sejak Jul 2026, jadi titik terakhir selalu sama dengan
  Total Omzet di KPI. Kalau periode tidak punya data, grafik menampilkan
  pesan kosong, bukan grafik kosong.

### Toggle Bulanan / Mingguan (grafik Tren Omzet)

Segmented control **Bulanan | Mingguan** di atas grafik (default Bulanan):

- **Bulanan** — seperti di atas: satu titik per bulan dalam periode
  terpilih, nilainya dihitung sejak Jul 2026 sampai bulan itu.
- **Mingguan** — satu titik per minggu ISO (Senin–Minggu) dalam periode
  terpilih, nilainya omzet **per minggu itu saja (bukan berjalan)**.
  Label sumbu-X berupa rentang tanggal, mis. "6–12 Okt" atau
  "26 Okt–1 Nov"; minggu yang terpotong awal/akhir periode tetap
  tampil dengan rentang sebenarnya di dalam periode. Tooltip
  menampilkan rentang minggu, omzet, transaksi, dan pesanan minggu itu.
  Okt–Nov 2026 → 10 titik minggu (jumlah omzetnya = omzet Okt+Nov,
  Rp 76.194.341). Toggle ini mengubah grafik Tren Omzet **dan** panel
  detail UMKM (keduanya memakai state toggle yang sama): di panel detail,
  Bulanan menampilkan rincian per bulan dalam periode, Mingguan
  menampilkan rincian per minggu dalam periode. KPI, donut Mitra,
  Indikator, dan Top 5 tidak berubah.

  Prasyarat: kolom `tanggal` di Sheet harus tanggal asli transaksi.
  Data contoh sudah disebar per minggu oleh generator
  (`scripts/generate-sheet-data.mjs` memecah tiap agregat UMKM × bulan
  menjadi segmen minggu ISO, dijumlahkan persis sama dengan agregat
  bulanannya) — jadi tanggal dummy tidak lagi semuanya tanggal 15.
- **Repeat Order** — menampilkan "—" karena master TEI tidak punya data
  repeat (kolom `repeat_transaksi` kosong); begitu juga "Produktivitas
  Katalog" dan KPI Total Produk ("—" bila tidak ada data produk)

## Struktur proyek

```
src/
  App.vue                  # Layout + state filter + konektor Sheet
  main.ts                  # Entry point
  index.css                # Tailwind + token warna shadcn (tema terang)
  data/
    sample.ts              # Data contoh (digenerate, jangan edit manual)
  lib/
    types.ts               # Transaction, UmkmMaster, DashboardData
    compute.ts             # Semua KPI/indikator dihitung dari data mentah
    sheets.ts              # loadFromGoogleSheet() + parser CSV
    format.ts              # formatRupiah / formatNumber id-ID
    echarts.ts             # Registrasi ECharts + VChart
    utils.ts               # cn() ala shadcn
  components/
    AppHeader.vue          # Judul + toggle tema gelap/terang
    FilterBar.vue          # Periode, Mitra, Kategori, Wilayah
    SheetConnector.vue     # Input ID Google Sheet + status
    KpiCard.vue            # 6 kartu KPI + badge delta
    OmzetChart.vue         # Line/area + toggle Bulanan/Mingguan (ECharts)
    MitraDonut.vue         # Donut + tabel kinerja mitra
    IndikatorUMKM.vue      # Progress indikator UMKM
    TopUmkmTable.vue       # Tabel Top UMKM (baris bisa diklik) + Lihat Semua
    UmkmDetailDialog.vue   # Panel detail UMKM: profil TEI + grafik bulanan/mingguan + per mitra
    AllUmkmDialog.vue      # Daftar semua UMKM: cari + urutkan, baris bisa diklik
    ui/                    # Button, Card, Badge, Input, Progress,
                           # Select (radix-vue), Table — gaya shadcn-vue
scripts/
  generate-sheet-data.mjs  # Generator data contoh + CSV (tanpa dependensi)
sheets-template/
  Transaksi.csv            # 1.135 baris (42 UMKM x 5 bulan, dipecah per minggu ISO + 1 transaksi tes)
  UMKM.csv                 # 42 baris master UMKM (peserta TEI 2026)
  UMKM_TEI.csv             # 42 baris daftar peserta TEI — input master generator (bukan tab Sheet)
  Klik_Link.csv            # 20 baris (5 bulan x 4 mitra)
  README.md                # Struktur tab + hasil verifikasi total
```

## Data contoh & verifikasi

`scripts/generate-sheet-data.mjs` adalah satu-satunya sumber kebenaran data
contoh: ia menulis ketiga CSV **dan** `src/data/sample.ts` dari dataset yang
sama, lalu meng-assert semua total. Regenerasi:

```bash
node scripts/generate-sheet-data.mjs
```

Hasil verifikasi (dihitung ulang dari CSV yang ditulis, bukan dari memori):

| Ukuran | Hasil |
|---|---|
| Total omzet | Rp 333.023.341 |
| Total transaksi / pesanan / klik | 1.211 / 1.424 / 12.642 |
| UMKM aktif | 42 (peserta TEI 2026) |
| Total Produk / Repeat order | — (master TEI tidak punya data produk/repeat) |
| Konversi | 1.211 / 12.642 = 9,6% |
| Omzet bulanan | Jul 136.761.925, Agu 71.616.960, Sep 48.450.115, Okt 40.474.000, Nov 35.720.341 |
| Total s.d. akhir bulan | Jul 136.761.925, Agu 208.378.885, Sep 256.829.000, Okt 297.303.000, Nov 333.023.341 |
| Mitra | Tokopedia 112.258.500 (33,7%) / Shopee 89.614.000 (26,9%) / Mall Grand Indonesia 68.492.341 (20,6%) / Centong Daily 20.886.167 (6,3%) / Koperasi Kumindag 20.886.167 (6,3%) / Hippindo 20.886.166 (6,3%) |
| Top 5 | PT Antara Vita Global 13.943.377, Benita & Co 13.157.896, Introvert Identity 13.099.851, Chipsychips 12.913.504, TEPA SELIRA 12.038.871 |

### Menambah 1 transaksi (contoh: Chipsychips, 2026-11-17)

Transaksi tes yang ditambahkan 2026-11-17 (nilai tes): tanggal
2026-11-17, bulan 2026-11, Chipsychips, Food & Beverage, Jakarta Selatan,
Tokopedia, pesanan 1, transaksi 1, omzet Rp 200.000, klik 12.
Angka itu harus konsisten di **tiga tempat** — kalau hanya satu yang
diubah, total dashboard dan Sheet akan berbeda:

1. **Data contoh (lokal):** ubah nilai `EXTRA_TRANSACTION` di
   `scripts/generate-sheet-data.mjs`, lalu jalankan
   `node scripts/generate-sheet-data.mjs` — ini menulis ulang
   `sheets-template/Transaksi.csv` (baris baru di akhir),
   `sheets-template/UMKM.csv` (baris UMKM itu naik), `Klik_Link.csv`,
   dan `src/data/sample.ts` sekaligus. Jangan edit `sample.ts` manual.
2. **Google Sheet:** tambahkan 1 baris yang sama di akhir tab
   `Transaksi`, naikkan `transaksi`/`pesanan`/`omzet` di baris UMKM itu
   di tab `UMKM`, dan naikkan `klik` di baris (bulan, mitra) yang sama
   di tab `Klik_Link` (untuk transaksi ini: Nov Tokopedia 656 → 668).
3. **Cek ulang:** jumlahkan kolom `omzet`/`transaksi`/`pesanan`/`klik`
   di tab Transaksi — harus sama dengan total di tabel verifikasi di
   atas. Kalau edit langsung di Sheet, dashboard (yang membaca Sheet)
   ikut berubah tanpa rebuild; kalau edit data contoh, jalankan
   `npm run build` ulang.

## Toggle tema gelap / terang

Tombol di kanan atas header (ikon Bulan saat mode terang, Matahari saat
mode gelap, `aria-label` "Ganti tema") mengganti seluruh dashboard:
kartu, teks, border, filter/select, tabel, dialog, progress bar, badge,
dan grafik ECharts (garis, grid, label, tooltip, donut) — semuanya
punya varian `dark:` dan token shadcn gelap di `src/index.css`
(`.dark`).

Cara kerja penyimpanan (`src/lib/theme.ts`):

- Pilihan disimpan di `localStorage` dengan key `monev-theme`
  (`"light"` / `"dark"`) dan diterapkan sebagai class `dark` di `<html>`
  (Tailwind `darkMode: 'class'`).
- Saat pertama kali dibuka dan belum ada pilihan tersimpan, tema
  mengikuti preferensi sistem (`prefers-color-scheme`).
- Script inline kecil di `index.html` menerapkan tema sebelum halaman
  dirender, supaya tidak ada flash tema yang salah saat load; `main.ts`
  memanggil `initTheme()` sebelum aplikasi dipasang.

## Design system

Mengikuti screenshot (tema terang, **bukan** dark glassmorphism):
background `#F8FAFC`, kartu putih `rounded-2xl` border `slate-200`
`shadow-sm`, teks `slate-900`/`slate-500`, primary biru `#2563EB`,
sukses emerald `#16A34A`, font Inter, radius 12–16px, ikon Lucide SVG
(tanpa emoji). Mode gelap memakai palet yang sama arahnya: background
`slate-950`, kartu `slate-900`, teks `slate-100`/`slate-400`, border
`slate-700/800`, primary biru tetap terlihat. Grid: 6 KPI → 2 kolom
grafik → indikator + Top UMKM; di 768px dan 375px layout menumpuk
tanpa horizontal scroll.
