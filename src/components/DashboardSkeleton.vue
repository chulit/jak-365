<script setup lang="ts">
// Skeleton layar penuh saat dashboard memuat data dari Google Sheet —
// menggantikan label teks "Memuat data terbaru…" (dihapus 2026-11-25).
// Strukturnya meniru layout dashboard (filter, KPI, grafik, indikator,
// tabel) supaya tidak ada lompatan layout saat data tiba.
</script>

<template>
  <div class="space-y-4" aria-hidden="true">
    <!-- Filter -->
    <div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:p-5">
      <div class="flex flex-wrap gap-3">
        <div class="h-10 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div class="h-10 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div class="h-10 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div class="h-10 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>

    <!-- KPI -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
      <div
        v-for="i in 6"
        :key="i"
        class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card"
      >
        <div class="size-8 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div class="mt-3 h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div class="mt-2 h-5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>

    <!-- Grafik + Donut -->
    <div class="grid gap-4 lg:grid-cols-5">
      <div class="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:p-5 lg:col-span-3">
        <div class="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div class="mt-2 h-3 w-56 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div class="mt-4 h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div class="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:p-5 lg:col-span-2">
        <div class="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div class="mx-auto mt-6 size-44 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        <div class="mx-auto mt-5 space-y-2">
          <div class="h-3 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div class="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div class="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>

    <!-- Indikator + Top UMKM -->
    <div class="grid gap-4 lg:grid-cols-5">
      <div class="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:p-5 lg:col-span-2">
        <div class="h-4 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div class="mt-2 h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div v-for="i in 4" :key="i" class="mt-5 flex items-start gap-2.5">
          <div class="size-8 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div class="min-w-0 flex-1 space-y-2">
            <div class="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div class="h-2.5 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div class="h-2 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div class="h-4 w-16 shrink-0 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div class="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card sm:p-5 lg:col-span-3">
        <div class="flex items-center justify-between">
          <div class="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-8 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
        <div v-for="i in 5" :key="i" class="mt-4 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <div class="h-3 w-6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-3 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-3 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="h-3 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
  </div>
</template>
