export interface Transaction {
  tanggal: string
  /** Bulan dalam format YYYY-MM, mis. "2026-07" */
  bulan: string
  namaUmkm: string
  kategori: string
  wilayah: string
  /** Mitra pemasaran utama UMKM ini */
  mitra: string
  pesanan: number
  transaksi: number
  /** Omzet dalam Rupiah */
  omzet: number
  klik: number
}

/**
 * Satu baris master UMKM — 42 peserta TEI 2026 (Trade Expo Indonesia,
 * 14–18 Okt 2026, ICE BSD). Kolom jumlahProduk / produkAktif /
 * repeatTransaksi berisi angka acak deterministik (bukan data TEI);
 * null = kolom kosong di Sheet (dashboard menampilkan "—").
 */
export interface UmkmMaster {
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
}

/** Target individual per UMKM (tab Target di Google Sheet) — angka
 *  contoh deterministik dari generator, bisa diubah user di Sheet.
 *  Semua nilai > 0 (syarat rumus Skor = min(100, Realisasi/Target × 100)). */
export interface UmkmTarget {
  namaUmkm: string
  targetOmzet: number
  targetTransaksi: number
  targetProdukAktif: number
  /** Target konversi dalam persen (10–15). */
  targetKonversi: number
  targetRepeat: number
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
}
