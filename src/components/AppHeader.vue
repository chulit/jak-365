<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { isDark, toggleTheme } from '@/lib/theme'
import Button from './ui/Button.vue'
</script>

<template>
  <header class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
        Monitoring &amp; Evaluasi
      </h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Memantau perkembangan pemasaran, kinerja UMKM, dan efektivitas mitra pemasaran.
      </p>
    </div>

    <Button
      variant="outline"
      size="icon"
      type="button"
      class="shrink-0 rounded-full"
      :aria-label="isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
      :title="isDark ? 'Mode terang' : 'Mode gelap'"
      @click="toggleTheme"
    >
      <Sun v-if="isDark" class="size-4" />
      <Moon v-else class="size-4" />
    </Button>
  </header>
</template>
