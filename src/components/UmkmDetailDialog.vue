<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { Banknote, ChevronLeft, ChevronRight, ExternalLink, Globe, ShoppingCart, Store, TrendingUp, User, X } from 'lucide-vue-next'
import { VChart, chartPalette } from '@/lib/echarts'
import { formatNumber, formatPercent, formatRupiah } from '@/lib/format'
import type { Granularity, UmkmDetail } from '@/lib/compute'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'
import Progress from './ui/Progress.vue'
import Table from './ui/Table.vue'
import TableBody from './ui/TableBody.vue'
import TableCell from './ui/TableCell.vue'
import TableHead from './ui/TableHead.vue'
import TableHeader from './ui/TableHeader.vue'
import TableRow from './ui/TableRow.vue'

const MITRA_COLORS: Record<string, string> = {
  Tokopedia: '#2563EB',
  Shopee: '#0D9488',
  'Mall Grand Indonesia': '#F59E0B',
  'Centong Daily': '#8B5CF6',
  'Koperasi Kumindag': '#06B6D4',
  Hippindo: '#EC4899',
}
const FALLBACK_COLORS = ['#2563EB', '#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B']

const props = defineProps<{
  /** null = UMKM tidak punya transaksi dalam periode/filter yang aktif. */
  detail: UmkmDetail | null
  /** Nama UMKM yang dipilih (untuk judul saat detail null). */
  selectedName: string
  /** Mengikuti toggle Bulanan/Mingguan grafik utama. */
  granularity: Granularity
  /** Label periode jendela, mis. "Okt – Nov 2026". */
  periodeLabel: string
  totalUmkm: number
  prevName: string | null
  nextName: string | null
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'prev'): void
  (e: 'next'): void
}>()

const closeBtn = ref<HTMLButtonElement | null>(null)

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft' && props.prevName) emit('prev')
  if (e.key === 'ArrowRight' && props.nextName) emit('next')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
  closeBtn.value?.focus()
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

const colorOf = (nama: string, idx: number): string =>
  MITRA_COLORS[nama] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]

const stats = computed(() => {
  const d = props.detail
  if (!d) return []
  return [
    { label: 'Total Omzet', value: formatRupiah(d.omzet), sub: `${formatPercent(d.share * 100)} dari total omzet` },
    { label: 'Total Transaksi', value: formatNumber(d.transaksi), sub: `${formatNumber(d.pesanan)} pesanan` },
    { label: 'Rata-rata / Transaksi', value: formatRupiah(Math.round(d.avgOmzetPerTransaksi)), sub: 'omzet per transaksi' },
    {
      label: 'Produk Aktif',
      // Master TEI tidak punya data produk/repeat — tampil "—", bukan 0.
      value: d.produkAktif === null || d.jumlahProduk === null ? '—' : `${formatNumber(d.produkAktif)} / ${formatNumber(d.jumlahProduk)}`,
      sub: d.repeatTransaksi === null ? 'data produk tidak tersedia' : `${formatNumber(d.repeatTransaksi)} repeat order`,
    },
  ]
})

/**
 * Pecah kolom Instagram/Website (kadang berisi 2 nilai dipisah "; ")
 * dan pisahkan yang berbentuk alamat web dari yang hanya nama/teks.
 * "Machili Food" atau "fitshine" bukan URL — tampil sebagai teks biasa.
 */
const LINK_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i
const links = computed(() =>
  (props.detail?.instagramWebsite ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ text: s, isLink: LINK_RE.test(s), href: `https://${s}` })),
)

const isWeekly = computed(() => props.granularity === 'mingguan')

/** Baris grafik + tabel: bulanan = per bulan dalam periode, mingguan = per minggu dalam periode. */
const chartRows = computed(() =>
  !props.detail
    ? []
    : isWeekly.value
      ? props.detail.weekly.map((w) => ({ key: w.key, label: w.label, omzet: w.omzet, transaksi: w.transaksi, pesanan: w.pesanan }))
      : props.detail.monthly.map((m) => ({ key: m.key, label: m.label, omzet: m.omzet, transaksi: m.transaksi, pesanan: m.pesanan })),
)

const chartTitle = computed(() =>
  isWeekly.value ? 'Penjualan per Minggu' : 'Penjualan per Bulan',
)
const chartSubtitle = computed(() =>
  isWeekly.value
    ? `Omzet (garis, Rp) dan transaksi (batang) per minggu, ${props.periodeLabel} — mengikuti filter periode yang aktif.`
    : `Omzet (garis, Rp) dan transaksi (batang) ${props.periodeLabel} — mengikuti filter periode yang aktif.`,
)

