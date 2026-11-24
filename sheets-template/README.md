# Template Google Sheet — Dashboard Monev UMKM

Tiga file CSV ini adalah template isi Google Sheet sumber data dashboard.
Buat satu Google Sheet dengan **4 tab** bernama persis seperti nama file
(tanpa `.csv`): `Transaksi`, `UMKM`, `Klik_Link`, `Target`, lalu impor
tiap CSV ke tab yang sesuai (File → Impor). Tambah tab ke-5 opsional
`Ringkasan` untuk total periode sebelumnya (delta KPI).

> **Semesta UMKM = 42 peserta TEI 2026.** Nama-nama dummy lama
> (My Little Dimsum, Burich, dkk.) sudah tidak ada — transaksi contoh
> dipetakan ulang ke 42 nama TEI dengan total yang persis sama.
> Daftar peserta dibaca generator dari `UMKM_TEI.csv` di folder ini
> (file sumber dari PDF peserta TEI 2026, 14–18 Okt 2026, ICE BSD);
> file itu BUKAN tab Sheet — tab `UMKM_TEI` yang dulu terpisah sudah
> dihapus karena isinya kini tercakup di tab `UMKM`.

## Struktur tab

### Transaksi — 1135 baris (tiap agregat 1 UMKM × 1 bulan dipecah per minggu ISO, + 1 baris transaksi tes Chipsychips 2026-11-17)
| Kolom | Isi |
|---|---|
| tanggal | Tanggal awal segmen minggu dalam bulan itu (tanggal 1 bila minggu terpotong awal bulan, Senin untuk segmen penuh), mis. 2026-07-01, 2026-07-06 |
| bulan | `2026-07` s.d. `2026-11` (catatan: Google Sheets kadang menafsirkan `2026-07` sebagai tanggal dan menampilkannya `2026-7`; dashboard menormalisasi format itu saat membaca, jadi aman — bila menulis lewat API, pakai `valueInputOption: RAW` untuk kolom ini) |
| nama_umkm | Nama UMKM (salah satu dari 42 peserta TEI 2026) |
| kategori | Sektor peserta TEI: Food & Beverage, Kopi, Fesyen, Craft, Home Decor, Fragrance, Personal Care, Beauty, Healthy Beverage |
| wilayah | Jakarta Selatan, Jakarta Timur, Jakarta Barat, Jakarta Utara, Jakarta Pusat, DKI Jakarta |
| mitra_pemasaran | Tokopedia, Shopee, Mall Grand Indonesia, Centong Daily, Koperasi Kumindag, Hippindo |
| pesanan | Jumlah pesanan bulan itu |
| transaksi | Jumlah transaksi (pesanan yang terbayar) bulan itu |
| omzet | Omzet Rupiah bulan itu |
| klik | Jumlah klik link bulan itu |

### UMKM — 42 baris (1 baris = 1 UMKM peserta TEI 2026)
`nama_umkm, kategori, wilayah, jumlah_produk, produk_aktif, transaksi, pesanan, omzet, repeat_transaksi, nama_pemilik, izin_usaha, instagram_website, penjelasan_produk`
(`transaksi`/`pesanan`/`omzet` di sini = total Jul–Nov 2026, harus sama
dengan jumlah baris UMKM itu di tab Transaksi. Kolom `jumlah_produk` dan
`produk_aktif` berisi angka ACAK DETERMINISTIK (8–17 produk, aktif
85–100%) — bukan data TEI, atas perintah user 2026-11-24. Kolom
`repeat_transaksi` berisi angka ACAK DETERMINISTIK (total 346 = 28,6% —
aturan repeat: transaksi yang isian repeat-nya > 1x dihitung repeat).
Tidak ada kolom mitra di tab ini — mitra utama tiap UMKM diturunkan
dari transaksi.)

### Target — 42 baris (1 baris = 1 UMKM; target individual per UMKM)
`nama_umkm, target_omzet, target_transaksi, target_produk_aktif, target_konversi, target_repeat`
Angka CONTOH deterministik (bukan data TEI): target omzet & transaksi =
realisasi OKT–NOV × 1,15–1,25; target produk aktif = jumlah_produk (target 100%
aktif); target konversi = 10–15%; target repeat = transaksi Okt–Nov × 0,30–0,40.
Semua target > 0 (syarat rumus skor). **User bisa mengubah angka ini
langsung di Sheet** — dashboard menghitung Skor Indikator =
min(100, Realisasi/Target × 100) dari tab ini, per UMKM maupun agregat,
dengan realisasi pada jendela evaluasi Okt–Nov yang tetap.

