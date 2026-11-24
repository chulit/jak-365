<script setup lang="ts">
import { Banknote, ClipboardList, Megaphone, MessagesSquare, RefreshCw, Repeat2, ShoppingCart, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-vue-next'
import { formatDelta, formatPercent } from '@/lib/format'
import type { Indikator, SkorKinerja } from '@/lib/compute'
import Badge from './ui/Badge.vue'
import Card from './ui/Card.vue'
import CardHeader from './ui/CardHeader.vue'
import CardTitle from './ui/CardTitle.vue'
import CardContent from './ui/CardContent.vue'
import Progress from './ui/Progress.vue'

const ICONS: Record<string, LucideIcon> = {
  katalog: ClipboardList,
  kanal: Megaphone,
  inquiry: MessagesSquare,
  transaksi: ShoppingCart,
  omzet: Banknote,
  konversi: RefreshCw,
  repeat: Repeat2,
  pertumbuhan: TrendingUp,
}

defineProps<{ items: Indikator[]; targetsError?: string | null; skorPeriodeLabel?: string | null; skorKinerja?: SkorKinerja | null }>()
</script>

<template>
  <Card class="flex h-full flex-col">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <ClipboardList class="size-4 text-primary" />
        Capaian Indikator UMKM
      </CardTitle>
      <!-- Skor berjangkar ke jendela evaluasi yang tetap (bukan filter
           periode): target ditetapkan untuk periode itu. -->
      <p v-if="skorPeriodeLabel" class="mt-1 text-xs leading-relaxed text-slate-400">
        Skor vs target · {{ skorPeriodeLabel }} — target ditetapkan untuk periode itu, jadi skor tidak berubah saat filter periode diganti.
      </p>
    </CardHeader>
    <CardContent class="flex flex-1 flex-col justify-between gap-5">
      <div v-for="item in items" :key="item.id" class="space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-2.5">
            <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <component :is="ICONS[item.id] ?? ClipboardList" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">{{ item.title }}</p>
              <p v-if="item.sub" class="text-xs text-slate-400">{{ item.sub }}</p>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <template v-if="item.delta !== null">
              <!-- Pertumbuhan BOLEH negatif (data bulanan menurun) — badge
                   negatif tampil netral, bukan hijau. -->
              <Badge :variant="item.delta >= 0 ? 'success' : 'secondary'">
                <component :is="item.delta >= 0 ? TrendingUp : TrendingDown" class="size-3" />
                {{ formatDelta(item.delta) }}
              </Badge>
            </template>
            <template v-else>
              <span class="text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.display }}</span>
              <span v-if="item.percent !== null" class="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                ({{ formatPercent(item.percent) }})
              </span>
            </template>
            <!-- Skor capaian vs target individual (Skor = min(100,
                 Realisasi/Target × 100)); label target bisa dilacak.
                 Bila tab Target gagal dibaca (targetsError), skor
                 tampil "—" — bukan angka contoh. -->
            <div v-if="item.skor !== null" class="mt-1 flex items-center justify-end gap-1.5">
              <Badge variant="default">Skor {{ item.skor }}</Badge>
              <span v-if="item.targetLabel" class="text-xs text-slate-400">{{ item.targetLabel }}</span>
            </div>
            <div v-else-if="targetsError && item.id !== 'pertumbuhan'" class="mt-1 text-sm font-bold text-slate-400">
              Skor —
            </div>
          </div>
        </div>
        <Progress v-if="item.percent !== null" :value="item.percent" />
      </div>
      <!-- Skor Kinerja terbobot (6 bobot mockup): Katalog 20% + Kanal 15%
           + Inquiry 15% + Transaksi 20% + Omzet 20% + Repeat 10%.
           Hanya tampil bila keenam komponen punya skor; bila satu saja
           "—", total ikut "—" (bukan skor parsial). -->
      <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-3 py-2.5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Skor Kinerja</p>
          <div v-if="skorKinerja?.skor !== null && skorKinerja?.skor !== undefined" class="flex items-center gap-1.5">
            <Badge variant="default">Skor {{ skorKinerja.skor }}</Badge>
            <span v-if="skorKinerja.status" class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ skorKinerja.status }}</span>
          </div>
          <span v-else class="text-sm font-bold text-slate-400">Skor —</span>
        </div>
        <p class="mt-1 text-xs leading-relaxed text-slate-400">
          Terbobot: Katalog 20% · Kanal Aktif 15% · Inquiry 15% · Transaksi 20% · Omzet 20% · Repeat Order 10%.
          Status: ≥85 Sangat Baik · ≥70 Baik · ≥55 Cukup · di bawah itu Kurang.
        </p>
      </div>
      <!-- Catatan jujur bila tab Target gagal dibaca: skor "—", bukan
           angka contoh. -->
      <p v-if="targetsError" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <span class="font-semibold">Skor tidak tersedia — tab Target tidak terbaca.</span>
        {{ targetsError }}
      </p>
    </CardContent>
  </Card>
</template>
