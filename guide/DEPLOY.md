# Panduan Deploy Dashboard Monev UMKM

Dokumen ini menjelaskan cara menjalankan dan menayangkan dashboard
Monitoring & Evaluasi UMKM dari awal sampai live, langkah demi langkah.
Semua perintah di sini sudah dicoba pada project ini.

**Alamat live:** https://chulit.github.io/jak-365/
**Repo:** `git@github.com:chulit/jak-365.git` (branch `main`)

---

## 1. Gambaran besar: bagaimana dashboard ini tayang

```
Kode di laptop → push ke branch main di GitHub
        → GitHub Actions otomatis: install → build → upload
        → GitHub Pages menayangkan hasilnya
        → https://chulit.github.io/jak-365/
```

Tiga hal penting dari gambar di atas:

1. **Satu-satunya cara deploy adalah push ke `main`.**
   Tidak ada tombol deploy manual di server, tidak ada FTP.
   Begitu commit mendarat di `main`, GitHub Actions jalan sendiri.
2. **Yang ditayangkan adalah hasil build, bukan kode sumber.**
   Build mengubah kode Vue + TypeScript menjadi file HTML/CSS/JS statis
   di folder `dist/`. Folder `dist/` inilah yang diunggah ke Pages.
3. **Data tidak ikut di-deploy.** Angka dashboard dibaca langsung dari
   Google Sheet setiap kali halaman dibuka (lihat `guide/PANDUAN.md`).
   Mengubah isi Sheet tidak butuh deploy sama sekali.

File yang mengatur seluruh proses ini:
`.github/workflows/deploy-pages.yml` (dibahas di bagian 7).

---

## 2. Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| Akun GitHub dengan akses ke repo `chulit/jak-365` | Tanpa ini tidak bisa push maupun melihat log deploy |
| Git | Untuk clone, commit, dan push |
| Node.js 20 | Versi yang dipakai server build (lihat workflow). Versi lokal boleh lebih baru, tapi build lokal sebaiknya dicoba dulu sebelum push |
| Kunci SSH terdaftar di akun GitHub | Repo memakai alamat SSH (`git@github.com:...`), jadi `git push` memakai kunci SSH, bukan password. Kalau push ditolak, periksa dulu kunci ini |

Cek instalasi di terminal:

```bash
git --version
node --version   # harapkan v20.x (di server build: 20)
npm --version
```

---

## 3. Menjalankan di komputer sendiri (pertama kali)

```bash
# 1. Ambil kode
git clone git@github.com:chulit/jak-365.git
cd jak-365

# 2. Pastikan di branch main dan sudah yang terbaru
git checkout main
git pull origin main

# 3. Install semua dependency (sekali saja, atau setiap kali
#    package.json / package-lock.json berubah)
npm install

# 4. Siapkan ID Google Sheet (opsional, tapi disarankan)
cp .env.example .env
# lalu isi VITE_SHEET_ID di .env dengan ID Sheet:
# VITE_SHEET_ID=1v8velGd7wZflo82bX0oB7fcisckQve67n6jppNBdSmg
# Kalau dikosongkan, dashboard memakai data contoh di src/data/sample.ts

# 5. Jalankan mode pengembangan (hot reload, buka di browser)
npm run dev
# Biasanya di http://localhost:5173/jak-365/
```

Perintah lain yang tersedia (lihat `package.json`):

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan lokal |
| `npm run build` | Cek tipe TypeScript (`vue-tsc`) lalu build produksi ke `dist/` |
| `npm run preview` | Menayangkan hasil `dist/` secara lokal, untuk memeriksa hasil build sebelum push |

**Aturan sebelum push: `npm run build` harus hijau.** Perintah ini
menjalankan pengecekan tipe dulu — kalau ada error TypeScript, build
berhenti dan tidak ada file yang dihasilkan. Jangan push kode yang
gagal build lokal; server build akan gagal dengan error yang sama.

---

## 4. Cara deploy (alur normal)

Deploy = push ke `main`. Urutan kerja yang dipakai project ini:

