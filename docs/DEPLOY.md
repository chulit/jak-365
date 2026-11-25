# Panduan Deploy Dashboard Monev UMKM ke Server Sendiri (VM)

Dokumen ini menjelaskan cara menayangkan dashboard di VM sendiri,
dari VM kosong sampai live, langkah demi langkah. Semua perintah
di sini memakai contoh yang bisa langsung diikuti — ganti nilai
contoh (alamat IP, nama domain, nama user) dengan yang sebenarnya.

**Contoh yang dipakai di dokumen ini:**
- VM: Ubuntu 22.04/24.04, user `ubuntu`, alamat IP `203.0.113.10`
- Domain: `monev.contoh.com` (arahkan DNS-nya ke IP VM)
- Folder web: `/var/www/monev-umkm`
- Repo: `git@github.com:chulit/jak-365.git` (branch `main`)

## Daftar Isi

- [1. Gambaran besar: apa yang sebenarnya di-deploy](#1-gambaran-besar-apa-yang-sebenarnya-di-deploy)
- [2. Yang perlu disiapkan](#2-yang-perlu-disiapkan)
- [3. Menyiapkan VM (sekali saja)](#3-menyiapkan-vm-sekali-saja)
- [4. Deploy pertama kali](#4-deploy-pertama-kali)
- [5. Deploy ulang (update)](#5-deploy-ulang-update)
- [6. Mengganti alamat sajian & ID Sheet](#6-mengganti-alamat-sajian--id-sheet)
- [7. Yang TIDAK perlu deploy](#7-yang-tidak-perlu-deploy)
- [8. Masalah yang sering terjadi](#8-masalah-yang-sering-terjadi)
- [9. File-file penting](#9-file-file-penting)

---

## 1. Gambaran besar: apa yang sebenarnya di-deploy

```
Kode di repo → build → folder dist/ (HTML/CSS/JS statis)
        → salin dist/ ke VM → nginx menyajikannya
        → https://monev.contoh.com/
```

Tiga hal penting dari gambar di atas:

1. **Dashboard ini situs statis.** Yang ditayangkan adalah hasil
   build di folder `dist/` (`index.html` + folder `assets/`).
   Tidak ada backend, tidak ada database, tidak ada proses aplikasi
   yang harus dijaga tetap jalan.
2. **Data tidak ikut di-deploy.** Angka dashboard dibaca langsung
   dari Google Sheet oleh browser pengunjung, setiap kali halaman
   dibuka (lihat `docs/PANDUAN.md`). Mengubah isi Sheet tidak butuh
   deploy sama sekali.
3. **Deploy = mengganti isi folder web.** Setiap update berarti:
   build ulang, lalu salin isi `dist/` yang baru ke
   `/var/www/monev-umkm`, menimpa yang lama.

## 2. Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| VM dengan akses SSH | Ubuntu 22.04/24.04, atau Oracle Linux 9. Perintah di dokumen ini untuk Ubuntu; bedanya dengan Oracle Linux ditulis di tiap langkah |
| Domain (opsional, tapi disarankan) | Perlu untuk HTTPS. Tanpa domain, situs hanya bisa diakses lewat IP dengan HTTP |
| Node.js 20 atau lebih baru | Untuk build. Di VM dipasang sekali saja (bagian 3) |
| Git | Untuk mengambil kode dari repo |
| nginx | Web server yang menyajikan `dist/` (dipasang di bagian 3) |
| Kunci SSH terdaftar di akun GitHub | Repo memakai alamat SSH (`git@github.com:...`), jadi `git pull` di VM memakai kunci SSH, bukan password |

## 3. Menyiapkan VM (sekali saja)

Semua perintah di bawah dijalankan **di VM** lewat SSH.

```bash
# 1. Perbarui daftar paket
sudo apt update

# 2. Pasang Node.js 20, Git, nginx, dan rsync
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx rsync

#    Oracle Linux 9: ganti dua perintah di atas dengan
#    sudo dnf install -y nodejs git nginx rsync
#    (Node.js dari repo Oracle Linux sudah versi 20+)

# 3. Periksa instalasi
node --version   # harapkan v20.x atau lebih baru
git --version
nginx -v

# 4. Siapkan folder web dan berikan ke user yang deploy
#    (ganti "ubuntu" dengan user SSH kamu)
sudo mkdir -p /var/www/monev-umkm
sudo chown -R ubuntu:ubuntu /var/www/monev-umkm

# 5. Buka firewall untuk HTTP dan HTTPS
sudo ufw allow 'Nginx Full'
#    Oracle Linux 9 (firewalld):
#    sudo firewall-cmd --permanent --add-service={http,https}
#    sudo firewall-cmd --reload
#    Kalau VM ada di cloud (mis. Oracle Cloud), buka juga port
#    80 dan 443 di security list / network security group-nya.
```

## 4. Deploy pertama kali

### 4.1 Ambil kode dan build di VM

```bash
# 1. Clone repo (sekali saja)
git clone git@github.com:chulit/jak-365.git ~/jak-365
cd ~/jak-365

# 2. Install dependency (sekali saja, atau setiap kali
#    package.json / package-lock.json berubah)
npm install

# 3. Siapkan ID Google Sheet
cp .env.example .env
# lalu isi VITE_SHEET_ID di .env dengan ID Sheet:
# VITE_SHEET_ID=1v8velGd7wZflo82bX0oB7fcisckQve67n6jppNBdSmg
# Kalau dikosongkan, dashboard memakai data contoh di src/data/sample.ts.
# File .env tidak masuk Git, jadi aman dari git pull.

# 4. Build (wajib hijau sebelum lanjut)
npm run build
# Hasilnya ada di dist/: index.html + assets/ + favicon.svg + icons.svg
```

### 4.2 Salin hasil build ke folder web

```bash
# --delete menghapus file lama yang sudah tidak ada di build baru
# (mis. bundle JS lama yang namanya sudah berubah)
rsync -a --delete dist/ /var/www/monev-umkm/
```

### 4.3 Atur nginx

Buat file `/etc/nginx/sites-available/monev` dengan isi berikut
(ganti `monev.contoh.com` dengan domain kamu; kalau belum punya
domain, isi `server_name` dengan IP VM, mis. `203.0.113.10`):

```nginx
server {
    listen 80;
    server_name monev.contoh.com;

    root /var/www/monev-umkm;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Aset hasil build namanya berubah tiap build, jadi aman
    # di-cache lama oleh browser. index.html JANGAN di-cache
    # lama — nginx tidak memberi header cache untuknya.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Aktifkan dan periksa:

```bash
sudo ln -s /etc/nginx/sites-available/monev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Oracle Linux 9: tidak ada sites-available/sites-enabled.
# Simpan file di atas sebagai /etc/nginx/conf.d/monev.conf,
# lalu langsung sudo nginx -t && sudo systemctl reload nginx.
```

Buka `http://monev.contoh.com/` (atau `http://203.0.113.10/`) —
dashboard harus sudah tampil.

### 4.4 HTTPS (butuh domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d monev.contoh.com
#    Oracle Linux 9: sudo dnf install -y certbot python3-certbot-nginx

# Ikuti pertanyaan certbot (alamat email + setuju redirect HTTP ke
# HTTPS). Setelah selesai, situs bisa dibuka dengan https://.
# Perpanjangan sertifikat otomatis dijadwalkan sendiri oleh certbot.
```

Syarat: DNS domain sudah mengarah ke IP VM (record A
`monev.contoh.com` → `203.0.113.10`) **sebelum** menjalankan
certbot. Tanpa domain, HTTPS dengan sertifikat publik tidak bisa
dibuat — situs tetap bisa jalan lewat HTTP di IP, tapi browser
akan menandainya "Tidak Aman".

## 5. Deploy ulang (update)

Setiap ada perubahan kode, ulangi tiga langkah ini **di VM**:

```bash
cd ~/jak-365
git pull origin main
npm run build
rsync -a --delete dist/ /var/www/monev-umkm/
```

Tidak perlu restart nginx — nginx menyajikan file dari disk, jadi
file baru langsung tampil. Restart hanya perlu kalau konfigurasi
nginx-nya yang berubah (`sudo nginx -t && sudo systemctl reload nginx`).

### Skrip deploy sekali jalan (opsional)

Simpan sebagai `~/deploy-monev.sh` di VM, lalu jalankan
`bash ~/deploy-monev.sh` setiap kali mau update:

```bash
#!/bin/bash
# Deploy dashboard Monev UMKM ke /var/www/monev-umkm.
# Berhenti di perintah pertama yang gagal.
set -e
cd ~/jak-365
git pull origin main
npm ci
npm run build
rsync -a --delete dist/ /var/www/monev-umkm/
echo "Deploy selesai."
```

### Alternatif: build di komputer sendiri, kirim hasilnya

Kalau tidak mau build di VM, build di komputer sendiri lalu kirim
`dist/` lewat rsync (butuh akses tulis ke folder web di VM):

```bash
# Di komputer sendiri:
npm run build
rsync -a --delete dist/ ubuntu@203.0.113.10:/var/www/monev-umkm/
```

## 6. Mengganti alamat sajian & ID Sheet

### Alamat sajian (root vs sub-path)

Alamat sajian diatur oleh `base` di `vite.config.ts` — **harus sama
dengan alamat tempat dashboard disajikan**:

| Disajikan di | `base` di `vite.config.ts` |
|---|---|
| `https://monev.contoh.com/` (root domain) | `'/'` |
| `https://contoh.com/jak-365/` (sub-path) | `'/jak-365/'` |

Mengubah `base` berarti mengubah kode — jadi setelah diubah harus
build ulang dan deploy ulang (bagian 5). Kalau `base` salah, halaman
tampil blank dan aset 404.

### ID Google Sheet

ID Sheet yang dipakai halaman live **dibekukan saat build** lewat
file `.env` di folder repo (`VITE_SHEET_ID`). Mengganti Sheet
berarti mengubah nilai itu di `.env` di VM, lalu build ulang dan
deploy ulang. ID diambil dari URL Sheet:
`https://docs.google.com/spreadsheets/d/<ID-DI-SINI>/edit`.
Sheet harus dibagikan **"Siapa saja yang memiliki link dapat
melihat"** — kalau tidak, dashboard menampilkan banner merah.
Kalau `VITE_SHEET_ID` kosong saat build, dashboard jatuh ke data
contoh dan footer menulis "Data contoh".

## 7. Yang TIDAK perlu deploy

| Perubahan | Perlu deploy? | Caranya |
|---|---|---|
| Mengubah angka di Google Sheet | Tidak | Edit tab Sheet, lalu muat ulang halaman dashboard. Data dibaca live |
| Menambah/mengubah baris data | Tidak | Sama seperti di atas; atau regenerasi dari generator (lihat `sheets-template/README.md`) |
| Mengubah kode (tampilan, rumus, filter) | Ya | Bagian 5 |
| Mengubah konfigurasi nginx | Ya, tapi beda | Edit file nginx, lalu `sudo nginx -t && sudo systemctl reload nginx` (tidak perlu build ulang) |

## 8. Masalah yang sering terjadi

| Gejala | Penyebab paling mungkin | Perbaikan |
|---|---|---|
| Halaman blank, aset 404 di console browser | `base` di `vite.config.ts` tidak cocok dengan alamat sajian | Sesuaikan `base` (bagian 6), build ulang, deploy ulang |
| 403 Forbidden | nginx tidak bisa membaca folder web | Periksa pemilik folder: `ls -ld /var/www/monev-umkm` — harus bisa dibaca user `www-data`. Perbaiki dengan `sudo chown -R ubuntu:ubuntu /var/www/monev-umkm` + `sudo chmod -R 755 /var/www/monev-umkm` |
| Tidak bisa dibuka sama sekali (connection refused / timeout) | nginx belum jalan, atau firewall menutup port 80/443 | `sudo systemctl status nginx`; buka firewall (bagian 3 langkah 5) dan port 80/443 di security list cloud |
| Halaman masih versi lama padahal sudah deploy ulang | Cache browser, atau rsync belum jalan | Muat ulang paksa (`Ctrl+Shift+R` / `Cmd+Shift+R`). Bandingkan nama bundle: `ls /var/www/monev-umkm/assets/` vs yang dipakai halaman live |
| `certbot` gagal | DNS domain belum mengarah ke IP VM | Periksa record A domain, tunggu propagasi DNS, jalankan certbot lagi |
| Build gagal di VM | Node.js terlalu lama, atau dependency belum ter-install | `node --version` (harus v20+); jalankan `npm ci` lalu `npm run build` lagi |
| `git pull` ditolak (permission denied / publickey) | Kunci SSH VM belum terdaftar di akun GitHub | Daftarkan kunci publik VM (`~/.ssh/id_ed25519.pub`) di GitHub → Settings → SSH and GPG keys |
| `npm run build` gagal: error TypeScript | Ada error tipe di kode | Jalankan `npm run build` di komputer sendiri, perbaiki error yang ditampilkan, commit, lalu deploy ulang |

## 9. File-file penting

| File | Fungsi |
|---|---|
| `package.json` | Daftar dependency + script `dev` / `build` / `preview` |
| `vite.config.ts` | `base` — WAJIB sama dengan alamat sajian (bagian 6) |
| `src/lib/sheets.ts` | Membaca Sheet lewat gviz CSV (`sheetIdFromEnv()` membaca `VITE_SHEET_ID`) |
| `src/data/sample.ts` | Data contoh — hanya dipakai kalau tidak ada ID Sheet |
| `scripts/generate-sheet-data.mjs` | Generator data: satu-satunya sumber kebenaran untuk CSV + data contoh |
| `scripts/write-sheet.mjs` | Menulis ulang ke-9 tab Sheet dari `sheets-template/*.csv` |
| `scripts/verify-formulas.mjs` | Menguji rumus terhadap Sheet live (97 pemeriksaan: jalankan `node scripts/verify-formulas.mjs`, keluar 0 bila semua cocok) |
| `sheets-template/*.csv` | Salinan lokal tiap tab Sheet (dipakai generator + verifikasi) |
| `.env` / `.env.example` | ID Sheet (`.env` tidak masuk Git) |

## Alternatif: GitHub Pages (masih aktif)

Situs ini juga masih tayang di https://chulit.github.io/jak-365/
lewat GitHub Pages — setiap push ke `main` otomatis di-build oleh
workflow `.github/workflows/deploy-pages.yml` (Node 20, `npm ci`,
`npm run build` dengan `VITE_SHEET_ID`, lalu deploy ke Pages).
Cara ini tetap bisa dipakai sebagai cadangan, tapi panduan utama
dokumen ini adalah server sendiri.

---

*Terakhir diperbarui: 2026-11-25. Repo: https://github.com/chulit/jak-365*
