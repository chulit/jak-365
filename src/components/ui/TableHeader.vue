<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <thead :class="cn('[&_tr]:border-b [&_tr]:border-slate-100 dark:border-slate-800', $props.class)">
    <slot />
  </thead>
</template>
