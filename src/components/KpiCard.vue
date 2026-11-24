<script setup lang="ts">
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-vue-next'
import { formatDelta } from '@/lib/format'
import Badge from './ui/Badge.vue'
import Card from './ui/Card.vue'

defineProps<{
  title: string
  value: string
  /** Laju perubahan vs periode sebelumnya; null = tanpa delta. */
  delta: number | null
  icon: LucideIcon
  /** Kelas warna latar ikon, mis. "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400". */
  iconClass: string
}>()
</script>

<template>
  <Card class="p-4 sm:p-5">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{{ title }}</p>
        <p class="mt-1.5 truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg" :title="value">
          {{ value }}
        </p>
      </div>
      <span :class="`hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex ${iconClass}`">
        <component :is="icon" class="size-4" />
      </span>
    </div>
    <div v-if="delta !== null" class="mt-2">
      <Badge variant="success" :class="delta < 0 ? 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300' : ''">
        <TrendingUp v-if="delta >= 0" class="size-3" />
        <TrendingDown v-else class="size-3" />
        {{ formatDelta(delta) }}
      </Badge>
      <span class="ml-1.5 text-xs text-slate-400">vs periode lalu</span>
    </div>
  </Card>
</template>
