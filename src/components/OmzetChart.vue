<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { TrendingUp } from 'lucide-vue-next'
import { VChart, chartPalette } from '@/lib/echarts'
import { formatRupiah } from '@/lib/format'
import type { Granularity, MonthlyPoint, WeeklyPoint } from '@/lib/compute'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'
import CardContent from './ui/CardContent.vue'

const props = defineProps<{
  points: MonthlyPoint[]
  weeklyPoints: WeeklyPoint[]
  total: number
  /** Label periode terpilih, mis. "Okt – Nov 2026". */
  periodeLabel: string
  granularity: Granularity
}>()
const emit = defineEmits<{ (e: 'update:granularity', value: Granularity): void }>()

const palette = chartPalette
const isWeekly = computed(() => props.granularity === 'mingguan')

/** Baris grafik: bulanan = nilai berjalan per bulan; mingguan = omzet per minggu. */
const chartRows = computed(() =>
  isWeekly.value
    ? props.weeklyPoints.map((w) => ({ label: w.label, omzet: w.omzet, transaksi: w.transaksi, pesanan: w.pesanan }))
    : props.points.map((p) => ({ label: p.label, omzet: p.value, transaksi: null as number | null, pesanan: null as number | null })),
)

const subtitle = computed(() =>
  isWeekly.value
    ? `Omzet per minggu, ${props.periodeLabel} (Rp)`
    : `Omzet per bulan, ${props.periodeLabel} (Rp)`,
)

const option = computed<EChartsOption>(() => {
  const rows = chartRows.value
  const labels = rows.map((r) => r.label)
  const values = rows.map((r) => r.omzet)
  const c = palette
  // Bulanan: tandai titik terakhir (= Total Omzet). Mingguan: tandai minggu
  // dengan omzet terbesar, karena tidak ada satu titik yang = total.
  const markIdx = isWeekly.value
    ? values.reduce((best, v, i) => (v > values[best] ? i : best), 0)
    : values.length - 1
  return {
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.tooltipBg,
      borderWidth: 0,
      textStyle: { color: c.tooltipText, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: c.axisPointer } },
      formatter: (params: unknown) => {
        const p = Array.isArray(params) ? params[0] : (params as { dataIndex?: number })
        const row = rows[p?.dataIndex ?? 0]
        if (!row) return ''
        const head = `${row.label} 2026<br/><b>${formatRupiah(row.omzet)}</b>`
        return row.transaksi === null
          ? head
          : `${head}<br/>${row.transaksi} transaksi · ${row.pesanan} pesanan`
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: c.axisLine } },
      axisTick: { show: false },
      axisLabel: { color: c.axisLabel, fontSize: 11, interval: 0, rotate: labels.length > 8 ? 35 : 0 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: c.axisLabel,
        fontSize: 11,
        formatter: (v: number) => v.toLocaleString('id-ID'),
      },
      splitLine: { lineStyle: { color: c.splitLine } },
    },
    series: [
      {
        name: isWeekly.value ? 'Omzet per Minggu' : 'Omzet per Bulan',
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        showSymbol: true,
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
        markPoint: {
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: '#2563EB', borderColor: c.itemBorder, borderWidth: 2 },
          label: {
            show: true,
            position: 'top',
            distance: 12,
            formatter: formatRupiah(values[markIdx] ?? 0),
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            borderRadius: 6,
            padding: [5, 9],
            fontSize: 12,
            fontWeight: 600,
          },
          data: [{ name: isWeekly.value ? 'Minggu Tertinggi' : 'Total Omzet', coord: [labels[markIdx] ?? '', values[markIdx] ?? 0] }],
        },
      },
    ],
  }
})
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader class="flex-row items-center justify-between space-y-0">
      <div>
        <CardTitle class="flex items-center gap-2">
          <TrendingUp class="size-4 text-primary" />
          Tren Omzet
        </CardTitle>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ subtitle }}
        </p>
      </div>
      <span class="text-sm font-bold text-slate-900 dark:text-slate-100">{{ formatRupiah(props.total) }}</span>
    </CardHeader>
    <CardContent class="flex-1">
      <div class="mb-3 flex justify-end">
        <div
          role="group"
          aria-label="Granularitas grafik"
          class="inline-flex rounded-full bg-slate-100 p-1 dark:bg-slate-800"
        >
          <button
            type="button"
            :aria-pressed="props.granularity === 'bulanan'"
            class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            :class="props.granularity === 'bulanan'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:granularity', 'bulanan')"
          >
            Bulanan
          </button>
          <button
            type="button"
            :aria-pressed="props.granularity === 'mingguan'"
            class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            :class="props.granularity === 'mingguan'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
            @click="emit('update:granularity', 'mingguan')"
          >
            Mingguan
          </button>
        </div>
      </div>
      <VChart v-if="chartRows.length > 0" :option="option" class="h-64 w-full sm:h-72" autoresize />
      <div
        v-else
        class="flex h-64 w-full items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 sm:h-72"
      >
        Tidak ada data omzet pada periode ini. Coba pilih periode lain.
      </div>
    </CardContent>
  </Card>
</template>
