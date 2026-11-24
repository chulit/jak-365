import { ref } from 'vue'

export const THEME_STORAGE_KEY = 'monev-theme'

export type Theme = 'light' | 'dark'

/** Tema aktif, dibagikan ke seluruh komponen (termasuk opsi grafik ECharts). */
export const isDark = ref(false)

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    return null
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** Tema yang harus dipakai: pilihan tersimpan, kalau belum ada ikuti sistem. */
export function resolveTheme(): Theme {
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}

/**
 * Terapkan tema: class `dark` di <html>, color-scheme, dan simpan pilihan.
 * `persist: false` dipakai saat inisialisasi agar preferensi sistem tidak
 * langsung terkunci sebagai pilihan tersimpan.
 */
export function applyTheme(theme: Theme, persist = true): void {
  isDark.value = theme === 'dark'
  document.documentElement.classList.toggle('dark', isDark.value)
  document.documentElement.style.colorScheme = theme
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Penyimpanan tidak tersedia (mis. mode privat) — tema tetap diterapkan.
    }
  }
}

export function toggleTheme(): void {
  applyTheme(isDark.value ? 'light' : 'dark')
}

/** Dipanggil sekali sebelum aplikasi dipasang (lihat main.ts + index.html). */
export function initTheme(): void {
  applyTheme(resolveTheme(), false)
}

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

export function chartPalette(dark: boolean): ChartPalette {
  if (dark) {
    return {
      axisLabel: '#94A3B8',
      axisLine: '#334155',
      splitLine: '#1E293B',
      tooltipBg: '#1E293B',
      tooltipText: '#F1F5F9',
      axisPointer: '#64748B',
      itemBorder: '#0F172A',
      legendText: '#94A3B8',
      mutedText: '#CBD5E1',
      barLabel: '#F1F5F9',
    }
  }
  return {
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
}