### Klik_Link — 30 baris (agregat klik per bulan × mitra)
`bulan, mitra_pemasaran, klik` — dipakai sebagai cek silang; sumber utama
klik tetap kolom `klik` di tab Transaksi. (Tidak merujuk nama UMKM.)

### Ringkasan (opsional, 2 kolom: `metrik, nilai`)
`omzet, 254061327` · `transaksi, 953` ·
`pesanan, 1148` · `klik, 10703`
= total periode sebelumnya, untuk badge delta KPI (+31% omzet dst).
Tanpa tab ini, dashboard memakai angka di atas sebagai default.

## Hasil verifikasi generator (dihitung ulang dari CSV yang ditulis)

| Ukuran | Hasil | Target | Status |
|---|---|---|---|
| Total omzet | Rp 333.023.341 | Rp 333.023.341 | ✅ |
| Total transaksi | 1.211 | 1.211 | ✅ |
| Total pesanan | 1.424 | 1.424 | ✅ |
| Total klik | 12.642 | 12.642 | ✅ |
| UMKM aktif | 42 | 42 | ✅ |
| Total produk (acak deterministik) | 525 | 525 | ✅ |
| Produk aktif (acak deterministik) | 497 (94,7%) | 497 | ✅ |
| Repeat order (acak deterministik) | 346 (28,6%) | 346 | ✅ |
| Σ target omzet | Rp 91.800.982 | Rp 91.800.982 | ✅ |
| Σ target transaksi | 481 | 481 | ✅ |
| Σ target produk aktif | 525 | 525 | ✅ |
| Σ target repeat | 140 | 140 | ✅ |
| Rata-rata target konversi | 13,0% | 13,0% | ✅ |
| Omzet Jul 2026 | Rp 136.761.925 | Rp 136.761.925 | ✅ |
| Omzet Agu 2026 | Rp 71.616.960 | Rp 71.616.960 | ✅ |
| Omzet Sep 2026 | Rp 48.450.115 | Rp 48.450.115 | ✅ |
| Omzet Okt 2026 | Rp 40.474.000 | Rp 40.474.000 | ✅ |
| Omzet Nov 2026 | Rp 35.720.341 | Rp 35.720.341 | ✅ |
| Total omzet s.d. Nov 2026 | Rp 333.023.341 | Rp 333.023.341 | ✅ |
| Omzet mingguan Okt–Nov 2026 (10 minggu) | Rp 76.194.341 | Rp 76.194.341 | ✅ |
| Tokopedia (9 UMKM) | Rp 112.258.500 (33,7%) | Rp 112.258.500 | ✅ |
| Shopee (9 UMKM) | Rp 89.614.000 (26,9%) | Rp 89.614.000 | ✅ |
| Mall Grand Indonesia (9 UMKM) | Rp 68.492.341 (20,6%) | Rp 68.492.341 | ✅ |
| Centong Daily (5 UMKM) | Rp 20.886.167 (6,3%) | Rp 20.886.167 | ✅ |
| Koperasi Kumindag (5 UMKM) | Rp 20.886.167 (6,3%) | Rp 20.886.167 | ✅ |
| Hippindo (5 UMKM) | Rp 20.886.166 (6,3%) | Rp 20.886.166 | ✅ |
| Konversi (transaksi/klik) | 9,6% | 9,6% | ✅ |
| Top 5 omzet | Rp 65.153.499 | Rp 65.153.499 | ✅ |

Top 5 UMKM baru (peserta TEI, menurut omzet Jul–Nov):
1. PT Antara Vita Global — Rp 13.943.377 (27 transaksi)
2. Benita & Co | PT Benita Karya Kreasi — Rp 13.157.896 (32 transaksi)
3. Introvert Identity — Rp 13.099.851 (18 transaksi)
4. Chipsychips — Rp 12.913.504 (35 transaksi)
5. TEPA SELIRA — Rp 12.038.871 (20 transaksi)

Regenerasi: `node scripts/generate-sheet-data.mjs` dari root proyek.
