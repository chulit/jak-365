import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent])

export { VChart }

/** Palet warna grafik ECharts per tema — label/grid/tooltip tetap terbaca. */
export interface ChartPalette {
  axisLabel: string
  axisLine: string
  splitLine: string
  tooltipBg: string
  tooltipText: string
  axisPointer: string
  itemBorder: string
  legendText: string
  mutedText: string
  barLabel: string
}

/**
 * Palet grafik (mode terang saja). Fitur dark mode dihapus 2026-11-25,
 * jadi tidak ada lagi cabang gelap — palet ini dipakai apa adanya.
 */
export const chartPalette: ChartPalette = {
  axisLabel: '#64748B',
  axisLine: '#E2E8F0',
  splitLine: '#F1F5F9',
  tooltipBg: '#0F172A',
  tooltipText: '#F8FAFC',
  axisPointer: '#CBD5E1',
  itemBorder: '#FFFFFF',
  legendText: '#64748B',
  mutedText: '#334155',
  barLabel: '#0F172A',
}
