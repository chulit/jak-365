# Alur Jakpreneur 365 — dipelajari dari Mockup_J365_4_v26x.docx

Dokumen mockup berisi 7 langkah (Step 1–7). Fokus pengerjaan: **dashboard (Step 6) saja**;
modul lain dipelajari hanya untuk memahami alur/data yang masuk ke dashboard.

## 7 langkah

1. **Master Data Mitra Pemasaran** — 24 mitra (ID `MTR-001` dst). Field: nama, jenis
   (Content Creator, Influencer/KOL, Afiliator, Reseller, Distributor, Retail /
   Modern Trade, Mitra B2B, Lainnya), PIC, kontak, email, kategori produk (multi),
   wilayah, kanal pemasaran (multi, dari 26 kanal referensi), status Aktif/Tidak Aktif,
   dokumen kerja sama, catatan.
2. **Penetapan UMKM Peserta** — 128 peserta di mockup (di dashboard kita: 42 peserta
   TEI 2026). Tiap peserta punya kode (mis. `JP-03124567`) dan Grade (mis. A).
3. **Penugasan Mitra ke UMKM** — 196 penugasan. Satu UMKM bisa ditugaskan ke LEBIH
   DARI SATU mitra. Tiap penugasan: UMKM + mitra (multi) + kanal (mengikuti data
   mitra) + periode (mis. 01 Okt–31 Des 2026) + status (Aktif/Perencanaan).
4. **Katalog Digital Produk** — 486 produk, 443 tayang, 43 draf. Form produk:
   UMKM, nama, kategori, harga, stok, satuan, minimum order, deskripsi, kriteria
   (Halal, PIRT, BPOM, HAKI, Lainnya), foto (maks 5). Tiap produk punya link
   pemesanan: UMKM Langsung (WhatsApp) + tiap mitra (TikTok Shop, Shopee, dst);
   klik tercatat otomatis per link (Total Dilihat 12.630, Total Klik Link 8.945).
   - Sisi peserta ("Katalog Produk Saya"): produk sendiri + status
     (Tayang / Menunggu Verifikasi / Tidak Tayang) + klik per produk.
   - Sisi admin ("Verifikasi Katalog Produk"): Menunggu 32, Tayang 443,
     Tidak Disetujui 11; aksi Lihat / Setujui / Tolak (+ bulk).
5. **Pencatatan Transaksi & Omzet** (sisi peserta) — form "Tambah Pesanan/Transaksi":
   tanggal, sumber pesanan (UMKM Langsung vs Mitra Pemasaran), mitra, kanal
   pemesanan, nama pemesan (opsional), produk, jumlah (pcs), harga satuan,
   nilai transaksi OTOMATIS = jumlah × harga, jumlah Inquiry, status pesanan
   (Selesai/Diproses), **Repeat Order (Ya / Tidak / Tidak Diketahui)**,
   bukti transaksi (upload, opsional). Ringkasan per UMKM: Inquiry, Pesanan,
   Transaksi Selesai, Omzet, Perkembangan Omzet Okt (T1) → Nov (T2),
   Sumber Omzet (donut), Konversi (Klik → Transaksi), Repeat Order, Produk Terlaris.
6. **Dashboard & Monitoring (Monev)** — inilah yang dibangun di proyek ini
   (Vue + Space): KPI, Tren Omzet, Kinerja per Mitra, Capaian Indikator UMKM, Top 5.
7. **Evaluasi dan Perbaikan** — "Input Evaluasi & Tindak Lanjut UMKM" per UMKM
   per periode (T2 = Okt–Nov 2026): tabel Capaian Indikator (T0 Baseline,
   T1 Bulan 1, T2 Bulan 2) + Skor Kinerja Otomatis + Status (mis. 88, "Sangat Baik")
   + Catatan Evaluasi + Rencana Tindak Lanjut (checkbox).

## Model evaluasi (bagian "Rumusan Hasil evaluasi")

### 1. Bobot penilaian (total 100%)

