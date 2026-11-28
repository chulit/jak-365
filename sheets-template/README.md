# Template Google Sheet — Dashboard Monev UMKM

Sembilan file CSV ini adalah template isi Google Sheet sumber data dashboard.
Buat satu Google Sheet dengan **9 tab** bernama persis seperti nama file
(tanpa `.csv`): `Transaksi`, `UMKM`, `Mitra`, `Kanal`, `Katalog`,
`Penugasan`, `Klik_Link`, `Target`, `Ringkasan`, lalu impor tiap CSV
ke tab yang sesuai (File → Impor).

> **Struktur relasional (2026-11-24).** Tiap master punya ID unik dan
> antar-tab disambung pakai ID, bukan nama: `id_umkm` (UMKM-001…),
> `id_mitra` (MTR-001…), `id_kanal` (KNL-01…), `id_produk` (PRD-001…),
> `id_penugasan` (PNG-001…). Nama tetap ditulis sebagai label supaya
> Sheet tetap bisa dibaca. Angka mockup diabaikan — yang dibangun adalah
> struktur + data yang bisa diolah dashboard.
>
> **Semesta UMKM = 70 baris: 42 peserta TEI 2026 + 28 peserta
> Pendampingan Ekspor 2026 (12 ikut keduanya).** Nama-nama dummy lama
> (My Little Dimsum, Burich, dkk.) sudah tidak ada — transaksi contoh
> dipetakan ulang ke 42 nama TEI dengan total yang persis sama.
> Daftar TEI dibaca generator dari `UMKM_TEI.csv` di folder ini
> (file sumber dari PDF peserta TEI 2026, 14–18 Okt 2026, ICE BSD);
> daftar Ekspor dibaca dari `UMKM_EKSPOR.csv` (disalin dari PDF
> "Data Peserta Pendampingan Ekspor 2026" — kolom No. WhatsApp PIC
> sengaja tidak disalin karena Sheet ini publik). Kedua file itu BUKAN
> tab Sheet — tab `UMKM_TEI` yang dulu terpisah sudah dihapus karena
> isinya kini tercakup di tab `UMKM`.

## Struktur tab

### Transaksi — 1892 baris (tiap agregat 1 UMKM × 1 bulan dipecah per minggu ISO; 42 TEI + 28 Ekspor + 2 baris transaksi tes)
| Kolom | Isi |
|---|---|
| tanggal | Tanggal awal segmen minggu dalam bulan itu (tanggal 1 bila minggu terpotong awal bulan, Senin untuk segmen penuh), mis. 2026-07-01, 2026-07-06 |
| bulan | `2026-07` s.d. `2026-11` (catatan: Google Sheets kadang menafsirkan `2026-07` sebagai tanggal dan menampilkannya `2026-7`; dashboard menormalisasi format itu saat membaca, jadi aman — bila menulis lewat API, pakai `valueInputOption: RAW` untuk kolom ini) |
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

### UMKM — 70 baris (42 peserta TEI 2026 + 28 peserta Pendampingan Ekspor 2026; 12 ikut keduanya)
`id_umkm, kode_peserta, grade, nama_umkm, kategori, wilayah, jumlah_produk, produk_aktif, transaksi, repeat_transaksi, nama_pemilik, izin_usaha, instagram_website, penjelasan_produk, program, nama_perusahaan`
(`transaksi` di sini = total Jul–Nov 2026, harus sama
dengan jumlah baris UMKM itu di tab Transaksi — 28 baris Ekspor 0
karena belum ada transaksinya. Kolom `pesanan` dan
`omzet` DIHAPUS 2026-11-24 atas perintah user (redundan — semua angka
pesanan/omzet dashboard dihitung dari tab Transaksi, bukan dari master).
`kode_peserta` = kode bisnis format mockup (JP-xxxxxxxx, CONTOH);
`grade` = tertil omzet (A/B/C, hanya 42 TEI — baris Ekspor kosong).
`produk_aktif` berisi angka ACAK
DETERMINISTIK (8–17 produk, aktif 85–100%) — bukan data TEI, atas
perintah user 2026-11-24; baris Ekspor kosong. Kolom `repeat_transaksi` berisi angka ACAK
DETERMINISTIK (total 346 = 28,5% — aturan repeat: transaksi yang isian
repeat-nya > 1x dihitung repeat).
Tidak ada kolom mitra di tab ini — mitra utama tiap UMKM diturunkan
dari transaksi. `program` = program pendampingan yang diikuti
("TEI 2026", "Pendampingan Ekspor 2026", atau keduanya dipisah "; ");
`nama_perusahaan` = nama badan usaha bila diketahui dari PDF Ekspor.)

### Mitra — 6 baris (master mitra)
`id_mitra, nama_mitra, jenis, pic, kontak, email, kategori_produk, wilayah, kanal, status, dokumen, catatan`
Jenis + kanal dari penilaian model bisnis (CONTOH); PIC/kontak/email/
dokumen/catatan kosong karena datanya tidak ada — bisa diisi user di Sheet.

### Kanal — 26 baris (26 kanal referensi dari mockup)
`id_kanal, nama_kanal, kategori`

### Katalog — 525 baris (1 baris = 1 produk; jumlah per UMKM = jumlah_produk)
`id_produk, id_umkm, nama_umkm, nama_produk, kategori, harga, stok, satuan, status_verifikasi`
Nama produk diturunkan dari penjelasan produk TEI (+ varian kemasan/
ukuran bila kurang); harga/stok angka CONTOH deterministik. Status:
Tayang = produk aktif (497), sisanya Menunggu /
Tidak Disetujui.

