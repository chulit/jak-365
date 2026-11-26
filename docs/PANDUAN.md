# Panduan Membaca Dashboard Monev UMKM

Dashboard **Monitoring & Evaluasi UMKM** (Step 6 dari 7 alur Jakpreneur 365)
di https://chulit.github.io/jak-365/ — memantau 70 UMKM (42 peserta
Trade Expo Indonesia (TEI) 2026 dan 28 peserta Pendampingan Ekspor 2026;
12 ikut keduanya) dan 6 mitra pemasarannya.

Dokumen ini menjelaskan cara membaca setiap angka di dashboard dan dari
mana angka itu berasal. Semua angka di sini merujuk pada data yang sedang
live saat dokumen ini ditulis (2026-11-26).

## Daftar Isi

- [1. Dari mana datanya](#1-dari-mana-datanya)
- [2. Filter (baris paling atas)](#2-filter-baris-paling-atas)
- [3. Kartu KPI (6 kartu di bawah filter)](#3-kartu-kpi-6-kartu-di-bawah-filter)
- [4. Tren Omzet (grafik garis + batang)](#4-tren-omzet-grafik-garis--batang)
- [5. Pangsa Mitra (donut)](#5-pangsa-mitra-donut)
- [6. Capaian Indikator UMKM + Skor Kinerja](#6-capaian-indikator-umkm--skor-kinerja)
- [7. Top 5 UMKM (tabel kanan bawah)](#7-top-5-umkm-tabel-kanan-bawah)
- [8. Hal yang perlu dipahami dengan jujur](#8-hal-yang-perlu-dipahami-dengan-jujur)
- [9. Cara memperbarui data](#9-cara-memperbarui-data)
- [10. Cara mengetes rumus (dari dashboard saja)](#10-cara-mengetes-rumus-dari-dashboard-saja)

---

## 1. Dari mana datanya

Satu-satunya sumber data adalah Google Sheet
**"Monev UMKM - Monitoring & Evaluasi"**
(ID `1v8velGd7wZflo82bX0oB7fcisckQve67n6jppNBdSmg`).
Dashboard membaca Sheet itu secara langsung setiap kali halaman dibuka
(lewat alamat publik gviz CSV) — **tidak ada data contoh yang tersimpan
di dalam aplikasi**. Kalau Sheet gagal dimuat, dashboard menampilkan
banner merah "Gagal memuat Google Sheet" dan angka menjadi "—".
Saat memuat, yang tampil adalah skeleton (bayangan layout), bukan angka.

Sheet itu punya 9 tab. Masing-masing tab dan kegunaannya:

| Tab | Isi | Dipakai untuk |
|---|---|---|
| `UMKM` | 70 UMKM (42 peserta TEI 2026 + 28 peserta Pendampingan Ekspor 2026, 12 ikut keduanya): nama, pemilik, sektor, wilayah, izin usaha, Instagram/website, penjelasan produk, program, nama perusahaan | Master UMKM, profil usaha di dialog detail, Total Produk, Repeat Order |
| `Mitra` | 6 mitra pemasaran: nama, jenis, kanal, status | Donut pangsa mitra, filter Mitra |
| `Kanal` | 26 kanal pemasaran referensi (Instagram, Tokopedia, WhatsApp Business, dst.) | Kanal Aktif per UMKM |
| `Katalog` | 525 produk dari penjelasan TEI tiap UMKM (497 Tayang, 26 Menunggu, 2 Tidak Disetujui) | Produktivitas Katalog |
| `Penugasan` | 42 baris: 1 mitra utama per UMKM, periode 01 Okt–31 Des 2026 | Penugasan mitra ke UMKM |
| `Transaksi` | 1.135 baris agregat bulanan per (UMKM, mitra): pesanan, transaksi, omzet, klik, jumlah inquiry | Hampir semua angka: KPI, tren, Top UMKM, skor |
| `Klik_Link` | Klik link per mitra per bulan | Total Klik Link |
| `Target` | Target per UMKM: omzet, transaksi, produk aktif, repeat, inquiry, kanal aktif | Semua skor (realisasi dibanding target) |
| `Ringkasan` | Total periode SEBELUMNYA (5 bulan): omzet, transaksi, pesanan, klik | Angka % hijau/merah di kartu KPI (delta) |

**Catatan penting:** tab `Transaksi` berisi agregat bulanan, bukan
transaksi per pesanan. Karena itu "Produk Terlaris per produk" **tidak
bisa dihitung** dari data ini — yang bisa dihitung adalah Inquiry,
Kanal Aktif, dan skor terbobot.

### Angka-angka pokok (tidak berubah sejak Jul 2026)

| Angka | Nilai |
|---|---|
| Total Omzet (Jul–Nov) | Rp 333.023.341 |
| Total Transaksi | 1.211 |
| Total Pesanan | 1.424 |
| Total Klik Link | 12.642 |
| Total Inquiry | 2.136 (Okt–Nov: 734) |
| Total Produk / Produk Aktif | 525 / 497 |
| Repeat Order | 346 (28,6%) |

Omzet per bulan: Jul Rp 136.761.925 · Agu Rp 71.616.960 ·
Sep Rp 48.450.115 · Okt Rp 40.474.000 · Nov Rp 35.720.341.

---

## 2. Filter (baris paling atas)

Empat pilihan di atas dashboard. Setiap perubahan langsung menghitung
ulang semua angka di bawahnya.

| Filter | Pilihan | Pengaruh |
|---|---|---|
| **Periode** | Jendela bulan, mis. Okt–Nov 2026 (bawaan) | Menentukan bulan akhir perhitungan dan bulan apa saja yang tampil di grafik Tren |
| **Mitra Pemasaran** | Semua Mitra / salah satu dari 6 mitra | Semua angka hanya dari mitra itu |
| **Kategori Produk** | Semua Kategori / F&B, Fesyen, Craft, Kopi, dst. | Semua angka hanya dari kategori itu |
| **Wilayah** | Semua Wilayah / wilayah UMKM | Semua angka hanya dari wilayah itu |

---

## 3. Kartu KPI (6 kartu di bawah filter)

| Kartu | Artinya | Nilai bawaan (Okt–Nov) |
|---|---|---|
| **UMKM Aktif** | UMKM yang punya transaksi sampai akhir periode terpilih | 42 |
| **Total Produk** | Jumlah produk di Katalog (dari master UMKM, tidak ikut periode) | 525 |
| **Total Klik Link** | Klik link sampai akhir periode terpilih | 12.642 |
| **Total Pesanan** | Pesanan sampai akhir periode terpilih | 1.424 |
| **Total Transaksi** | Transaksi sampai akhir periode terpilih | 1.211 |
| **Total Omzet** | Omzet sampai akhir periode terpilih | Rp 333.023.341 |

**Baca dengan hati-hati — angka KPI itu berjalan sejak Jul 2026.**
"Total Omzet" di periode Okt–Nov menunjukkan Rp 333.023.341, yaitu
total sejak Jul sampai akhir Nov. Omzet yang khusus terjadi di Okt–Nov
saja adalah Rp 76.194.341 — angka itu ada di bagian Capaian Indikator
("Omzet (Periode Evaluasi)"). Prinsip yang sama berlaku untuk Klik,
Pesanan, dan Transaksi. Titik terakhir grafik Tren selalu sama dengan
Total Omzet.

**Angka % kecil di bawah 4 kartu terakhir (delta)** membandingkan
angka terpilih dengan periode sebelumnya (tab `Ringkasan`).
Bawaan: Omzet +31% · Transaksi +27% · Pesanan +24% · Klik +18%.
Kalau filter Mitra/Kategori/Wilayah aktif, delta diskalakan secara
proporsional dengan pangsa filter itu.

---

## 4. Tren Omzet (grafik garis + batang)

- **Mode Bulanan (bawaan):** garis nilai berjalan per bulan sejak Jul,
  tapi hanya bulan di dalam periode terpilih yang ditampilkan.
  Mis. Okt–Nov → 2 titik: Okt Rp 297.303.000, Nov Rp 333.023.341.
- **Mode Mingguan** (tombol Bulanan/Mingguan): omzet per minggu di
  dalam periode terpilih. Okt–Nov = 10 minggu yang totalnya
  Rp 76.194.341 (inilah omzet khusus jendela Okt–Nov).
- Batang di grafik yang sama menunjukkan jumlah transaksi.

## 5. Pangsa Mitra (donut)

Pembagian omzet antar 6 mitra (sampai akhir periode terpilih):

| Mitra | Omzet | Pangsa |
|---|---|---|
| Tokopedia | Rp 112.258.500 | 33,7% |
| Shopee | Rp 89.614.000 | 26,9% |
| Mall Grand Indonesia | Rp 68.492.341 | 20,6% |
| Centong Daily | Rp 20.886.167 | 6,3% |
| Koperasi Kumindag | Rp 20.886.167 | 6,3% |
| Hippindo | Rp 20.886.166 | 6,3% |

## 6. Capaian Indikator UMKM + Skor Kinerja

Bagian ini menilai kinerja dengan **skor 0–100 per indikator**:

> **Skor = min(100, Realisasi / Target × 100)**
> Targetnya individual per UMKM, dari tab `Target`.

Delapan indikator (nilai agregat saat ini):

| Indikator | Realisasi (Okt–Nov) | Target | Skor | Bobot |
|---|---|---|---|---|
| Produktivitas Katalog (Produk Aktif) | 497 / 525 produk | 525 | 95 | 20% |
| Kanal Aktif (Kanal Pemasaran) | 2,98 kanal/UMKM | 2,52 | 100 | 15% |
| Inquiry (Permintaan Masuk) | 734 | 881 | 83 | 15% |
| Transaksi (Periode Evaluasi) | 401 | 481 | 83 | 20% |
| Omzet (Periode Evaluasi) | Rp 76.194.341 | Rp 91.800.982 | 83 | 20% |
| Konversi (Klik → Transaksi) | 9,7% (401/4.152) | 13,0% | 74 | — |
| Repeat Order | 115 | 140 | 82 | 10% |
| Pertumbuhan Omzet | −26% (Nov vs Sep) | — | — | — |

**Dua hal yang tidak ikut filter periode:**

1. **Jendela evaluasi tetap Okt–Nov.** Semua skor di atas dihitung
   pada Okt–Nov, apa pun periode yang dipilih di filter. Alasannya:
   target di tab `Target` ditetapkan untuk periode itu.
   (Pengecualian: Katalog memakai total master, dan Pertumbuhan
   memakai Sep sebagai T0.)
2. **Pertumbuhan = (Nov − Sep) / Sep × 100%.** Sep adalah baseline
   (T0) dari data: (35.720.341 − 48.450.115) / 48.450.115 = **−26%**.
   Angka negatif ini jujur — omzet Nov memang lebih kecil dari Sep.

**Skor Kinerja** adalah rata-rata terbobot keenam indikator berbobot
(Katalog 20% + Kanal 15% + Inquiry 15% + Transaksi 20% + Omzet 20% +
Repeat 10%):

> **88 — "Sangat Baik"**

Status: ≥85 Sangat Baik · ≥70 Baik · ≥55 Cukup · di bawah itu Kurang.
Konversi dan Pertumbuhan tidak masuk ke Skor Kinerja — Konversi hanya
indikator pendukung, Pertumbuhan tidak punya target.
Kalau satu saja dari keenam komponen tidak punya skor (mis. tab Target
gagal dibaca), Skor Kinerja menampilkan "—", bukan skor parsial.

## 7. Top 5 UMKM (tabel kanan bawah)

Lima UMKM dengan omzet tertinggi (sampai akhir periode terpilih):

| # | UMKM | Omzet |
|---|---|---|
| 1 | PT Antara Vita Global | Rp 13.943.377 |
| 2 | Benita & Co \| PT Benita Karya Kreasi | Rp 13.157.896 |
| 3 | Introvert Identity | Rp 13.099.851 |
| 4 | Chipsychips | Rp 12.913.504 |
| 5 | TEPA SELIRA | Rp 12.038.871 |

Tombol **"Lihat Semua"** menampilkan ke-42 UMKM. Klik salah satu
baris membuka **dialog detail** UMKM itu:

- **Profil Usaha** — pemilik, program yang diikuti, perusahaan (bila
  diketahui), izin usaha, Instagram/website, dan penjelasan produk
  (dari master UMKM). Catatan: 28 peserta Pendampingan Ekspor yang
  belum punya transaksi tidak muncul di daftar ini — mereka hanya ada
  di tab UMKM di Sheet.
- **Skor Capaian (vs Target)** — 6 skor indikator UMKM itu beserta
  realisasi vs targetnya, dan Skor Kinerja UMKM itu.
- **Grafik + tabel bulanan/mingguan** — mengikuti filter periode dan
  tombol Bulanan/Mingguan yang aktif. Peringkat di dialog adalah
  peringkat di dalam jendela periode terpilih (bisa berbeda dari Top 5).
- Tombol **‹ ›** untuk pindah ke UMKM sebelum/sesudahnya.

---

## 8. Hal yang perlu dipahami dengan jujur

1. **Tidak semua angka adalah hasil ukur lapangan.**
   `jumlah_produk` / `produk_aktif` (525/497), `repeat_transaksi`
   (346), `jumlah_inquiry` (2.136), dan semua target adalah **angka
   contoh deterministik** — dibuat dengan rumus yang bisa diulang dari
   generator data, bukan dicatat dari lapangan. Yang murni dari
   pencatatan adalah omzet, transaksi, pesanan, dan klik per UMKM
   per bulan.
2. **Nama produk di Katalog diturunkan dari penjelasan TEI**
   masing-masing UMKM. Kalau deskripsinya tidak menyebut produk
   spesifik, namanya generik dari kategori — bisa dikoreksi langsung
   di tab `Katalog` Sheet.
3. **KPI bersifat berjalan sejak Jul**, bukan hanya jendela periode
   (lihat bagian 3). Satu-satunya angka yang murni jendela Okt–Nov
   adalah baris "Periode Evaluasi" di bagian indikator dan mode
   Mingguan di grafik Tren.
4. **Skor tidak mengikuti filter periode** (lihat bagian 6).
5. **Tidak ada data contoh cadangan.** Kalau Sheet tidak bisa dibaca,
   dashboard tidak menampilkan angka pengganti — hanya banner merah
   dan "—".

## 9. Cara memperbarui data

- **Ubah angka:** edit langsung tab yang bersangkutan di Google Sheet,
  lalu muat ulang halaman dashboard. Tidak perlu deploy ulang.
- **Regenerasi data dari generator:** dikerjakan dari komputer
  pengembang — caranya ada di `sheets-template/README.md`.
- **Alur lengkap 7 langkah** (Master Mitra → Evaluasi) terdokumentasi
  di `docs/ALUR.md`.

## 10. Cara mengetes rumus (dari dashboard saja)

Dashboard ini sengaja punya angka yang saling mengunci — satu angka
bisa dicek dari angka lain di layar yang sama, tanpa membuka Sheet
atau menjalankan apa pun.

1. **KPI vs grafik Tren.** Total Omzet 333.023.341 harus sama persis
   dengan titik terakhir grafik (Nov). Begitu juga Transaksi 1.211,
   Pesanan 1.424, Klik 12.642. Kalau ada yang beda, ada yang salah
   hitung.
2. **Donut mitra.** Jumlahkan keenam mitra — harus 333.023.341.
   Persennya juga bisa dicek: Tokopedia 112.258.500 / 333.023.341
   = 33,7%.
3. **Skor Kinerja 88.** Hitung dari keenam skor di bawahnya:
   95×20% + 100×15% + 83×15% + 83×20% + 83×20% + 82×10% = 88.
   Kalau satu skor berubah, totalnya harus ikut berubah.
4. **Konversi.** 1.211 / 12.642 = 9,6% (angka ini ada di indikator),
   skornya 74 = 9,6 / 13,0 × 100.
5. **Dialog UMKM.** Buka Chipsychips — tiap baris skor menampilkan
   realisasi dan targetnya, jadi tinggal hitung pakai kalkulator:
   realisasi / target × 100, maksimal 100. Skor Kinerja di dialog
   adalah rata-rata terbobot keenam baris tersebut.
6. **Mode Mingguan.** Jumlahkan 10 batang minggu — harus 76.194.341,
   sama dengan "Omzet (Periode Evaluasi)" di bagian indikator.
7. **Filter.** Ganti periode ke Agu–Sep, Omzet harus jadi
   256.829.000. Pilih Mitra Tokopedia, harus 86.471.918. Kalau
   angkanya tidak berubah, filternya yang mati.

Catatan jujur: yang tidak bisa dicek dari dashboard saja adalah
target per UMKM (hanya ada di tab Target Sheet) dan angka periode
sebelumnya untuk delta +31% dan kawan-kawan (hanya ada di tab
Ringkasan). Dua itu tetap harus dilihat di Sheet.

---

*Terakhir diperbarui: 2026-11-25. Dashboard: https://chulit.github.io/jak-365/*
