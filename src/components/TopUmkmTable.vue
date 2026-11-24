<script setup lang="ts">
import { ChevronDown, ChevronRight, Leaf, MousePointerClick, Palette, Shirt, Sparkles, Store, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-vue-next'
import { formatNumber, formatRupiah } from '@/lib/format'
import type { TopUmkmRow } from '@/lib/compute'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'
import CardContent from './ui/CardContent.vue'
import Table from './ui/Table.vue'
import TableBody from './ui/TableBody.vue'
import TableCell from './ui/TableCell.vue'
import TableHead from './ui/TableHead.vue'
import TableHeader from './ui/TableHeader.vue'
import TableRow from './ui/TableRow.vue'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Makanan & Minuman': UtensilsCrossed,
  'Fesyen': Shirt,
  'Kriya & Kerajinan': Palette,
  'Kecantikan': Sparkles,
  'Pertanian & Olahan': Leaf,
}
const CATEGORY_BG: Record<string, string> = {
  'Makanan & Minuman': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'Fesyen': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'Kriya & Kerajinan': 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'Kecantikan': 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300',
  'Pertanian & Olahan': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
}

const props = defineProps<{ rows: TopUmkmRow[] }>()
const emit = defineEmits<{
  (e: 'select', nama: string): void
  (e: 'show-all'): void
}>()

function onRowKeydown(e: KeyboardEvent, nama: string): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select', nama)
  }
}
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader class="flex-row items-start justify-between space-y-0">
      <div>
        <CardTitle class="flex items-center gap-2">
          <Trophy class="size-4 text-primary" />
          Top 5 UMKM Berdasarkan Omzet
        </CardTitle>
        <p class="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <MousePointerClick class="size-3.5" />
          Klik baris untuk lihat grafik penjualan
        </p>
      </div>
      <Button
        v-if="props.rows.length > 5"
        variant="link"
        size="sm"
        class="h-auto shrink-0 p-0 text-xs"
        @click="emit('show-all')"
      >
        Lihat Semua
        <ChevronDown class="size-3" />
      </Button>
    </CardHeader>
    <CardContent class="flex-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-10">No.</TableHead>
            <TableHead>Nama UMKM</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead class="text-right">Total Transaksi</TableHead>
            <TableHead class="text-right">Total Omzet (Rp)</TableHead>
            <TableHead class="w-8"><span class="sr-only">Detail</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in props.rows.slice(0, 5)"
            :key="row.nama"
            role="button"
            tabindex="0"
            :aria-label="`Lihat grafik penjualan ${row.nama}`"
            class="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            @click="emit('select', row.nama)"
            @keydown="onRowKeydown($event, row.nama)"
          >
            <TableCell class="font-semibold text-slate-500 dark:text-slate-400">{{ row.rank }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2.5">
                <span
                  :class="`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${CATEGORY_BG[row.kategori] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`"
                >
                  {{ row.nama.charAt(0) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-900 dark:text-slate-100">{{ row.nama }}</p>
                  <p class="text-xs text-slate-400 sm:hidden">{{ row.wilayah }}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                <component :is="CATEGORY_ICONS[row.kategori] ?? Store" class="size-3.5 text-slate-400" />
                {{ row.kategori }}
              </span>
            </TableCell>
            <TableCell class="text-right font-medium text-slate-900 dark:text-slate-100">{{ formatNumber(row.transaksi) }}</TableCell>
            <TableCell class="whitespace-nowrap text-right font-semibold text-slate-900 dark:text-slate-100">
              {{ formatRupiah(row.omzet) }}
            </TableCell>
            <TableCell><ChevronRight class="size-4 text-slate-300 dark:text-slate-600" /></TableCell>
          </TableRow>
          <TableRow v-if="props.rows.length === 0">
            <TableCell colspan="6" class="py-6 text-center text-slate-400">
              Tidak ada data untuk filter ini.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
