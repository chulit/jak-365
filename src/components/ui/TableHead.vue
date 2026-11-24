<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <th :class="cn('h-10 px-3 text-left align-middle text-xs font-semibold text-slate-500 dark:text-slate-400 [&:has([role=checkbox])]:pr-0', $props.class)">
    <slot />
  </th>
</template>