const palette = chartPalette

const chartOption = computed<EChartsOption>(() => {
  const labels = chartRows.value.map((r) => r.label)
  const omzet = chartRows.value.map((r) => r.omzet)
  const transaksi = chartRows.value.map((r) => r.transaksi)
  const c = palette
  return {
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    legend: {
      top: 0, right: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 6,
      textStyle: { color: c.legendText, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderWidth: 0,
      textStyle: { color: c.tooltipText, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: c.axisPointer } },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : []
        const rows = items.map((p) => {
          const it = p as { seriesName?: string; value?: number }
          const v = Number(it.value ?? 0)
          return `${it.seriesName}: <b>${it.seriesName === 'Omzet' ? formatRupiah(v) : formatNumber(v)}</b>`
        })
        const name = (items[0] as { name?: string } | undefined)?.name ?? ''
        // Bulanan: label "Okt" + tahun; mingguan: label sudah rentang tanggal.
        return `${name}${isWeekly.value ? '' : ' 2026'}<br/>${rows.join('<br/>')}`
      },
    },
    xAxis: {
      type: 'category', data: labels, boundaryGap: true,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: c.axisLabel, fontSize: 12, interval: 0, rotate: labels.length > 8 ? 35 : 0 },
    },
    yAxis: [
      {
        type: 'value', position: 'left',
        axisLabel: { color: c.axisLabel, fontSize: 11, formatter: (v: number) => v.toLocaleString('id-ID') },
        splitLine: { lineStyle: { color: c.splitLine } },
      },
      {
        type: 'value', position: 'right',
        axisLabel: { color: '#16A34A', fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Omzet', type: 'line', data: omzet, smooth: true,
        symbol: 'circle', symbolSize: 7, yAxisIndex: 0,
        lineStyle: { width: 2.5, color: '#2563EB' },
        itemStyle: { color: '#2563EB', borderColor: c.itemBorder, borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37, 99, 235, 0.18)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.01)' },
            ],
          },
        },
      },
      {
        name: 'Transaksi', type: 'bar', data: transaksi, yAxisIndex: 1,
        barWidth: 18, itemStyle: { color: '#16A34A', borderRadius: [4, 4, 0, 0], opacity: 0.85 },
      },
    ],
  }
})