```bash
# 1. Pastikan branch main sudah yang terbaru
git checkout main
git pull origin main

# 2. Buat perubahan, lalu cek build lokal
npm run build

# 3. Commit (pesan commit mengikuti pola: tipe(scope): deskripsi
#    dalam Bahasa Indonesia — contoh: feat(dashboard): ...,
#    fix(dashboard): ..., docs(panduan): ..., refactor(dashboard): ...)
git add -A
git commit -m "feat(dashboard): deskripsi perubahan"

# 4. Push — inilah yang memicu deploy
git push origin main
```

Setelah push, tidak ada lagi yang perlu dilakukan. GitHub Actions
akan jalan otomatis (biasanya selesai dalam 1–2 menit).

### Memastikan deploy berhasil

1. Buka repo di GitHub → tab **Actions** → jalankan workflow
   **"Deploy to GitHub Pages"** yang terbaru.
   Dua job harus hijau: `build` lalu `deploy`.
   Kalau salah satu merah, klik job itu dan baca log errornya
   (masalah yang sering terjadi ada di bagian 8).
2. Tunggu sampai job `deploy` selesai, lalu buka
   https://chulit.github.io/jak-365/.
3. Kalau halaman masih terlihat seperti versi lama, itu cache browser:
   muat ulang paksa (`Ctrl+Shift+R` di Windows/Linux,
   `Cmd+Shift+R` di Mac).
4. Cara paling pasti: bandingkan nama file JavaScript yang dipakai
   halaman live dengan hasil build lokal. Di terminal:

   ```bash
   # Nama bundle dari hasil build lokal
   ls dist/assets/*.js
   # Nama bundle yang dipakai halaman live (harus sama)
   curl -s https://chulit.github.io/jak-365/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
   ```

   Nama bundle berubah setiap build (contoh: `index-CsJ3xWv9.js`).
   Kalau keduanya sama, halaman live sudah versi terbaru.
   Kalau berbeda, deploy belum selesai atau browser masih memakai cache.

### Deploy manual (tanpa push)

Kadang deploy perlu diulang tanpa mengubah kode — misal job deploy
gagal karena gangguan sementara. Caranya:

1. Buka repo → tab **Actions** → workflow **"Deploy to GitHub Pages"**.
2. Klik **Run workflow** → pilih branch `main` → **Run workflow**.

---

## 5. Yang TIDAK perlu deploy

| Perubahan | Perlu deploy? | Caranya |
|---|---|---|
| Mengubah angka di Google Sheet | Tidak | Edit tab Sheet, lalu muat ulang halaman dashboard. Data dibaca live |
| Menambah/mengubah baris data | Tidak | Sama seperti di atas; atau regenerasi dari generator (lihat bawah) |
| Mengubah kode (tampilan, rumus, filter) | Ya | Push ke `main` (bagian 4) |
| Mengubah workflow deploy | Ya | Push ke `main` — hati-hati, file ini mengatur deploy itu sendiri |

**Regenerasi data dari generator** (tanpa deploy):

```bash
# 1. Ubah logika data di scripts/generate-sheet-data.mjs bila perlu
# 2. Regenerasi CSV lokal + data contoh (memverifikasi total tetap)
node scripts/generate-sheet-data.mjs
# 3. Tulis ulang ke-9 tab Google Sheet dari sheets-template/*.csv
node scripts/write-sheet.mjs
# 4. Commit CSV yang berubah, lalu push seperti biasa
#    (push ini men-deploy ulang, tapi data barunya sudah live dari Sheet)
```

---

## 6. Mengganti ID Google Sheet

ID Sheet yang dipakai halaman live **dibekukan saat build** lewat
environment variable `VITE_SHEET_ID`. Ada dua tempat:

| Tempat | Isi | Fungsi |
|---|---|---|
| `.env` (lokal, tidak masuk Git) | `VITE_SHEET_ID=<ID>` | Dipakai `npm run dev` dan `npm run build` lokal |
| `.github/workflows/deploy-pages.yml`, langkah `Build` | `VITE_SHEET_ID: 1v8velGd7wZflo82bX0oB7fcisckQve67n6jppNBdSmg` | Dipakai server build untuk halaman live |

Mengganti Sheet berarti mengubah **keduanya**, lalu push. Perhatian:

- ID diambil dari URL Sheet:
  `https://docs.google.com/spreadsheets/d/<ID-DI-SINI>/edit`.
- Sheet harus dibagikan **"Siapa saja yang memiliki link dapat melihat"**,
  kalau tidak dashboard tidak bisa membacanya dan menampilkan banner merah.