### Penugasan — 70 baris (1 baris = 1 UMKM × mitra utamanya)
`id_penugasan, id_umkm, nama_umkm, id_mitra, nama_mitra, id_kanal, kanal, periode, status`
Kanal = kanal utama (pertama) mitra itu; periode 01 Okt–31 Des 2026.

### Target — 42 baris (1 baris = 1 UMKM; target individual per UMKM)
`id_umkm, nama_umkm, target_omzet, target_transaksi, target_produk_aktif, target_konversi, target_repeat, target_inquiry, target_kanal_aktif`
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

### Klik_Link — 30 baris (agregat klik per bulan × mitra)
`bulan, id_mitra, mitra_pemasaran, klik` — dipakai sebagai cek silang; sumber utama
klik tetap kolom `klik` di tab Transaksi. (Tidak merujuk nama UMKM.)

### Ringkasan (2 kolom: `metrik, nilai`)
`omzet, 254061327` · `transaksi, 953` ·
`pesanan, 1148` · `klik, 10703`
= total periode sebelumnya (5 bulan), untuk badge delta KPI (+31% omzet dst).
BUKAN total Sep: delta membandingkan jendela 5 bulan dengan 5 bulan
sebelumnya, jadi baseline-nya harus seperiode. Angka CONTOH dari
screenshot awal (sama dengan fallback yang selama ini dipakai sample.ts).

## Hasil verifikasi generator (dihitung ulang dari CSV yang ditulis)

| Ukuran | Hasil | Target | Status |
|---|---|---|---|
| Total omzet | Rp 556.023.341 | Rp 556.023.341 | ✅ |
| Total transaksi | 2.012 | 2.012 | ✅ |
| Total pesanan | 2.375 | 2.375 | ✅ |
| Total klik | 21.047 | 21.047 | ✅ |
| UMKM aktif | 42 | 42 | ✅ |
| Total produk (acak deterministik) | 525 | 525 | ✅ |
| Produk aktif (acak deterministik) | 497 (94,7%) | 497 | ✅ |
| Repeat order (acak deterministik) | 346 (17,2%) | 346 | ✅ |
| Total inquiry (CONTOH deterministik) | 3.592 | 3.592 | ✅ |
| Inquiry Okt–Nov 2026 | 1.244 | 1.244 | ✅ |
| Rata-rata kanal aktif per UMKM (Okt–Nov) | 2,97 kanal | 2,97 kanal | ✅ |
| Katalog: produk | 525 | 525 | ✅ |
| Katalog: Tayang | 497 | 497 | ✅ |
| Penugasan | 70 | 42 | ✅ |
| Σ target omzet | Rp 91.800.982 | Rp 91.800.982 | ✅ |
| Σ target transaksi | 481 | 481 | ✅ |
| Σ target produk aktif | 525 | 525 | ✅ |
| Σ target repeat | 140 | 140 | ✅ |
| Σ target inquiry | 881 | 881 | ✅ |
| Σ target kanal aktif | 106 | 106 | ✅ |
| Rata-rata target konversi | 13,0% | 13,0% | ✅ |
| Omzet Jul 2026 | Rp 136.761.925 | Rp 136.761.925 | ✅ |
| Omzet Agu 2026 | Rp 71.616.960 | Rp 71.616.960 | ✅ |
| Omzet Sep 2026 | Rp 48.450.115 | Rp 48.450.115 | ✅ |
| Omzet Okt 2026 | Rp 40.474.000 | Rp 40.474.000 | ✅ |
| Omzet Nov 2026 | Rp 60.320.341 | Rp 60.320.341 | ✅ |
| Total omzet s.d. Nov 2026 | Rp 556.023.341 | Rp 556.023.341 | ✅ |
| Omzet mingguan Okt–Nov 2026 (10 minggu) | Rp 127.794.341 | Rp 76.194.341 | ✅ |
| Tokopedia (9 UMKM) | Rp 158.373.107 (28,5%) | Rp 158.373.107 | ✅ |
| Shopee (9 UMKM) | Rp 129.394.579 (23,3%) | Rp 129.394.579 | ✅ |
| Mall Grand Indonesia (9 UMKM) | Rp 100.689.824 (18,1%) | Rp 100.689.824 | ✅ |
| Centong Daily (5 UMKM) | Rp 60.609.121 (10,9%) | Rp 60.609.121 | ✅ |
| Koperasi Kumindag (5 UMKM) | Rp 60.814.192 (10,9%) | Rp 60.814.192 | ✅ |
| Hippindo (5 UMKM) | Rp 46.142.518 (8,3%) | Rp 46.142.518 | ✅ |
| Konversi (transaksi/klik) | 9,6% | 9,6% | ✅ |
| Top 5 omzet | Rp 65.153.499 | Rp 65.153.499 | ✅ |

Top 5 UMKM baru (peserta TEI, menurut omzet Jul–Nov):
1. PT Antara Vita Global — Rp 13.943.377 (27 transaksi)
2. Benita & Co | PT Benita Karya Kreasi — Rp 13.157.896 (32 transaksi)
3. Introvert Identity — Rp 13.099.851 (18 transaksi)
4. Chipsychips — Rp 12.913.504 (35 transaksi)
5. TEPA SELIRA — Rp 12.038.871 (20 transaksi)

Regenerasi: `node scripts/generate-sheet-data.mjs` dari root proyek.