const mitraOption = computed<EChartsOption>(() => {
  const c = palette
  const rows = props.detail?.mitraRows ?? []
  return {
  grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
  tooltip: {
    trigger: 'item',
    backgroundColor: c.tooltipBg,
    borderWidth: 0,
    textStyle: { color: c.tooltipText, fontSize: 12 },
    formatter: (p: unknown) => {
      const item = p as { name?: string; value?: number }
      return `${item.name ?? ''}<br/><b>${formatRupiah(Number(item.value ?? 0))}</b>`
    },
  },
  xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { lineStyle: { color: c.splitLine } } },
  yAxis: {
    type: 'category',
    data: rows.map((r) => r.nama),
    inverse: true,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: c.mutedText, fontSize: 12 },
  },
  series: [
    {
      type: 'bar',
      data: rows.map((r, i) => ({ value: r.omzet, itemStyle: { color: colorOf(r.nama, i), borderRadius: [0, 4, 4, 0] } })),
      barWidth: 22,
      label: {
        show: true, position: 'right', color: c.barLabel, fontSize: 11, fontWeight: 600,
        formatter: (p: unknown) => formatRupiah(Number((p as { value?: number }).value ?? 0)),
      },
    },
  ],
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6"
      role="presentation"
      @click.self="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="`Detail penjualan ${detail?.nama ?? selectedName}`"
        class="flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl bg-white dark:bg-slate-900 shadow-xl sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl"
      >
        <!-- Header -->
        <div class="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-6">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Store class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{{ detail?.nama ?? selectedName }}</h2>
              <Badge v-if="detail" variant="default">#{{ detail.rank }} dari {{ totalUmkm }}</Badge>
            </div>
            <div v-if="detail" class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{{ detail.kategori }}</Badge>
              <Badge variant="outline">{{ detail.wilayah }}</Badge>
              <Badge variant="success">{{ detail.mitra }}</Badge>
            </div>
            <p v-else class="mt-1 text-xs text-slate-500 dark:text-slate-400">Periode {{ periodeLabel }}</p>
          </div>
          <button
            ref="closeBtn"
            type="button"
            aria-label="Tutup detail UMKM"
            class="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="emit('close')"
          >
            <X class="size-5" />
          </button>
        </div>

        <!-- Body -->
        <div v-if="!detail" class="flex-1 overflow-y-auto px-4 py-10 sm:px-6">
          <div class="mx-auto max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-6 text-center">
            <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Tidak ada transaksi untuk {{ selectedName }} pada periode ini</p>
            <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              UMKM ini tidak punya transaksi pada periode {{ periodeLabel }} dengan filter yang
              dipilih. Coba pilih periode lain atau longgarkan filter Mitra, Kategori, dan Wilayah.
            </p>
          </div>
        </div>
        <div v-else class="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <!-- Statistik ringkas -->
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-3"
            >
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ stat.label }}</p>
              <p class="mt-1 truncate text-base font-bold text-slate-900 dark:text-slate-100" :title="stat.value">{{ stat.value }}</p>
              <p class="mt-0.5 truncate text-xs text-slate-400">{{ stat.sub }}</p>
            </div>
          </div>

          <!-- Skor capaian vs target individual per UMKM -->
          <div v-if="detail.skorRows.some((r) => r.skor !== null)" class="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <TrendingUp class="size-4 text-primary" />
              Skor Capaian (vs Target)
            </h3>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Skor = min(100, Realisasi / Target × 100). Target individual per UMKM dari tab Target di Google Sheet.
              Omzet, Transaksi, Repeat, Inquiry, dan Kanal dihitung pada periode evaluasi Okt–Nov yang tetap (target ditetapkan
              untuk periode itu); Katalog memakai total master. Angka lain di dialog tetap mengikuti periode yang dipilih.
            </p>
            <div class="mt-3 space-y-3">
              <div v-for="row in detail.skorRows" :key="row.id">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ row.title }}</p>
                  <div class="flex shrink-0 items-center gap-1.5">
                    <span class="text-xs text-slate-500 dark:text-slate-400">Realisasi {{ row.realisasi }} · Target {{ row.target }}</span>
                    <Badge v-if="row.skor !== null" variant="default">Skor {{ row.skor }}</Badge>
                    <span v-else class="text-xs text-slate-400">—</span>
                  </div>
                </div>
                <Progress v-if="row.skor !== null" :value="row.skor" class="mt-1.5" />
              </div>
            </div>
            <!-- Skor Kinerja terbobot (6 bobot mockup) untuk UMKM ini. -->
            <div class="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 pt-3">
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Skor Kinerja</p>
              <div v-if="detail.skorKinerja.skor !== null" class="flex items-center gap-1.5">
                <Badge variant="default">Skor {{ detail.skorKinerja.skor }}</Badge>
                <span v-if="detail.skorKinerja.status" class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ detail.skorKinerja.status }}</span>
              </div>
              <span v-else class="text-sm font-bold text-slate-400">Skor —</span>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-slate-400">
              Terbobot: Katalog 20% · Kanal Aktif 15% · Inquiry 15% · Transaksi 20% · Omzet 20% · Repeat Order 10%.
            </p>
          </div>

          <!-- Profil usaha (data master TEI 2026) -->
          <div class="mt-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-4">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Store class="size-4 text-primary" />
              Profil Usaha
            </h3>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex gap-3">
                <User class="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div class="min-w-0">
                  <dt class="text-xs text-slate-500 dark:text-slate-400">Pemilik</dt>
                  <dd class="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{{ detail.namaPemilik }}</dd>
                </div>
              </div>
              <div class="flex gap-3">
                <Store class="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div class="min-w-0">
                  <dt class="text-xs text-slate-500 dark:text-slate-400">Izin Usaha yang Dimiliki</dt>
                  <dd class="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{{ detail.izinUsaha }}</dd>
                </div>
              </div>
              <div class="flex gap-3">
                <Globe class="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div class="min-w-0">
                  <dt class="text-xs text-slate-500 dark:text-slate-400">Instagram / Website</dt>
                  <dd class="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                    <template v-if="links.length > 0">
                      <span v-for="(l, i) in links" :key="l.text">
                        <a
                          v-if="l.isLink"
                          :href="l.href"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {{ l.text }}
                          <ExternalLink class="size-3.5 shrink-0" />
                        </a>
                        <span v-else>{{ l.text }}</span>
                        <span v-if="i < links.length - 1" class="text-slate-400"> · </span>
                      </span>
                    </template>
                    <span v-else class="text-slate-400">—</span>
                  </dd>
                </div>
              </div>
              <div>
                <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">Penjelasan Produk</dt>
                <dd class="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">{{ detail.penjelasanProduk || '—' }}</dd>
              </div>
            </dl>
            <p class="mt-3 text-xs leading-relaxed text-slate-400">
              Peserta Trade Expo Indonesia (TEI) 2026, 14–18 Oktober 2026, ICE BSD.
              Nomor WhatsApp PIC sengaja tidak ditampilkan.
            </p>
          </div>

          <!-- Grafik utama -->
          <div class="mt-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <TrendingUp class="size-4 text-primary" />
              {{ chartTitle }} ({{ periodeLabel }})
            </h3>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ chartSubtitle }}
            </p>
            <VChart :option="chartOption" class="mt-2 h-64 w-full sm:h-72" autoresize />
          </div>

          <!-- Grafik per mitra -->
          <div class="mt-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Banknote class="size-4 text-primary" />
              Penjualan per Mitra Pemasaran
            </h3>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Omzet UMKM ini menurut mitra — hanya mitra yang ada datanya untuk UMKM ini.
            </p>
            <VChart :option="mitraOption" class="mt-2 h-32 w-full" autoresize />
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span
                v-for="(row, i) in detail.mitraRows"
                :key="row.nama"
                class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
              >
                <span class="size-2.5 rounded-full" :style="{ backgroundColor: colorOf(row.nama, i) }" />
                {{ row.nama }} · {{ formatPercent(row.share * 100) }}
              </span>
            </div>
          </div>

          <!-- Tabel rincian -->
          <div class="mt-5">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <ShoppingCart class="size-4 text-primary" />
              Rincian per {{ isWeekly ? 'Minggu' : 'Bulan' }}
            </h3>
            <Table class="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>{{ isWeekly ? 'Minggu' : 'Bulan' }}</TableHead>
                  <TableHead class="text-right">Omzet (Rp)</TableHead>
                  <TableHead class="text-right">Transaksi</TableHead>
                  <TableHead class="text-right">Pesanan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in chartRows" :key="row.key">
                  <TableCell class="font-medium text-slate-900 dark:text-slate-100">{{ row.label }}{{ isWeekly ? '' : ' 2026' }}</TableCell>
                  <TableCell class="text-right font-semibold text-slate-900 dark:text-slate-100">{{ formatRupiah(row.omzet) }}</TableCell>
                  <TableCell class="text-right text-slate-700 dark:text-slate-300">{{ formatNumber(row.transaksi) }}</TableCell>
                  <TableCell class="text-right text-slate-700 dark:text-slate-300">{{ formatNumber(row.pesanan) }}</TableCell>
                </TableRow>
                <TableRow class="bg-[#F8FAFC] dark:bg-slate-800 font-semibold">
                  <TableCell class="text-slate-900 dark:text-slate-100">Total</TableCell>
                  <TableCell class="text-right text-slate-900 dark:text-slate-100">{{ formatRupiah(detail.omzet) }}</TableCell>
                  <TableCell class="text-right text-slate-900 dark:text-slate-100">{{ formatNumber(detail.transaksi) }}</TableCell>
                  <TableCell class="text-right text-slate-900 dark:text-slate-100">{{ formatNumber(detail.pesanan) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p class="mt-2 text-xs text-slate-400">
              Angka tabel sama dengan grafik di atas — keduanya dihitung dari transaksi mentah yang sama.
            </p>
          </div>
        </div>

        <!-- Footer: prev / next -->
        <div class="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-6">
          <Button variant="outline" size="sm" :disabled="!prevName" @click="emit('prev')">
            <ChevronLeft class="size-4" />
            <span class="hidden max-w-32 truncate sm:inline">{{ prevName ?? 'Sebelumnya' }}</span>
            <span class="sm:hidden">Sebelumnya</span>
          </Button>
          <p class="hidden text-xs text-slate-400 md:block">Tutup dengan Esc atau klik di luar panel</p>
          <Button variant="outline" size="sm" :disabled="!nextName" @click="emit('next')">
            <span class="hidden max-w-32 truncate sm:inline">{{ nextName ?? 'Berikutnya' }}</span>
            <span class="sm:hidden">Berikutnya</span>
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