| Indikator | Bobot | Dasar penilaian |
|---|---|---|
| Kesiapan Produk & Katalog | 20% | Kelengkapan dan kualitas katalog |
| Kanal Pemasaran Aktif | 15% | Aktivasi kanal pemasaran |
| Inquiry | 15% | Pertumbuhan permintaan |
| Transaksi | 20% | Pertumbuhan jumlah transaksi |
| Omzet | 20% | Pertumbuhan omzet |
| Repeat Order | 10% | Keberlanjutan pembelian |

### 2. Rumus perhitungan

- Pertumbuhan = (T2 − T0) / T0 × 100%. T0 = Baseline, T1 = Bulan 1, T2 = Bulan 2
  (di contoh: T1 = Okt, T2 = Nov).
- Jika T0 = 0, rumus pertumbuhan tidak bisa dipakai. Gantinya, untuk scorecard
  dipakai pencapaian terhadap target individual UMKM:
  **Skor Indikator = min(100, Realisasi / Target × 100)**.
- Setiap target harus > 0 dan ditetapkan pada awal periode evaluasi.
- Kesiapan katalog dinilai dengan rubrik kelengkapan dan kualitas
  (bukan sekadar rasio produk aktif/total).
- Repeat order memakai target jumlah transaksi berulang.

### Rebase target ke Okt–Nov (keputusan user 2026-11-24)

- Target dihitung dari realisasi **periode evaluasi Okt–Nov** (bukan total
  Jul–Nov): target_omzet/transaksi = realisasi Okt–Nov × 1,15–1,25;
  target_repeat = transaksi Okt–Nov × 0,30–0,40; target_produk_aktif
  (= jumlah_produk) dan target_konversi (10–15%) tidak berbasis jendela.
- Skor (agregat maupun dialog per UMKM) dihitung pada jendela evaluasi
  Okt–Nov yang TETAP, terlepas dari filter periode yang dipilih user —
  karena target ditetapkan untuk periode itu. KPI, Tren, dan angka
  transaksi/omzet dialog tetap mengikuti filter periode. Seksi skor
  menampilkan label "Periode evaluasi Okt–Nov" beserta penjelasannya.
- Σ target setelah rebase: omzet Rp 91.800.982, transaksi 481,
  produk aktif 525, repeat 140, konversi rata-rata 13,0%.

### Aturan repeat order (dari keterangan dokumen)

- "Repeat order ketika isiannya lebih dari 1x anggap aja iya" — transaksi
  repeat = transaksi yang isian repeat-nya > 1x (di form: Ya).
- Kanal Pemasaran, Inquiry, Transaksi diambil dari pencatatan omset
  (tab Transaksi) — rumusan dibuat sesuai kebutuhan.

## Pemetaan ke dashboard ini (yang sudah / belum)

| Kebutuhan rumus | Status di proyek ini |
|---|---|
| Realisasi (omzet, transaksi, pesanan, klik, produk) | Ada — dari tab Transaksi + UMKM |
| Repeat (jumlah transaksi berulang) | BELUM — kolom `repeat_transaksi` masih kosong |
| Inquiry (jumlah) | BELUM — tidak ada kolom inquiry di Transaksi |
| Kanal aktif per UMKM (jumlah kanal) | SEBAGIAN — mitra per UMKM ada di Transaksi; jumlah kanal belum dihitung |
| Target per UMKM per indikator | BELUM — diputuskan: target per UMKM (sesuai dokumen) |
| T0 baseline | BELUM — tab Ringkasan masih kosong |
| Rubrik kesiapan katalog | BELUM — butuh data checklist per UMKM |
| Skor terbobot + status (mis. 88 "Sangat Baik") | BELUM — bagian evaluasi (Step 7), di luar fokus dashboard |

## Kanal referensi (26)

Media Sosial: Instagram, TikTok, Facebook, YouTube. Marketplace: Shopee, Tokopedia,
Lazada, Blibli, TikTok Shop. Komunikasi Langsung: WhatsApp Business, Telegram.
Website/Toko Online: Website Mitra, Katalog Digital. Ritel Fisik: Toko, Minimarket,
Supermarket, Pusat Perbelanjaan. Penjualan B2B: Jaringan Korporasi, Hotel, Restoran,
Kafe, Pengadaan Perusahaan. Promosi Offline: Pameran, Bazar, Pop-up Store. Lainnya.
