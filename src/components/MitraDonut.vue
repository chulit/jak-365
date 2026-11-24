<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { PieChart } from 'lucide-vue-next'
import { VChart, chartPalette } from '@/lib/echarts'
import { formatPercent, formatRupiah } from '@/lib/format'
import type { MitraRow } from '@/lib/compute'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'
import CardContent from './ui/CardContent.vue'

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
  rows: MitraRow[]
  total: number
}>()

const colorOf = (nama: string, idx: number): string =>
  MITRA_COLORS[nama] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]

const palette = chartPalette

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: palette.tooltipBg,
    borderWidth: 0,
    textStyle: { color: palette.tooltipText, fontSize: 12 },
    formatter: (p: unknown) => {
      const item = p as { name?: string; value?: number; percent?: number }
      return `${item.name ?? ''}<br/><b>${formatRupiah(Number(item.value ?? 0))}</b> (${formatPercent(item.percent ?? 0, 1)})`
    },
  },
  series: [
    {
      type: 'pie',
      radius: ['64%', '88%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderColor: palette.itemBorder, borderWidth: 2 },
      emphasis: { scale: true, scaleSize: 4 },
      data: props.rows.map((r, i) => ({
        name: r.nama, value: r.omzet, itemStyle: { color: colorOf(r.nama, i) },
      })),
    },
  ],
}))
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <PieChart class="size-4 text-primary" />
        Kinerja per Mitra Pemasaran
      </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      <div class="relative mx-auto w-44 shrink-0 sm:w-48">
        <VChart :option="option" class="h-44 w-full sm:h-48" autoresize />
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span class="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">{{ formatRupiah(props.total) }}</span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">Total Omzet</span>
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <div
          v-for="(row, i) in props.rows"
          :key="row.nama"
          class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 py-2 text-sm last:border-0"
        >
          <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: colorOf(row.nama, i) }" />
          <span class="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-300">{{ row.nama }}</span>
          <span class="shrink-0 font-semibold text-slate-900 dark:text-slate-100">{{ formatRupiah(row.omzet) }}</span>
          <span class="w-12 shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">{{ formatPercent(row.share * 100) }}</span>
        </div>
        <p v-if="props.rows.length === 0" class="py-4 text-center text-sm text-slate-400">
          Tidak ada data untuk filter ini.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
