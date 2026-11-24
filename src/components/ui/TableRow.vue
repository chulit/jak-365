<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <tr :class="cn('border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 data-[state=selected]:bg-slate-50 dark:bg-slate-800', $props.class)">
    <slot />
  </tr>
</template>
