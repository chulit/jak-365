<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ChevronRight, Search, X } from 'lucide-vue-next'
import { formatNumber, formatRupiah } from '@/lib/format'
import type { TopUmkmRow } from '@/lib/compute'
import Input from './ui/Input.vue'

type SortKey = 'omzet-desc' | 'omzet-asc' | 'nama'

const props = defineProps<{ rows: TopUmkmRow[] }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', nama: string): void
}>()

const query = ref('')
const sort = ref<SortKey>('omzet-desc')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const rows = q
    ? props.rows.filter(
        (r) =>
          r.nama.toLowerCase().includes(q) ||
          r.kategori.toLowerCase().includes(q) ||
          r.wilayah.toLowerCase().includes(q),
      )
    : [...props.rows]
  if (sort.value === 'omzet-asc') rows.sort((a, b) => a.omzet - b.omzet)
  else if (sort.value === 'nama') rows.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  else rows.sort((a, b) => b.omzet - a.omzet)
  return rows
})

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
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
        aria-label="Semua UMKM"
        class="flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl bg-white dark:bg-slate-900 shadow-xl sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl"
      >
        <div class="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-6">
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">Semua UMKM</h2>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ filtered.length }} dari {{ rows.length }} UMKM · klik baris untuk lihat grafik penjualan
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup daftar UMKM"
            class="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="emit('close')"
          >
            <X class="size-5" />
          </button>
        </div>

        <div class="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-3 sm:flex-row sm:px-6">
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              v-model="query"
              type="search"
              placeholder="Cari nama, kategori, atau wilayah…"
              class="pl-9"
              aria-label="Cari UMKM"
            />
          </div>
          <label class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Urutkan
            <select
              v-model="sort"
              aria-label="Urutkan UMKM"
              class="h-9 rounded-lg border border-input bg-white dark:bg-slate-900 px-2 text-sm text-slate-700 dark:text-slate-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="omzet-desc">Omzet tertinggi</option>
              <option value="omzet-asc">Omzet terendah</option>
              <option value="nama">Nama A–Z</option>
            </select>
          </label>
        </div>

        <div class="flex-1 overflow-y-auto px-2 py-2 sm:px-3">
          <button
            v-for="row in filtered"
            :key="row.nama"
            type="button"
            class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="`Lihat grafik penjualan ${row.nama}`"
            @click="emit('select', row.nama)"
          >
            <span class="w-8 shrink-0 text-center text-sm font-semibold text-slate-400">{{ row.rank }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ row.nama }}</span>
              <span class="block truncate text-xs text-slate-400">{{ row.kategori }} · {{ row.wilayah }}</span>
            </span>
            <span class="hidden shrink-0 text-right text-xs text-slate-500 dark:text-slate-400 sm:block">
              {{ formatNumber(row.transaksi) }} transaksi
            </span>
            <span class="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ formatRupiah(row.omzet) }}</span>
            <ChevronRight class="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </button>
          <p v-if="filtered.length === 0" class="py-8 text-center text-sm text-slate-400">
            Tidak ada UMKM yang cocok dengan “{{ query }}”.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
