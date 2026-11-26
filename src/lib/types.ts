export interface Transaction {
  tanggal: string
  /** Bulan dalam format YYYY-MM, mis. "2026-07" */
  bulan: string
  /** ID unik UMKM (UMKM-001…) — kunci sambung ke tab UMKM. */
  idUmkm: string
  namaUmkm: string
  kategori: string
  wilayah: string
  /** ID unik mitra (MTR-001…) — kunci sambung ke tab Mitra. */
  idMitra: string
  /** Mitra pemasaran utama UMKM ini */
  mitra: string
  /** ID unik kanal (KNL-01…) — kunci sambung ke tab Kanal. */
  idKanal: string
  /** Kanal pemesanan utama baris ini (satu kanal dari daftar kanal mitra). */
  kanal: string
  pesanan: number
  transaksi: number
  /** Omzet dalam Rupiah */
  omzet: number
  klik: number
  /** Jumlah inquiry (corong: inquiry ≥ pesanan). */
  inquiry: number
}

/**
 * Satu baris master UMKM — 42 peserta TEI 2026 (Trade Expo Indonesia,
 * 14–18 Okt 2026, ICE BSD). Kolom jumlahProduk / produkAktif /
 * repeatTransaksi berisi angka acak deterministik (bukan data TEI);
 * null = kolom kosong di Sheet (dashboard menampilkan "—").
 */
export interface UmkmMaster {
  /** ID unik UMKM (UMKM-001…) — kunci sambung antar-tab. */
  idUmkm: string
  /** Kode peserta format mockup (JP-xxxxxxxx, CONTOH). */
  kodePeserta: string
  /** Grade tertil omzet (A/B/C). */
  grade: string
  namaUmkm: string
  kategori: string
  wilayah: string
  /** Mitra pemasaran utama UMKM ini (diturunkan dari transaksi bila tab tidak membawanya) */
  mitra: string
  /** null = tidak ada data produk di master */
  jumlahProduk: number | null
  /** null = tidak ada data produk di master */
  produkAktif: number | null
  /** Total Jul–Nov 2026 (harus = jumlah baris UMKM itu di Transaksi) */
  transaksi: number
  /** null = tidak ada data repeat di master */
  repeatTransaksi: number | null
  /** Nama pemilik usaha (data master TEI) */
  namaPemilik: string
  /** Izin usaha yang dimiliki (data master TEI) */
  izinUsaha: string
  /** Instagram / website (data master TEI) */
  instagramWebsite: string
  /** Penjelasan produk (data master TEI) */
  penjelasanProduk: string
  /** Program pendampingan yang diikuti ("TEI 2026", "Pendampingan
   *  Ekspor 2026", atau keduanya dipisah "; ") — '—' bila belum ada. */
  program: string
  /** Nama perusahaan (badan usaha) bila diketahui, '' bila tidak. */
  namaPerusahaan: string
}

/** Target individual per UMKM (tab Target di Google Sheet) — angka
 *  contoh deterministik dari generator, bisa diubah user di Sheet.
 *  Semua nilai > 0 (syarat rumus Skor = min(100, Realisasi/Target × 100)). */
export interface UmkmTarget {
  /** ID unik UMKM — kunci sambung (namaUmkm tetap ada sebagai label). */
  idUmkm: string
  namaUmkm: string
  targetOmzet: number
  targetTransaksi: number
  targetProdukAktif: number
  /** Target konversi dalam persen (10–15). */
  targetKonversi: number
  targetRepeat: number
  targetInquiry: number
  /** Target jumlah kanal aktif (2–3). */
  targetKanalAktif: number
}

/** Satu baris master Mitra (tab Mitra) — 6 mitra. PIC/kontak/email/
 *  dokumen/catatan kosong bila datanya tidak ada (tampil "—"). */
export interface MitraMaster {
  idMitra: string
  namaMitra: string
  jenis: string
  pic: string
  kontak: string
  email: string
  kategoriProduk: string
  wilayah: string
  /** Daftar nama kanal mitra ini (dipisah "; " di Sheet). */
  kanal: string[]
  status: string
  dokumen: string
  catatan: string
}

/** Satu baris referensi kanal (tab Kanal) — 26 kanal dari mockup. */
export interface KanalRef {
  idKanal: string
  namaKanal: string
  kategori: string
}

/** Satu baris katalog produk (tab Katalog) — 525 produk. */
export interface ProdukKatalog {
  idProduk: string
  idUmkm: string
  namaUmkm: string
  namaProduk: string
  kategori: string
  harga: number
  stok: number
  satuan: string
  /** Tayang / Menunggu / Tidak Disetujui. */
  statusVerifikasi: string
}

/** Satu baris penugasan mitra ke UMKM (tab Penugasan). */
export interface Penugasan {
  idPenugasan: string
  idUmkm: string
  namaUmkm: string
  idMitra: string
  namaMitra: string
  idKanal: string
  kanal: string
  periode: string
  status: string
}

/** Total periode sebelumnya — dipakai menghitung badge delta KPI. */
export interface PreviousTotals {
  omzet: number
  transaksi: number
  pesanan: number
  klik: number
}

export interface DashboardData {
  transactions: Transaction[]
  umkm: UmkmMaster[]
  previous: PreviousTotals
  /** Target per UMKM (tab Target); kosong = belum ada target. */
  targets: UmkmTarget[]
  /** Pesan error bila tab Target gagal dibaca (fetch gagal / tab kosong);
   *  null = Target berhasil dibaca. Dipakai seksi Capaian Indikator agar
   *  skor tampil "—" dengan catatan jujur, BUKAN angka contoh. */
  targetsError: string | null
  /** Master Mitra (tab Mitra); kosong bila tab tidak terbaca. */
  mitra: MitraMaster[]
  /** Referensi kanal (tab Kanal); kosong bila tab tidak terbaca. */
  kanal: KanalRef[]
  /** Katalog produk (tab Katalog); kosong bila tab tidak terbaca. */
  katalog: ProdukKatalog[]
  /** Penugasan mitra ke UMKM (tab Penugasan); kosong bila tab tidak terbaca. */
  penugasan: Penugasan[]
}