- Kalau `VITE_SHEET_ID` kosong saat build, dashboard jatuh ke data contoh
  di `src/data/sample.ts` — dan footer akan menulis "Data contoh",
  bukan "Google Sheet (ID...)". Itu tanda ID tidak terbaca.
- Setelah halaman berhasil memuat satu Sheet, browser menyimpan ID itu
  di `localStorage` — tapi build berikutnya tetap memakai `VITE_SHEET_ID`.

---

## 7. File-file penting

| File | Fungsi |
|---|---|
| `.github/workflows/deploy-pages.yml` | Satu-satunya workflow deploy: trigger push ke `main` + manual; job `build` (Node 20 → `npm ci` → `npm run build` dengan `VITE_SHEET_ID` → upload `dist/`) lalu job `deploy` ke Pages |
| `package.json` | Daftar dependency + script `dev` / `build` / `preview` |
| `vite.config.ts` | `base: '/jak-365/'` — WAJIB sama dengan nama repo, karena Pages project site disajikan di sub-path `/jak-365/`. Kalau base salah, halaman live blank dan aset 404 |
| `src/lib/sheets.ts` | Membaca Sheet lewat gviz CSV (`sheetIdFromEnv()` membaca `VITE_SHEET_ID`) |
| `src/data/sample.ts` | Data contoh — hanya dipakai kalau tidak ada ID Sheet |
| `scripts/generate-sheet-data.mjs` | Generator data: satu-satunya sumber kebenaran untuk CSV + data contoh |
| `scripts/write-sheet.mjs` | Menulis ulang ke-9 tab Sheet dari `sheets-template/*.csv` |
| `sheets-template/*.csv` | Salinan lokal tiap tab Sheet (dipakai generator + verifikasi) |
| `.env` / `.env.example` | ID Sheet lokal (`.env` tidak masuk Git) |

**Pengaturan satu kali di GitHub (sudah dilakukan, jangan diubah
tanpa alasan):** repo → Settings → Pages → Build and deployment →
Source: **GitHub Actions**. Kalau source-nya masih "Deploy from a
branch", workflow di atas tidak akan menayangkan apa pun.

---

## 8. Masalah yang sering terjadi

| Gejala | Penyebab paling mungkin | Perbaikan |
|---|---|---|
| Job `build` merah: error TypeScript / `vue-tsc` | Ada error tipe di kode | Jalankan `npm run build` di lokal, perbaiki error yang ditampilkan, push lagi |
| Job `build` merah: `npm ci` gagal | `package-lock.json` tidak sinkron dengan `package.json` | Jalankan `npm install` di lokal, commit `package-lock.json` yang berubah, push lagi |
| Job `deploy` merah, `build` hijau | Gangguan sementara Pages / permission | Jalankan ulang workflow secara manual (bagian 4). Kalau tetap gagal, baca log job `deploy` |
| Halaman live masih versi lama padahal Actions hijau | Cache browser, atau deploy belum selesai | Tunggu 1–2 menit, lalu muat ulang paksa. Bandingkan nama bundle seperti di bagian 4 |
| Halaman live blank / aset 404 | `base` di `vite.config.ts` berubah dari `/jak-365/` | Kembalikan `base` ke `/jak-365/`, push lagi |
| Dashboard menampilkan data contoh / banner merah "Gagal memuat Google Sheet" | `VITE_SHEET_ID` kosong saat build, atau Sheet tidak dibagikan publik | Periksa env di workflow (bagian 6); pastikan Sheet "Siapa saja yang memiliki link dapat melihat"; periksa footer halaman — harus tertulis "Google Sheet (ID...)" |
| `git push` ditolak (permission denied / publickey) | Kunci SSH belum terdaftar di akun GitHub, atau remote bukan SSH | Daftarkan kunci publik (`~/.ssh/id_ed25519.pub`) di GitHub → Settings → SSH and GPG keys; pastikan `git remote -v` menunjukkan `git@github.com:chulit/jak-365.git` |
| Build lokal gagal tapi dulu berhasil | Dependency baru belum ter-install | Jalankan `npm install`, lalu `npm run build` lagi |

---

*Terakhir diperbarui: 2026-11-25. Repo: https://github.com/chulit/jak-365 —
Live: https://chulit.github.io/jak-365/*
