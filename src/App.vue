<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Banknote,
  CheckCircle2,
  MousePointerClick,
  Package,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-vue-next'
import { sampleData } from '@/data/sample'
import { computeDashboard, computeUmkmDetail, filterOptions, type Filters, type Granularity } from '@/lib/compute'
import { loadFromGoogleSheet, sheetIdFromEnv } from '@/lib/sheets'
import type { DashboardData } from '@/lib/types'
import AppHeader from '@/components/AppHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import KpiCard from '@/components/KpiCard.vue'
import MitraDonut from '@/components/MitraDonut.vue'
import OmzetChart from '@/components/OmzetChart.vue'
import IndikatorUMKM from '@/components/IndikatorUMKM.vue'
import TopUmkmTable from '@/components/TopUmkmTable.vue'
import UmkmDetailDialog from '@/components/UmkmDetailDialog.vue'
import AllUmkmDialog from '@/components/AllUmkmDialog.vue'

type SheetStatus = 'contoh' | 'memuat' | 'terhubung' | 'error'

const STORAGE_KEY = 'monev-sheet-id'

const KPI_META: Record<string, { icon: LucideIcon; iconClass: string }> = {
  umkm: { icon: Users, iconClass: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  produk: { icon: Package, iconClass: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  klik: { icon: MousePointerClick, iconClass: 'bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400' },
  pesanan: { icon: ShoppingCart, iconClass: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  transaksi: { icon: CheckCircle2, iconClass: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  omzet: { icon: Banknote, iconClass: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
}

// --- State -----------------------------------------------------------------
const data = ref<DashboardData>(sampleData)
const filters = reactive<Filters>({ startMonth: '2026-10', endMonth: '2026-11', mitra: 'semua', kategori: 'semua', wilayah: 'semua' })
const granularity = ref<Granularity>('bulanan')
const sheetId = ref<string>(localStorage.getItem(STORAGE_KEY) ?? sheetIdFromEnv())
const sheetStatus = ref<SheetStatus>('contoh')
const sheetError = ref<string | null>(null)
const connectedId = ref<string | null>(null)
const loadedAt = ref<Date | null>(null)

const dashboard = computed(() => computeDashboard(data.value, filters))
const options = computed(() => filterOptions(data.value))

// --- Detail per UMKM -------------------------------------------------------
const selectedUmkm = ref<string | null>(null)
const showAllUmkm = ref(false)
const selectedDetail = computed(() =>
  selectedUmkm.value ? computeUmkmDetail(data.value, filters, selectedUmkm.value) : null,
)
const orderedUmkmNames = computed(() => dashboard.value.topUmkm.map((r) => r.nama))
const selectedIndex = computed(() =>
  selectedUmkm.value ? orderedUmkmNames.value.indexOf(selectedUmkm.value) : -1,
)
const prevUmkmName = computed(() =>
  selectedIndex.value > 0 ? orderedUmkmNames.value[selectedIndex.value - 1] : null,
)
const nextUmkmName = computed(() =>
  selectedIndex.value >= 0 && selectedIndex.value < orderedUmkmNames.value.length - 1
    ? orderedUmkmNames.value[selectedIndex.value + 1]
    : null,
)

function selectUmkm(nama: string): void {
  selectedUmkm.value = nama
  showAllUmkm.value = false
}
function closeUmkmDetail(): void {
  selectedUmkm.value = null
}
function stepUmkm(delta: -1 | 1): void {
  const next = selectedIndex.value + delta
  if (next >= 0 && next < orderedUmkmNames.value.length) {
    selectedUmkm.value = orderedUmkmNames.value[next]
  }
}

// --- Google Sheet ----------------------------------------------------------
async function loadSheet(): Promise<void> {
  const id = sheetId.value.trim()
  if (!id) return
  sheetStatus.value = 'memuat'
  sheetError.value = null
  try {
    const fresh = await loadFromGoogleSheet(id)
    data.value = fresh
    connectedId.value = id
    localStorage.setItem(STORAGE_KEY, id)
    sheetStatus.value = 'terhubung'
    loadedAt.value = new Date()
  } catch (err) {
    sheetStatus.value = 'error'
    sheetError.value = err instanceof Error ? err.message : 'Gagal memuat Google Sheet.'
  }
}

onMounted(() => {
  if (sheetId.value.trim()) void loadSheet()
})
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
    <div class="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:py-6">
      <AppHeader />

      <div class="mt-5 space-y-4">
        <!-- Status pemuatan Sheet: hanya tampil saat memuat / gagal.
             Kartu "Sumber Data" lama dihapus — tidak ada di mockup, dan
             ID Sheet kini dibekukan lewat VITE_SHEET_ID saat build. -->
        <div
          v-if="sheetStatus === 'error'"
          class="flex flex-col gap-2 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm leading-relaxed text-red-700 dark:text-red-300">
            <span class="font-semibold">Gagal memuat Google Sheet.</span>
            {{ sheetError ?? 'Periksa koneksi lalu coba lagi.' }}
            Angka di bawah ini adalah data contoh, bukan data asli.
          </p>
          <button
            type="button"
            class="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            @click="loadSheet"
          >
            Coba lagi
          </button>
        </div>
        <div
          v-else-if="sheetStatus === 'memuat'"
          class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400 shadow-card"
        >
          Memuat data terbaru dari Google Sheet…
        </div>

        <!-- Filter -->
        <section class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:p-5">
          <FilterBar
            v-model="filters"
            :mitra-options="options.mitra"
            :kategori-options="options.kategori"
            :wilayah-options="options.wilayah"
          />
        </section>

        <!-- KPI -->
        <section class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            v-for="kpi in dashboard.kpis"
            :key="kpi.id"
            :title="kpi.title"
            :value="kpi.value"
            :delta="kpi.delta"
            :icon="KPI_META[kpi.id]?.icon ?? Package"
            :icon-class="KPI_META[kpi.id]?.iconClass ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'"
          />
        </section>

        <!-- Grafik -->
        <section class="grid gap-4 lg:grid-cols-5">
          <div class="min-w-0 lg:col-span-3">
            <OmzetChart
              :points="dashboard.trendPoints"
              :weekly-points="dashboard.weeklyPoints"
              :total="dashboard.totalOmzet"
              :periode-label="dashboard.trendLabel"
              :granularity="granularity"
              @update:granularity="granularity = $event"
            />
          </div>
          <div class="min-w-0 lg:col-span-2">
            <MitraDonut :rows="dashboard.mitra" :total="dashboard.totalOmzet" />
          </div>
        </section>

        <!-- Indikator + Top UMKM -->
        <section class="grid gap-4 lg:grid-cols-5">
          <div class="min-w-0 lg:col-span-2">
            <IndikatorUMKM :items="dashboard.indikator" :targets-error="dashboard.targetsError" :skor-periode-label="dashboard.skorPeriodeLabel" :skor-kinerja="dashboard.skorKinerja" />
          </div>
          <div class="min-w-0 lg:col-span-3">
            <TopUmkmTable :rows="dashboard.topUmkm" @select="selectUmkm" @show-all="showAllUmkm = true" />
          </div>
        </section>

        <!-- Dialog detail UMKM + daftar lengkap -->
        <!-- Dialog tetap tampil saat detail null: panel menampilkan pesan
             sopan bahwa UMKM ini tidak punya transaksi dalam periode/filter aktif. -->
        <UmkmDetailDialog
          v-if="selectedUmkm"
          :detail="selectedDetail"
          :selected-name="selectedUmkm"
          :granularity="granularity"
          :periode-label="dashboard.trendLabel"
          :total-umkm="dashboard.topUmkm.length"
          :prev-name="prevUmkmName"
          :next-name="nextUmkmName"
          @close="closeUmkmDetail"
          @prev="stepUmkm(-1)"
          @next="stepUmkm(1)"
        />
        <AllUmkmDialog
          v-if="showAllUmkm"
          :rows="dashboard.topUmkm"
          @close="showAllUmkm = false"
          @select="selectUmkm"
        />

        <footer class="flex flex-col gap-1 pb-2 pt-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Sumber data:
            <span class="break-all font-medium text-slate-500 dark:text-slate-400">
              {{ connectedId ? `Google Sheet (${connectedId})` : 'Data contoh — src/data/sample.ts' }}
            </span>
            <span v-if="loadedAt"> · dimuat {{ loadedAt.toLocaleString('id-ID') }} WIB</span>
          </p>
          <p>Monitoring &amp; Evaluasi UMKM</p>
        </footer>
      </div>
    </div>
  </div>
</template>
