<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <h3 :class="cn('text-sm font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100', $props.class)">
    <slot />
  </h3>
</template>
